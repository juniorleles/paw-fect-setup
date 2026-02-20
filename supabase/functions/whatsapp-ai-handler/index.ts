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

function getServiceClient() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );
}

function cleanPhoneNumber(phone: string): string {
  return phone.replace("@s.whatsapp.net", "").replace(/\D/g, "");
}

function phoneMatches(a: string, b: string): boolean {
  const cleanA = a.replace(/\D/g, "");
  const cleanB = b.replace(/\D/g, "");
  return cleanA === cleanB || cleanA.endsWith(cleanB) || cleanB.endsWith(cleanA);
}

async function sendWhatsAppMessage(instanceName: string, phone: string, text: string) {
  const evolutionUrl = Deno.env.get("EVOLUTION_API_URL");
  const evolutionKey = Deno.env.get("EVOLUTION_API_KEY");
  if (!evolutionUrl || !evolutionKey) return;

  const baseUrl = evolutionUrl.replace(/\/+$/, "");
  const cleanPhone = phone.replace("@s.whatsapp.net", "");
  const res = await fetch(`${baseUrl}/message/sendText/${instanceName}`, {
    method: "POST",
    headers: {
      apikey: evolutionKey.trim(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ number: cleanPhone, text }),
  });
  console.log("Send message response:", res.status);
}

// --- Conversation Memory ---

async function getConversationHistory(
  serviceClient: any,
  userId: string,
  phone: string,
  maxMessages = 20
): Promise<{ role: string; content: string }[]> {
  // Clean up messages older than 24h first
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  await serviceClient
    .from("conversation_messages")
    .delete()
    .eq("user_id", userId)
    .eq("phone", phone)
    .lt("created_at", cutoff);

  // Fetch recent messages
  const { data } = await serviceClient
    .from("conversation_messages")
    .select("role, content")
    .eq("user_id", userId)
    .eq("phone", phone)
    .order("created_at", { ascending: true })
    .limit(maxMessages);

  return (data || []).map((m: any) => ({ role: m.role, content: m.content }));
}

async function saveMessage(
  serviceClient: any,
  userId: string,
  phone: string,
  role: "user" | "assistant",
  content: string
) {
  await serviceClient
    .from("conversation_messages")
    .insert({ user_id: userId, phone, role, content });
}

// --- Confirmation Quick Responses ---

async function handleConfirmationResponse(
  serviceClient: any,
  shopConfig: PetShopConfig,
  cleanPhone: string,
  message: string
): Promise<string | null> {
  const normalized = message.trim().toUpperCase();

  const isConfirm = normalized === "CONFIRMO" || normalized === "CONFIRMAR";
  const isReschedule = normalized === "REMARCAR" || normalized === "PRECISO REMARCAR" || normalized === "REAGENDAR";
  const isCancel = normalized === "CANCELAR" || normalized === "CANCELA";

  if (!isConfirm && !isReschedule && !isCancel) return null;

  const today = new Date().toISOString().split("T")[0];
  const { data: appointments } = await serviceClient
    .from("appointments")
    .select("*")
    .eq("user_id", shopConfig.user_id)
    .gte("date", today)
    .in("status", ["pending", "confirmed"])
    .order("date", { ascending: true })
    .order("time", { ascending: true });

  const customerAppts = (appointments || []).filter((a: any) =>
    phoneMatches(a.owner_phone || "", cleanPhone)
  );

  if (customerAppts.length === 0) {
    return "Não encontrei nenhum agendamento próximo no seu nome. Deseja fazer um novo agendamento?";
  }

  const nextAppt = customerAppts[0];

  if (isConfirm) {
    await serviceClient
      .from("appointments")
      .update({ status: "confirmed" })
      .eq("id", nextAppt.id);
    return `✅ Presença confirmada! ${nextAppt.pet_name} está esperado(a) para ${nextAppt.service} no dia ${nextAppt.date} às ${nextAppt.time}. Até lá! 🐾`;
  }

  if (isCancel) {
    await serviceClient
      .from("appointments")
      .update({ status: "cancelled" })
      .eq("id", nextAppt.id);
    return `❌ Agendamento de ${nextAppt.service} para ${nextAppt.pet_name} no dia ${nextAppt.date} às ${nextAppt.time} foi cancelado. Se precisar reagendar, é só me chamar!`;
  }

  if (isReschedule) {
    return `Para remarcar o ${nextAppt.service} do(a) ${nextAppt.pet_name} (${nextAppt.date} às ${nextAppt.time}), me diga a nova data e horário desejados. 📅`;
  }

  return null;
}

// --- Build System Prompt ---

function buildSystemPrompt(shopConfig: PetShopConfig, cleanPhone: string, existingAppointments: string, customerApptsText: string): string {
  const servicesText = (shopConfig.services as any[])
    .map((s: any) => `- ${s.name}: R$${s.price} (${s.duration} min)`)
    .join("\n");

  const hoursText = (shopConfig.business_hours as any[])
    .map((h: any) => `- ${h.day}: ${h.isOpen ? `${h.openTime} - ${h.closeTime}` : "Fechado"}`)
    .join("\n");

  const toneInstructions: Record<string, string> = {
    formal: "Use linguagem formal e educada. Trate o cliente por 'senhor(a)'. Seja objetiva e profissional.",
    friendly: "Use linguagem amigável e acolhedora. Trate o cliente pelo nome quando souber. Seja pessoal e calorosa.",
    fun: "Use linguagem divertida e descontraída, com emojis moderados 🐾🐶. Seja animada e alegre, com humor leve!",
  };

  const nowDate = new Date();
  const brDate = nowDate.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
  const brTime = nowDate.toLocaleTimeString("pt-BR", { timeZone: "America/Sao_Paulo", hour: "2-digit", minute: "2-digit" });
  const brWeekday = nowDate.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo", weekday: "long" });

  return `Você é ${shopConfig.assistant_name || "a secretária digital"} do pet shop "${shopConfig.shop_name}".
${toneInstructions[shopConfig.voice_tone] || toneInstructions.friendly}

IMPORTANTE SOBRE CONVERSA:
- Você está em uma conversa contínua via WhatsApp. O histórico de mensagens anteriores já está incluído.
- NÃO se apresente novamente se já tiver se apresentado em mensagens anteriores.
- Mantenha o contexto da conversa. Se o cliente já forneceu informações (nome, pet, etc.), não peça novamente.
- Seja natural e fluida, como uma conversa real de WhatsApp.
- Só se apresente na PRIMEIRA mensagem de uma conversa nova (quando não houver histórico).

INFORMAÇÕES DO PET SHOP:
- Endereço: ${shopConfig.address}, ${shopConfig.neighborhood}, ${shopConfig.city}/${shopConfig.state}
- Telefone: ${shopConfig.phone}

SERVIÇOS OFERECIDOS:
${servicesText || "Nenhum serviço cadastrado ainda."}

HORÁRIOS DE FUNCIONAMENTO:
${hoursText}

DATA/HORA ATUAL: ${brWeekday}, ${brDate} às ${brTime}

AGENDAMENTOS EXISTENTES (para verificar disponibilidade):
${existingAppointments || "Nenhum agendamento."}

AGENDAMENTOS DESTE CLIENTE (telefone: ${cleanPhone}):
${customerApptsText}

REGRAS DE COMPORTAMENTO:
1. Fale SEMPRE em português brasileiro (pt-BR).
2. Seja CURTA e DIRETA. Máximo 3-4 frases por mensagem.
3. NUNCA invente dados. Se serviços ou horários não estiverem cadastrados, peça ao responsável configurar.
4. Siga rigorosamente o tom de voz configurado.

FLUXO DE AGENDAMENTO:
1. Colete: nome do tutor, nome do pet, serviço desejado, data e horário, observações (opcional).
2. Verifique se o horário está dentro do funcionamento e se não há conflito.
3. Confirme TODOS os detalhes com o cliente antes de registrar.
4. Registre como PENDENTE (status "pending").

FLUXO DE REMARCAÇÃO:
1. Identifique o agendamento existente do cliente.
2. Sugira horários disponíveis.
3. Confirme os novos detalhes antes de atualizar.

FLUXO DE CANCELAMENTO:
1. Identifique o agendamento.
2. Confirme que o cliente deseja cancelar.
3. Registre como cancelado.

FORMATO DE AÇÕES (inclua APENAS quando tiver todos os dados confirmados pelo cliente):

Para agendar (status SEMPRE "pending"):
<action>{"type":"create","pet_name":"Rex","owner_name":"João","owner_phone":"${cleanPhone}","service":"Banho","date":"2026-02-21","time":"10:00","notes":"","status":"pending"}</action>

Para cancelar:
<action>{"type":"cancel","date":"2026-02-21","time":"10:00"}</action>

Para reagendar:
<action>{"type":"reschedule","old_date":"2026-02-21","old_time":"10:00","new_date":"2026-02-22","new_time":"14:00"}</action>

Para confirmar (quando o cliente disser que confirma):
<action>{"type":"confirm","date":"2026-02-21","time":"10:00"}</action>

IMPORTANTE: Inclua o bloco <action> APENAS quando o cliente tiver confirmado todos os dados.`;
}

// --- Process AI Actions ---

async function processAction(serviceClient: any, shopConfig: PetShopConfig, cleanPhone: string, reply: string): Promise<string> {
  const actionMatch = reply.match(/<action>(.*?)<\/action>/s);
  if (!actionMatch) return reply;

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
          notes: action.notes || "",
          status: "pending",
        });
      if (insertErr) {
        console.error("Insert error:", insertErr);
        return reply.replace(/<action>.*?<\/action>/s, "").trim() +
          "\n\n⚠️ Houve um erro ao registrar o agendamento. Por favor, tente novamente.";
      }
    } else if (action.type === "confirm") {
      await serviceClient
        .from("appointments")
        .update({ status: "confirmed" })
        .eq("user_id", shopConfig.user_id)
        .eq("date", action.date)
        .eq("time", action.time)
        .in("status", ["pending"]);
    } else if (action.type === "cancel") {
      await serviceClient
        .from("appointments")
        .update({ status: "cancelled" })
        .eq("user_id", shopConfig.user_id)
        .eq("date", action.date)
        .eq("time", action.time);
    } else if (action.type === "reschedule") {
      await serviceClient
        .from("appointments")
        .update({ date: action.new_date, time: action.new_time })
        .eq("user_id", shopConfig.user_id)
        .eq("date", action.old_date)
        .eq("time", action.old_time);
    }
  } catch (parseErr) {
    console.error("Action parse error:", parseErr);
  }

  return reply.replace(/<action>.*?<\/action>/s, "").trim();
}

// --- Main Handler ---

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

    const serviceClient = getServiceClient();
    const cleanPhone = cleanPhoneNumber(senderPhone);

    // Load pet shop config
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

    // Check for quick confirmation responses (CONFIRMO, REMARCAR, CANCELAR)
    const confirmReply = await handleConfirmationResponse(serviceClient, shopConfig, cleanPhone, message);
    if (confirmReply) {
      // Save both messages to history
      await saveMessage(serviceClient, shopConfig.user_id, cleanPhone, "user", message);
      await saveMessage(serviceClient, shopConfig.user_id, cleanPhone, "assistant", confirmReply);
      await sendWhatsAppMessage(instanceName, senderPhone, confirmReply);
      return new Response(JSON.stringify({ success: true, reply: confirmReply }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Save user message to history
    await saveMessage(serviceClient, shopConfig.user_id, cleanPhone, "user", message);

    // Get conversation history
    const conversationHistory = await getConversationHistory(serviceClient, shopConfig.user_id, cleanPhone);

    // Load appointments for context
    const today = new Date().toISOString().split("T")[0];
    const { data: appointments } = await serviceClient
      .from("appointments")
      .select("date, time, service, status, pet_name, owner_name, owner_phone")
      .eq("user_id", shopConfig.user_id)
      .gte("date", today)
      .neq("status", "cancelled");

    const existingAppointments = (appointments || [])
      .map((a: any) => `${a.date} ${a.time} - ${a.service} (${a.pet_name}/${a.owner_name}, tel: ${a.owner_phone}, status: ${a.status})`)
      .join("\n");

    const customerAppointments = (appointments || [])
      .filter((a: any) => phoneMatches(a.owner_phone || "", cleanPhone));

    const customerApptsText = customerAppointments.length > 0
      ? customerAppointments.map((a: any) => `- ${a.date} às ${a.time}: ${a.service} (pet: ${a.pet_name}, status: ${a.status})`).join("\n")
      : "Nenhum agendamento encontrado.";

    // Long-term memory: fetch past appointments for this customer
    const { data: pastAppointments } = await serviceClient
      .from("appointments")
      .select("date, time, service, status, pet_name, owner_name, owner_phone, notes")
      .eq("user_id", shopConfig.user_id)
      .lt("date", today)
      .order("date", { ascending: false })
      .limit(30);

    const pastCustomerAppts = (pastAppointments || [])
      .filter((a: any) => phoneMatches(a.owner_phone || "", cleanPhone));

    const petNames = [...new Set(pastCustomerAppts.map((a: any) => a.pet_name))];
    const ownerName = pastCustomerAppts[0]?.owner_name || customerAppointments[0]?.owner_name || null;
    const favoriteServices = [...new Set(pastCustomerAppts.map((a: any) => a.service))];
    const totalVisits = pastCustomerAppts.length;

    let longTermMemory = "";
    if (totalVisits > 0) {
      longTermMemory = `\nMEMÓRIA DO CLIENTE (telefone: ${cleanPhone}):
- Nome do tutor: ${ownerName || "Desconhecido"}
- Pets conhecidos: ${petNames.join(", ")}
- Serviços já utilizados: ${favoriteServices.join(", ")}
- Total de visitas anteriores: ${totalVisits}
- Últimas visitas:
${pastCustomerAppts.slice(0, 5).map((a: any) => `  · ${a.date} - ${a.service} (${a.pet_name})${a.notes ? ` [obs: ${a.notes}]` : ""}`).join("\n")}

USE ESSAS INFORMAÇÕES para personalizar o atendimento:
- Chame o tutor pelo nome se souber.
- Mencione os pets pelos nomes conhecidos.
- Sugira serviços que o cliente já usou antes.
- Lembre de observações anteriores relevantes (ex: alergias, preferências).
- NÃO peça nome do tutor ou do pet se já souber.`;
    }

    const systemPrompt = buildSystemPrompt(shopConfig, cleanPhone, existingAppointments, customerApptsText) + longTermMemory;

    // Build messages array with history
    const aiMessages: { role: string; content: string }[] = [
      { role: "system", content: systemPrompt },
      ...conversationHistory,
    ];

    // Call AI
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
        messages: aiMessages,
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

    // Process actions (create/cancel/reschedule/confirm)
    reply = await processAction(serviceClient, shopConfig, cleanPhone, reply);

    // Save assistant reply to history
    await saveMessage(serviceClient, shopConfig.user_id, cleanPhone, "assistant", reply);

    // Send reply via WhatsApp
    await sendWhatsAppMessage(instanceName, senderPhone, reply);

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
