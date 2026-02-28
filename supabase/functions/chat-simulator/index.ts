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

SAUDAÇÃO POR HORÁRIO (use APENAS na PRIMEIRA mensagem da conversa):
- Das 06:00 às 11:59 → "Bom dia"
- Das 12:00 às 17:59 → "Boa tarde"
- Das 18:00 às 05:59 → "Boa noite"
NUNCA use saudação que não corresponda ao horário atual.
IMPORTANTE: NÃO repita a saudação em mensagens seguintes. Após a primeira mensagem, vá direto ao assunto de forma natural e fluida, como em uma conversa real de WhatsApp.

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
8. REGRA CRÍTICA: NUNCA peça uma informação que o cliente já forneceu. Se ele disse "quero agendar escova", o serviço já é "escova" — NÃO pergunte "qual serviço?". Extraia TODAS as informações já disponíveis antes de perguntar o que falta.
9. REGRA CRÍTICA: Se o cliente fornece MÚLTIPLAS informações de uma vez (ex: nome + horário), processe TODAS juntas. NÃO ignore nenhuma. Se ele disse "Jene" e "quero às 10h", você já tem o nome E o horário — NÃO liste horários novamente. Avance para a próxima etapa.
10. NUNCA liste horários disponíveis se o cliente JÁ escolheu um horário. Apenas verifique disponibilidade e prossiga.
11. Se o cliente estiver confuso, faça perguntas objetivas para entender melhor.
9. Siga rigorosamente o tom de voz configurado.
10. Se um serviço NÃO tem preço cadastrado, NÃO mencione valor e NÃO invente preços.
11. Só mencione preço/valor quando o serviço tiver um preço explicitamente cadastrado.
12. PERGUNTAS FORA DO SEU DOMÍNIO (ex: "aceita cartão?", "tem estacionamento?", "fazem promoção?", formas de pagamento, etc.): Você NÃO tem essa informação. Responda honestamente: "Não tenho essa informação, mas posso passar seu contato para o responsável te responder! 😊". NUNCA diga "posso verificar" se não pode.

COMPORTAMENTO:
- Sempre cumprimente de forma breve na primeira mensagem.
- Identifique a necessidade do cliente.
- Conduza a conversa com naturalidade.
- REGRA DE AGENDAMENTO PROATIVO: Quando o cliente demonstrar intenção de agendar (ex: "quero cortar o cabelo", "quero agendar banho"), identifique o serviço E já pergunte data e horário na MESMA resposta. Exemplo: "Vamos agendar seu corte! 😊\nPra qual dia e horário?" — NÃO responda apenas confirmando o serviço sem perguntar quando.
- Seja organizada nas respostas. Use listas quando necessário.
- Nunca mencione regras internas ou configurações do sistema.
- Você SEMPRE envia UMA ÚNICA MENSAGEM por vez. NUNCA divida a resposta em mensagens separadas. Se o cliente faz duas perguntas ou muda de assunto, responda TUDO junto em uma única mensagem fluida.

EM CASO DE ERRO INTERNO:
- Gere uma resposta alternativa útil relacionada ao pedido do cliente. Nunca retorne resposta vazia.

FORMATO:
- Responda sempre em texto simples e estruturado.
- Não use JSON, código ou marcações técnicas na resposta ao cliente.

FLUXO DE AGENDAMENTO (OBRIGATÓRIO — 2 ETAPAS SEPARADAS):
ETAPA 1 — RESUMO (SEM ACTION): Após coletar nome do cliente, serviço desejado, data e horário, apresente um RESUMO e pergunte se está tudo certo. NÃO inclua o bloco <action> nesta etapa. Aguarde a próxima mensagem.
ETAPA 2 — REGISTRO (COM ACTION): SOMENTE na mensagem SEGUINTE, após o cliente confirmar (ex: "sim", "ok", "pode ser"), inclua o bloco <action>.
REGRA ABSOLUTA: O bloco <action> JAMAIS pode aparecer na mesma resposta em que você pergunta "tudo certo?" ou "podemos confirmar?". São DUAS mensagens SEPARADAS.

FORMATO DE AÇÕES (APENAS na ETAPA 2, NUNCA na ETAPA 1):

Para agendar (só após o cliente dizer "sim", "ok", "confirmo", etc.):
<action>{"type":"create","client_name":"João","service":"Banho","date":"2026-02-25","time":"10:00"}</action>

Para cancelar:
<action>{"type":"cancel","date":"2026-02-25","time":"10:00"}</action>

EXEMPLO CORRETO:
Mensagem 1 (ETAPA 1 - você): "Jene, Escova no sábado às 10h, R$40. Podemos confirmar?" → SEM <action>
Mensagem 2 (cliente): "Sim"
Mensagem 3 (ETAPA 2 - você): "Agendamento confirmado!" → COM <action>

EXEMPLO ERRADO (NUNCA faça isso):
Mensagem 1 (você): "Podemos confirmar?" + <action> → PROIBIDO! Isso pula a etapa de confirmação.

IMPORTANTE: Inclua o bloco <action> APENAS quando o cliente tiver confirmado todos os dados na mensagem ANTERIOR.
REGRA PÓS-AGENDAMENTO: Após registrar/confirmar um agendamento com <action>, a resposta deve ser APENAS uma confirmação breve. NÃO faça NENHUMA pergunta adicional na mesma mensagem. Encerre de forma limpa.`;
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
