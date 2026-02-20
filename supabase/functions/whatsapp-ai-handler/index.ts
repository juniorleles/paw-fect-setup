import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface PetShopConfig {
  user_id: string;
  shop_name: string;
  assistant_name: string;
  voice_tone: string;
  services: any[];
  business_hours: any[];
  phone: string;
  address: string;
  neighborhood: string;
  city: string;
  state: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { instanceName, message, senderPhone } = await req.json();

    if (!instanceName || !message || !senderPhone) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Load pet shop config by instance name
    const { data: config, error: configErr } = await serviceClient
      .from("pet_shop_configs")
      .select("*")
      .eq("evolution_instance_name", instanceName)
      .maybeSingle();

    if (configErr || !config) {
      console.error("Config not found for instance:", instanceName);
      return new Response(JSON.stringify({ error: "Config not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const shopConfig = config as PetShopConfig;

    // Load today's and future appointments for availability checking
    const today = new Date().toISOString().split("T")[0];
    const { data: appointments } = await serviceClient
      .from("appointments")
      .select("date, time, service, status, pet_name, owner_name, owner_phone")
      .eq("user_id", shopConfig.user_id)
      .gte("date", today)
      .neq("status", "cancelled");

    // Build context for the AI
    const servicesText = (shopConfig.services as any[])
      .map((s: any) => `- ${s.name}: R$${s.price} (${s.duration} min)`)
      .join("\n");

    const hoursText = (shopConfig.business_hours as any[])
      .map((h: any) => `- ${h.day}: ${h.isOpen ? `${h.openTime} - ${h.closeTime}` : "Fechado"}`)
      .join("\n");

    const existingAppointments = (appointments || [])
      .map((a: any) => `${a.date} ${a.time} - ${a.service} (${a.pet_name}/${a.owner_name}, tel: ${a.owner_phone}, status: ${a.status})`)
      .join("\n");

    const cleanPhone = senderPhone.replace("@s.whatsapp.net", "").replace(/\D/g, "");

    // Customer's existing appointments
    const customerAppointments = (appointments || [])
      .filter((a: any) => {
        const aPhone = (a.owner_phone || "").replace(/\D/g, "");
        return aPhone === cleanPhone || cleanPhone.endsWith(aPhone) || aPhone.endsWith(cleanPhone);
      });

    const customerApptsText = customerAppointments.length > 0
      ? customerAppointments.map((a: any) => `- ${a.date} às ${a.time}: ${a.service} (pet: ${a.pet_name}, status: ${a.status})`).join("\n")
      : "Nenhum agendamento encontrado.";

    const toneInstructions: Record<string, string> = {
      formal: "Use linguagem formal e educada. Trate o cliente por 'senhor(a)'.",
      friendly: "Use linguagem amigável e acolhedora. Trate o cliente de forma pessoal e calorosa.",
      fun: "Use linguagem divertida e descontraída, com emojis 🐾🐶. Seja animado e alegre!",
    };

    const nowDate = new Date();
    const brDate = nowDate.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
    const brTime = nowDate.toLocaleTimeString("pt-BR", { timeZone: "America/Sao_Paulo", hour: "2-digit", minute: "2-digit" });
    const brWeekday = nowDate.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo", weekday: "long" });

    const systemPrompt = `Você é ${shopConfig.assistant_name || "a secretária digital"} do pet shop "${shopConfig.shop_name}".
${toneInstructions[shopConfig.voice_tone] || toneInstructions.friendly}

INFORMAÇÕES DO PET SHOP:
- Endereço: ${shopConfig.address}, ${shopConfig.neighborhood}, ${shopConfig.city}/${shopConfig.state}
- Telefone: ${shopConfig.phone}

SERVIÇOS OFERECIDOS:
${servicesText || "Nenhum serviço cadastrado."}

HORÁRIOS DE FUNCIONAMENTO:
${hoursText}

DATA/HORA ATUAL: ${brWeekday}, ${brDate} às ${brTime}

AGENDAMENTOS JÁ EXISTENTES (para verificar disponibilidade):
${existingAppointments || "Nenhum agendamento."}

AGENDAMENTOS DESTE CLIENTE (telefone: ${cleanPhone}):
${customerApptsText}

REGRAS IMPORTANTES:
1. Quando o cliente quiser AGENDAR, colete: nome do pet, nome do dono, serviço desejado, data e horário preferido.
2. Verifique se o horário está dentro do horário de funcionamento do dia solicitado.
3. Verifique se não há conflito com agendamentos existentes (considere a duração do serviço).
4. Para CANCELAR ou REAGENDAR, identifique o agendamento do cliente e confirme antes de proceder.
5. Quando tiver TODOS os dados necessários para criar/cancelar/reagendar, responda incluindo um bloco de ação JSON no final da mensagem, dentro de tags <action>...</action>.

FORMATO DE AÇÕES (inclua APENAS quando tiver todos os dados confirmados):

Para agendar:
<action>{"type":"create","pet_name":"Rex","owner_name":"João","owner_phone":"${cleanPhone}","service":"Banho","date":"2026-02-21","time":"10:00"}</action>

Para cancelar (use a data/hora do agendamento existente):
<action>{"type":"cancel","date":"2026-02-21","time":"10:00"}</action>

Para reagendar:
<action>{"type":"reschedule","old_date":"2026-02-21","old_time":"10:00","new_date":"2026-02-22","new_time":"14:00"}</action>

6. NUNCA invente horários ou serviços que não existem na lista.
7. Responda APENAS em português brasileiro.
8. Mantenha respostas curtas e objetivas (máx 3-4 frases, exceto quando listando informações).
9. Se o cliente enviar algo fora do contexto do pet shop, redirecione educadamente para os serviços.`;

    // Call Lovable AI
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY not configured");
      return new Response(JSON.stringify({ error: "AI not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: message },
        ],
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error("AI error:", aiResponse.status, errText);
      return new Response(JSON.stringify({ error: "AI error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiResponse.json();
    let reply = aiData.choices?.[0]?.message?.content || "Desculpe, não consegui processar sua mensagem.";

    // Extract and process actions
    const actionMatch = reply.match(/<action>(.*?)<\/action>/s);
    if (actionMatch) {
      try {
        const action = JSON.parse(actionMatch[1]);
        console.log("Processing action:", JSON.stringify(action));

        if (action.type === "create") {
          const { error: insertErr } = await serviceClient
            .from("appointments")
            .insert({
              user_id: shopConfig.user_id,
              pet_name: action.pet_name,
              owner_name: action.owner_name,
              owner_phone: action.owner_phone || cleanPhone,
              service: action.service,
              date: action.date,
              time: action.time,
              status: "confirmed",
            });
          if (insertErr) {
            console.error("Insert appointment error:", insertErr);
            reply = reply.replace(/<action>.*?<\/action>/s, "").trim();
            reply += "\n\n⚠️ Houve um erro ao registrar o agendamento. Por favor, tente novamente.";
          } else {
            reply = reply.replace(/<action>.*?<\/action>/s, "").trim();
          }
        } else if (action.type === "cancel") {
          const { error: cancelErr } = await serviceClient
            .from("appointments")
            .update({ status: "cancelled" })
            .eq("user_id", shopConfig.user_id)
            .eq("date", action.date)
            .eq("time", action.time)
            .eq("owner_phone", cleanPhone);
          if (cancelErr) console.error("Cancel error:", cancelErr);
          reply = reply.replace(/<action>.*?<\/action>/s, "").trim();
        } else if (action.type === "reschedule") {
          const { error: reschedErr } = await serviceClient
            .from("appointments")
            .update({ date: action.new_date, time: action.new_time })
            .eq("user_id", shopConfig.user_id)
            .eq("date", action.old_date)
            .eq("time", action.old_time)
            .eq("owner_phone", cleanPhone);
          if (reschedErr) console.error("Reschedule error:", reschedErr);
          reply = reply.replace(/<action>.*?<\/action>/s, "").trim();
        }
      } catch (parseErr) {
        console.error("Action parse error:", parseErr);
        reply = reply.replace(/<action>.*?<\/action>/s, "").trim();
      }
    }

    // Send reply back via Evolution API
    const evolutionUrl = Deno.env.get("EVOLUTION_API_URL");
    const evolutionKey = Deno.env.get("EVOLUTION_API_KEY");

    if (evolutionUrl && evolutionKey) {
      const baseUrl = evolutionUrl.replace(/\/+$/, "");
      const sendRes = await fetch(`${baseUrl}/message/sendText/${instanceName}`, {
        method: "POST",
        headers: {
          apikey: evolutionKey.trim(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          number: senderPhone.replace("@s.whatsapp.net", ""),
          text: reply,
        }),
      });
      console.log("Send message response:", sendRes.status);
    }

    return new Response(JSON.stringify({ success: true, reply }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("AI handler error:", err);
    return new Response(JSON.stringify({ error: "Internal error", details: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
