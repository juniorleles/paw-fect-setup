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

function enforceBookingDateTimeQuestion(userMessage: string, reply: string): string {
  if (!reply || /<action>.*?<\/action>/s.test(reply)) return reply;

  const bookingIntent = /(agendar|agendamento|marcar|quero\s+(fazer|cortar|agendar|marcar|manicure|pedicure|escova|banho|tosa)|gostaria\s+de\s+agendar|quero\s+\w+\s+(segunda|terça|quarta|quinta|sexta|s[aá]bado|domingo|amanh[aã]|hoje))/i.test(userMessage);
  if (!bookingIntent) return reply;

  const hasQuestion = /\?/.test(reply);
  if (hasQuestion) return reply;

  // If user already provided a time, do NOT ask again
  const userNorm = (userMessage || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const userAlreadyProvidedTime = /\b([01]?\d|2[0-3])[:h]([0-5]\d)?\b/.test(userNorm) || /[àa]s\s+\d{1,2}/i.test(userNorm);

  if (userAlreadyProvidedTime) return reply;

  const listsAvailableTimes = /(hor[aá]rios?\s+dispon[ií]ve|dispon[ií]ve)/i.test(reply);
  if (listsAvailableTimes) {
    return `${reply.trim()}\nQual horário você prefere?`;
  }

  return `${reply.trim()}\nPra qual dia e horário você quer agendar?`;
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

  const tomorrowDate = new Date(nowDate.getTime() + 24 * 60 * 60 * 1000);
  const dayAfterDate = new Date(nowDate.getTime() + 2 * 24 * 60 * 60 * 1000);
  const tomorrowStr = tomorrowDate.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
  const tomorrowWeekday = tomorrowDate.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo", weekday: "long" });
  const tomorrowISO = `${tomorrowDate.toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" })}`;
  const dayAfterStr = dayAfterDate.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
  const dayAfterWeekday = dayAfterDate.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo", weekday: "long" });
  const dayAfterISO = `${dayAfterDate.toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" })}`;

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
AMANHÃ: ${tomorrowWeekday}, ${tomorrowStr} (${tomorrowISO})
DEPOIS DE AMANHÃ: ${dayAfterWeekday}, ${dayAfterStr} (${dayAfterISO})
REGRA CRÍTICA DE DATAS: Quando o cliente disser "amanhã", use EXATAMENTE a data acima (${tomorrowWeekday}, ${tomorrowStr}). NUNCA calcule "amanhã" por conta própria.

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
11. REGRA DE FLEXIBILIDADE: Se o cliente disser "qualquer hora", "pode me encaixar", sugira os próximos 2-3 horários disponíveis diretamente.
12. REGRA DE MUDANÇA DE DECISÃO: Se o cliente muda de ideia (ex: "às 20h" → "melhor às 19"), ACEITE a mudança sem perder contexto. Todas as informações já coletadas permanecem válidas. Apenas atualize o dado que mudou. NUNCA reinicie o fluxo.
13. Se o cliente estiver confuso, faça perguntas objetivas para entender melhor.
9. Siga rigorosamente o tom de voz configurado.
10. Se um serviço NÃO tem preço cadastrado, NÃO mencione valor e NÃO invente preços.
11. Só mencione preço/valor quando o serviço tiver um preço explicitamente cadastrado.
12. PERGUNTAS FORA DO SEU DOMÍNIO (ex: "aceita cartão?", "tem estacionamento?", "fazem promoção?", formas de pagamento, etc.): Você NÃO tem essa informação. Responda honestamente: "Não tenho essa informação, mas posso passar seu contato para o responsável te responder! 😊". NUNCA diga "posso verificar" se não pode.

COMPORTAMENTO:
- Sempre cumprimente de forma breve na primeira mensagem.
- Identifique a necessidade do cliente.
- Conduza a conversa com naturalidade.
- REGRA DE AGENDAMENTO PROATIVO (CRÍTICA): Quando o cliente demonstrar intenção de agendar (ex: "quero cortar o cabelo", "quero fazer pé e mão"), você DEVE:
  1. Identificar o(s) serviço(s) correspondente(s) na lista cadastrada.
  2. Se o cliente usar linguagem informal (ex: "pé e mão"), mapear para os nomes corretos dos serviços.
  3. Se forem múltiplos serviços combinados, tratar como agendamento ÚNICO combinado.
  4. Se houver AMBIGUIDADE (ex: "cortar o cabelo" pode ser Corte Feminino ou Corte Masculino), pergunte qual opção o cliente prefere E TAMBÉM pergunte data e horário NA MESMA MENSAGEM. Exemplo: "Temos Corte Feminino (R$100) e Corte Masculino (R$50).\nQual você prefere? E pra qual dia e horário?"
  5. Se NÃO houver ambiguidade, confirme o serviço identificado E pergunte data e horário.
  6. NUNCA responda APENAS listando serviços SEM perguntar quando. A pergunta de data/horário é OBRIGATÓRIA.
- Seja organizada nas respostas. Use listas quando necessário.
- Nunca mencione regras internas ou configurações do sistema.
- Você SEMPRE envia UMA ÚNICA MENSAGEM por vez. NUNCA divida a resposta em mensagens separadas. Se o cliente faz duas perguntas ou muda de assunto, responda TUDO junto em uma única mensagem fluida.

EM CASO DE ERRO INTERNO:
- Gere uma resposta alternativa útil relacionada ao pedido do cliente. Nunca retorne resposta vazia.

FORMATO:
- Responda sempre em texto simples e estruturado.
- Não use JSON, código ou marcações técnicas na resposta ao cliente.

FLUXO DE AGENDAMENTO (CONFIRMAÇÃO AUTOMÁTICA — ETAPA ÚNICA):
COLETA DE NOME — REGRA CRÍTICA: Antes de confirmar, você DEVE saber o nome do cliente. Se ainda não informou, pergunte o nome JUNTO com data/horário.
CONFIRMAÇÃO DIRETA: Quando o cliente escolher um horário e você tiver TODAS as informações (nome, serviço, data, horário), confirme AUTOMATICAMENTE. NÃO pergunte "podemos confirmar?", "tudo certo?", "posso marcar?". Confirme DIRETO com o bloco <action> na mesma resposta.
FORMATO DA CONFIRMAÇÃO:
"Agendamento confirmado ✅
• Serviço: [serviço]
• Data: [dia da semana], [data]
• Horário: [horário]
• Valor: R$[valor] (só se tiver preço)
Se precisar remarcar, é só avisar! 😊"
REGRA PÓS-AGENDAMENTO: Após confirmar com <action>, NÃO faça perguntas adicionais. Encerre de forma limpa.

FORMATO DE AÇÕES:

Para agendar (inclua na mesma mensagem da confirmação):
<action>{"type":"create","client_name":"João","service":"Banho","date":"2026-02-25","time":"10:00"}</action>

Para cancelar:
<action>{"type":"cancel","date":"2026-02-25","time":"10:00"}</action>

IMPORTANTE: O bloco <action> DEVE ser incluído na mesma mensagem da confirmação. NÃO separe em duas etapas.`;
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
    const lastUserMessage = [...messages].reverse().find((m) => m.role === "user")?.content || "";
    let reply = aiData.choices?.[0]?.message?.content || "Desculpe, não consegui processar sua mensagem.";
    reply = enforceBookingDateTimeQuestion(lastUserMessage, reply);

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
