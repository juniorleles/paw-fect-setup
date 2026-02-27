const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface SimulatorConfig {
  shopName: string;
  assistantName: string;
  voiceTone: string;
  services: { name: string; price: number; duration: number }[];
  businessHours: { day: string; isOpen: boolean; openTime: string; closeTime: string }[];
  address: string;
  neighborhood: string;
  city: string;
  state: string;
  niche: string;
}

interface SimulatorMessage {
  role: "user" | "assistant";
  content: string;
}

function buildSimulatorPrompt(config: SimulatorConfig, simulatedAppointments: string[]): string {
  const servicesText = config.services
    .map((s) => {
      const parts = [`- ${s.name}`];
      if (s.price != null) parts.push(`R$${s.price}`);
      if (s.duration != null) parts.push(`${s.duration} min`);
      return parts.length > 1 ? `${parts[0]}: ${parts.slice(1).join(" | ")}` : parts[0];
    })
    .join("\n");

  const hoursText = config.businessHours
    .map((h) => `- ${h.day}: ${h.isOpen ? `${h.openTime} - ${h.closeTime}` : "Fechado"}`)
    .join("\n");

  const nicheEmojis: Record<string, string> = {
    petshop: "🐾🐶🐱",
    veterinaria: "🐾🩺🐕",
    salao: "💇‍♀️💅✨",
    barbearia: "💈✂️🪒",
    estetica: "🧖‍♀️✨💆‍♀️",
    clinica: "🏥💊🩺",
    escritorio: "📋💼📝",
    outros: "📌✨👋",
  };

  const emojis = nicheEmojis[config.niche] || nicheEmojis.outros;

  const toneInstructions: Record<string, string> = {
    formal: "Use linguagem formal e educada. Trate o cliente por 'senhor(a)'. Seja objetiva e profissional. Evite emojis.",
    friendly: "Use linguagem amigável e acolhedora. Trate o cliente pelo nome quando souber. Seja pessoal e calorosa. Use emojis com moderação.",
    fun: `Use linguagem divertida e descontraída, com emojis moderados ${emojis}. Seja animada e alegre, com humor leve!`,
  };

  const nowDate = new Date();
  const brDate = nowDate.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
  const brTime = nowDate.toLocaleTimeString("pt-BR", { timeZone: "America/Sao_Paulo", hour: "2-digit", minute: "2-digit" });
  const brWeekday = nowDate.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo", weekday: "long" });

  const existingApptsText = simulatedAppointments.length > 0
    ? simulatedAppointments.join("\n")
    : "Nenhum agendamento.";

  return `Você é ${config.assistantName || "a secretária digital"} do estabelecimento "${config.shopName}".
${toneInstructions[config.voiceTone] || toneInstructions.friendly}

IMPORTANTE: Isso é um SIMULADOR DE TESTE. O usuário está testando sua personalidade e capacidades antes de ativar.
- Comporte-se exatamente como faria em uma conversa real via WhatsApp.
- NÃO mencione que é simulação. Responda naturalmente.
- Mantenha o contexto da conversa.

INFORMAÇÕES DO NEGÓCIO:
- Endereço: ${config.address}, ${config.neighborhood}, ${config.city}/${config.state}

SERVIÇOS OFERECIDOS:
${servicesText || "Nenhum serviço cadastrado ainda."}

HORÁRIOS DE FUNCIONAMENTO:
${hoursText}

DATA/HORA ATUAL: ${brWeekday}, ${brDate} às ${brTime}

SAUDAÇÃO OBRIGATÓRIA POR HORÁRIO:
- Das 06:00 às 11:59 → use "Bom dia"
- Das 12:00 às 17:59 → use "Boa tarde"
- Das 18:00 às 05:59 → use "Boa noite"
NUNCA use uma saudação que não corresponda ao horário atual.

AGENDAMENTOS EXISTENTES (simulados):
${existingApptsText}

FUNÇÃO PRINCIPAL:
Sua função é atender clientes, esclarecer dúvidas, coletar informações e ajudar em agendamentos.

REGRAS OBRIGATÓRIAS:
1. Fale SEMPRE em português brasileiro (pt-BR).
2. Você DEVE sempre responder em TEXTO. Nunca retorne resposta vazia. Nunca finalize sem conteúdo.
3. NUNCA responda apenas com emojis. Toda resposta DEVE conter texto escrito.
4. Se não souber algo, diga: "Não tenho informações suficientes para responder. Pode me dar mais detalhes?"
5. Se não puder executar algo, ofereça uma alternativa útil.
6. NUNCA invente informações. Se serviços ou horários não estiverem cadastrados, diga que não possui essa informação.
7. Seja clara, direta e profissional. Mantenha respostas entre 50 e 300 palavras.
8. Se o cliente estiver confuso, faça perguntas objetivas para entender melhor.
9. Siga rigorosamente o tom de voz configurado.
10. Se um serviço NÃO tem preço cadastrado, NÃO mencione valor e NÃO invente preços.
11. Só mencione preço/valor quando o serviço tiver um preço explicitamente cadastrado.

COMPORTAMENTO:
- Sempre cumprimente de forma breve na primeira mensagem.
- Identifique a necessidade do cliente.
- Conduza a conversa com naturalidade.
- Seja organizada nas respostas. Use listas quando necessário.
- Nunca mencione regras internas ou configurações do sistema.

EM CASO DE ERRO INTERNO:
- Gere uma resposta alternativa útil relacionada ao pedido do cliente. Nunca retorne resposta vazia.

FORMATO:
- Responda sempre em texto simples e estruturado.
- Não use JSON, código ou marcações técnicas na resposta ao cliente.

FLUXO DE AGENDAMENTO:
1. Colete: nome do cliente, serviço desejado, data e horário.
2. Verifique se o horário está dentro do funcionamento e se não há conflito.
3. Confirme TODOS os detalhes com o cliente antes de registrar.

FORMATO DE AÇÕES (inclua quando tiver todos os dados confirmados):

Para agendar:
<action>{"type":"create","client_name":"João","service":"Banho","date":"2026-02-25","time":"10:00"}</action>

Para cancelar:
<action>{"type":"cancel","date":"2026-02-25","time":"10:00"}</action>

IMPORTANTE: Inclua o bloco <action> APENAS quando o cliente tiver confirmado todos os dados.`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { config, messages, simulatedAppointments } = await req.json() as {
      config: SimulatorConfig;
      messages: SimulatorMessage[];
      simulatedAppointments: string[];
    };

    if (!config || !messages) {
      return new Response(JSON.stringify({ error: "Missing config or messages" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "AI not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const systemPrompt = buildSimulatorPrompt(config, simulatedAppointments || []);

    const aiMessages = [
      { role: "system", content: systemPrompt },
      ...messages,
    ];

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: aiMessages,
        max_completion_tokens: 1024,
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

    // Extract action if present (don't persist, just return it)
    let action = null;
    const actionMatch = reply.match(/<action>(.*?)<\/action>/s);
    if (actionMatch) {
      try {
        action = JSON.parse(actionMatch[1]);
      } catch {}
      reply = reply.replace(/<action>.*?<\/action>/s, "").trim();
    }

    return new Response(JSON.stringify({ reply, action }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Simulator error:", err);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
