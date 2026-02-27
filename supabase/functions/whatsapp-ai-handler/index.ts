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
  niche: string;
  max_concurrent_appointments?: number;
}

// --- Compute Available Slots ---

// Helper: get service duration in minutes
function getServiceDuration(services: any[], serviceName: string): number {
  const normalized = (serviceName || "").trim().toLowerCase();

  // Direct match first
  const svc = services.find((s: any) => (s.name || "").trim().toLowerCase() === normalized);
  if (svc) return svc.duration || 30;

  // Combined services (e.g. "Pintura cabelo + Escova") — sum individual durations
  if (normalized.includes("+")) {
    const parts = normalized.split("+").map((p: string) => p.trim());
    let totalDuration = 0;
    for (const part of parts) {
      const match = services.find((s: any) => (s.name || "").trim().toLowerCase() === part);
      totalDuration += match?.duration || 30;
    }
    return totalDuration;
  }

  return 30;
}

// Helper: convert HH:MM to minutes since midnight
function timeToMinutes(t: string): number {
  const [h, m] = t.slice(0, 5).split(":").map(Number);
  return h * 60 + m;
}

// Helper: convert minutes since midnight to HH:MM
function minutesToTime(mins: number): string {
  const h = String(Math.floor(mins / 60)).padStart(2, "0");
  const m = String(mins % 60).padStart(2, "0");
  return `${h}:${m}`;
}

// Build a map of how many concurrent bookings exist at each minute-slot for a given date
function buildOccupancyMap(
  dateStr: string,
  appointments: any[],
  services: any[],
  slotInterval: number
): Map<string, number> {
  const occupancy = new Map<string, number>();
  const dayApts = appointments.filter((a: any) => a.date === dateStr && a.status !== "cancelled");

  console.log(`[OCCUPANCY] Date: ${dateStr}, appointments: ${dayApts.length}, services config: ${services.map((s: any) => `${s.name}(${s.duration || '?'}min)`).join(', ')}`);

  for (const apt of dayApts) {
    const aptStart = timeToMinutes(apt.time);
    const aptDuration = getServiceDuration(services, apt.service);
    const slotsOccupied = Math.max(1, Math.ceil(aptDuration / slotInterval));

    console.log(`[OCCUPANCY] Apt: ${apt.service} at ${apt.time} → duration=${aptDuration}min, slotsOccupied=${slotsOccupied}`);

    for (let i = 0; i < slotsOccupied; i++) {
      const slotTime = minutesToTime(aptStart + i * slotInterval);
      occupancy.set(slotTime, (occupancy.get(slotTime) || 0) + 1);
    }
  }

  console.log(`[OCCUPANCY] Final map: ${JSON.stringify(Object.fromEntries(occupancy))}`);
  return occupancy;
}

function computeAvailableSlots(
  businessHours: any[],
  appointments: any[],
  maxConcurrent: number,
  services: any[],
  daysAhead = 7
): string {
  const now = new Date();
  const brNow = new Date(now.toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
  const todayStr = brNow.toISOString().split("T")[0];
  const currentHour = brNow.getHours();
  const currentMin = brNow.getMinutes();

  const dayNames = ["Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"];

  const slotInterval = 30;

  const lines: string[] = [];

  for (let d = 0; d < daysAhead; d++) {
    const date = new Date(brNow);
    date.setDate(date.getDate() + d);
    const dateStr = date.toISOString().split("T")[0];
    const weekday = dayNames[date.getDay()];

    const daySchedule = businessHours.find((h: any) => h.day === weekday);
    if (!daySchedule || !daySchedule.isOpen) continue;

    const [openH, openM] = daySchedule.openTime.split(":").map(Number);
    const [closeH, closeM] = daySchedule.closeTime.split(":").map(Number);

    // Build occupancy map considering service durations
    const occupancy = buildOccupancyMap(dateStr, appointments, services, slotInterval);

    const freeSlots: string[] = [];
    let h = openH, m = openM;
    while (h < closeH || (h === closeH && m < closeM)) {
      const timeStr = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;

      const isPast = d === 0 && (h < currentHour || (h === currentHour && m <= currentMin));
      if (!isPast) {
        const booked = occupancy.get(timeStr) || 0;
        const available = maxConcurrent - booked;
        if (available > 0) {
          freeSlots.push(maxConcurrent > 1 ? `${timeStr} (${available}/${maxConcurrent} vagas)` : timeStr);
        }
      }

      m += slotInterval;
      if (m >= 60) { h += Math.floor(m / 60); m = m % 60; }
    }

    if (freeSlots.length > 0) {
      lines.push(`${weekday} ${dateStr}: ${freeSlots.join(", ")}`);
    } else {
      lines.push(`${weekday} ${dateStr}: LOTADO`);
    }
  }

  return lines.join("\n");
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

function normalizeQuestionText(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/<action>.*?<\/action>/gs, "")
    .replace(/[^\p{L}\p{N}\s?]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractPrimaryQuestion(text: string): string {
  const normalized = normalizeQuestionText(text);
  const pieces = normalized
    .split("?")
    .map((p) => p.trim())
    .filter(Boolean);

  if (pieces.length === 0) return "";
  return pieces[pieces.length - 1];
}

function countQuestions(text: string): number {
  const normalized = normalizeQuestionText(text);
  return (normalized.match(/\?/g) || []).length;
}

function hasAnyQuestion(text: string): boolean {
  return countQuestions(text) > 0;
}

function shouldSuppressRepeatedQuestion(lastAssistant: string, currentReply: string): boolean {
  const prevQ = extractPrimaryQuestion(lastAssistant);
  const currQ = extractPrimaryQuestion(currentReply);

  if (!prevQ || !currQ) return false;
  if (prevQ.length < 6 || currQ.length < 6) return false;

  return prevQ === currQ || prevQ.includes(currQ) || currQ.includes(prevQ);
}

function shouldSuppressConsecutiveQuestion(lastAssistant: string, currentReply: string): boolean {
  return hasAnyQuestion(lastAssistant) && hasAnyQuestion(currentReply);
}

function enforceSingleQuestionPerReply(reply: string): string {
  const lines = reply
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  let questionKept = false;
  const compact: string[] = [];

  for (const line of lines) {
    const isQuestion = line.includes("?");
    if (!isQuestion) {
      compact.push(line);
      continue;
    }

    if (!questionKept) {
      compact.push(line);
      questionKept = true;
    }
  }

  const sanitized = compact.join("\n").trim();
  if (sanitized) return sanitized;
  return "Perfeito, informação anotada. Vou seguir com o seu atendimento.";
}

function removeRepeatedQuestion(reply: string): string {
  const lines = reply
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  const withoutQuestions = lines.filter((line) => !line.includes("?"));
  const sanitized = withoutQuestions.join("\n").trim();

  if (sanitized) return sanitized;
  return "Perfeito, informação anotada. Vou seguir com o seu atendimento.";
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

  // Filter out error/fallback messages and emoji-only responses that pollute context
  const FALLBACK_PHRASES = [
    "Tive uma dificuldade técnica",
    "Desculpe, não consegui processar",
    "instabilidade temporária",
  ];

  // Helper: check if a message contains actual text (not just emojis)
  const hasActualText = (text: string | null | undefined): boolean => {
    if (!text) return false;
    const cleaned = text
      .replace(/<action>.*?<\/action>/gs, "")
      .replace(/[\p{Emoji_Presentation}\p{Emoji}\p{Extended_Pictographic}]/gu, "")
      .replace(/[\s\p{P}\p{S}]/gu, "")
      .trim();
    return cleaned.length > 0;
  };

  const filtered = (data || [])
    .map((m: any) => ({ role: m.role, content: m.content }))
    .filter((m) => {
      if (m.role === "assistant") {
        // Remove fallback messages
        if (FALLBACK_PHRASES.some((phrase) => m.content?.includes(phrase))) return false;
        // Remove emoji-only responses (legacy pollution)
        if (!hasActualText(m.content)) return false;
      }
      return true;
    });

  // Remove consecutive duplicate user messages (keep only the last one in each sequence)
  const cleaned: { role: string; content: string }[] = [];
  for (let i = 0; i < filtered.length; i++) {
    const msg = filtered[i];
    const next = filtered[i + 1];
    // Skip user message if next one is also user (keep the last in a sequence)
    if (msg.role === "user" && next && next.role === "user") {
      continue;
    }
    cleaned.push(msg);
  }

  // Ensure conversation doesn't end with orphaned user messages without a response
  // and limit to last 10 messages to keep context manageable
  return cleaned.slice(-10);
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

async function getLatestAssistantMessage(
  serviceClient: any,
  userId: string,
  phone: string
): Promise<string> {
  const { data } = await serviceClient
    .from("conversation_messages")
    .select("content")
    .eq("user_id", userId)
    .eq("phone", phone)
    .eq("role", "assistant")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return data?.content || "";
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
    return `✅ Presença confirmada! ${nextAppt.pet_name !== "—" ? nextAppt.pet_name + " está esperado(a) para " : ""}${nextAppt.service} no dia ${nextAppt.date} às ${nextAppt.time}. Até lá!`;
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

function buildSystemPrompt(shopConfig: PetShopConfig, cleanPhone: string, existingAppointments: string, customerApptsText: string, availableSlots: string, maxConcurrent: number): string {
  const servicesText = (shopConfig.services as any[])
    .map((s: any) => {
      const parts = [`- ${s.name}`];
      if (s.price != null) parts.push(`R$${s.price}`);
      if (s.duration != null) parts.push(`${s.duration} min`);
      return parts.length > 1 ? `${parts[0]}: ${parts.slice(1).join(" | ")}` : parts[0];
    })
    .join("\n");

  const hoursText = (shopConfig.business_hours as any[])
    .map((h: any) => `- ${h.day}: ${h.isOpen ? `${h.openTime} - ${h.closeTime}` : "Fechado"}`)
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

  const emojis = nicheEmojis[shopConfig.niche] || nicheEmojis.outros;

  const toneInstructions: Record<string, string> = {
    formal: "Use linguagem formal e educada. Trate o cliente por 'senhor(a)'. Seja objetiva e profissional. NÃO use emojis.",
    friendly: "Use linguagem amigável e acolhedora. Trate o cliente pelo nome quando souber. Seja pessoal e calorosa. Pode usar no máximo 1 emoji por mensagem como complemento, mas a resposta DEVE ser OBRIGATORIAMENTE composta por TEXTO ESCRITO em português. NUNCA responda apenas com emojis.",
    fun: "Use linguagem divertida e descontraída. Seja animada e alegre, com humor leve! Pode usar no máximo 1-2 emojis como complemento ao final de frases, mas TODA resposta DEVE OBRIGATORIAMENTE começar com TEXTO ESCRITO em português. PROIBIDO responder apenas com emojis. Sempre escreva pelo menos 2 frases de texto antes de qualquer emoji. NUNCA envie uma mensagem que contenha apenas emojis ou símbolos.",
  };

  const nowDate = new Date();
  const brDate = nowDate.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
  const brTime = nowDate.toLocaleTimeString("pt-BR", { timeZone: "America/Sao_Paulo", hour: "2-digit", minute: "2-digit" });
  const brWeekday = nowDate.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo", weekday: "long" });

  const isPetNiche = ["petshop", "veterinaria"].includes(shopConfig.niche || "petshop");
  
  const nicheLabels: Record<string, string> = {
    petshop: "pet shop",
    salao: "salão de beleza",
    barbearia: "barbearia",
    clinica: "clínica",
    estetica: "centro de estética",
    escritorio: "escritório",
    veterinaria: "clínica veterinária",
    outros: "estabelecimento",
  };
  const nicheLabel = nicheLabels[shopConfig.niche] || nicheLabels.outros;

  // Adapt field names based on niche
  const clientLabel = isPetNiche ? "tutor" : "cliente";
  const petField = isPetNiche 
    ? '- nome do pet' 
    : '';
  const collectFields = isPetNiche
    ? `nome do ${clientLabel}, nome do pet, serviço desejado, data e horário, observações (opcional)`
    : `nome do ${clientLabel}, serviço desejado, data e horário, observações (opcional)`;
  
  const actionExample = isPetNiche
    ? `<action>{"type":"create","pet_name":"Rex","owner_name":"João","owner_phone":"${cleanPhone}","service":"Banho","date":"2026-02-21","time":"10:00","notes":"","status":"pending"}</action>`
    : `<action>{"type":"create","pet_name":"—","owner_name":"Ana","owner_phone":"${cleanPhone}","service":"Escova","date":"2026-02-21","time":"10:00","notes":"","status":"pending"}</action>`;

  return `Você é ${shopConfig.assistant_name || "a secretária digital"} do ${nicheLabel} "${shopConfig.shop_name}".
${toneInstructions[shopConfig.voice_tone] || toneInstructions.friendly}

########## REGRA MAIS IMPORTANTE — LEIA PRIMEIRO ##########
MÚLTIPLOS AGENDAMENTOS:
Quando o cliente disser qualquer uma dessas frases (ou variações):
"quero agendar mais um", "mais um pet", "outro pet", "agendar mais um pet", "quero agendar mais um pet", "outro horário", "agendar de novo", "quero marcar outro", "tenho outro pet", "agendar mais um pet para amanhã"

Você DEVE:
1. Entender que ele quer fazer um NOVO agendamento ADICIONAL (não consultar os existentes).
2. Iniciar IMEDIATAMENTE a coleta de dados para o novo agendamento (${collectFields}).
3. NÃO listar agendamentos existentes.
4. NÃO perguntar se ele quer cancelar, remarcar ou confirmar agendamentos anteriores.

O cliente pode ter 1, 5 ou 10 agendamentos — cada novo pedido é independente.
NUNCA confunda "agendar mais um" com "ver meus agendamentos".
########## FIM DA REGRA MAIS IMPORTANTE ##########

IMPORTANTE SOBRE CONVERSA:
- Você está em uma conversa contínua via WhatsApp. O histórico de mensagens anteriores já está incluído.
- NÃO se apresente novamente se já tiver se apresentado em mensagens anteriores.
- Mantenha o contexto da conversa. Se o cliente já forneceu informações (nome, etc.), não peça novamente.
- Seja natural e fluida, como uma conversa real de WhatsApp.
- Só se apresente na PRIMEIRA mensagem de uma conversa nova (quando não houver histórico).

MENSAGENS SEQUENCIAIS — REGRA CRÍTICA:
- Clientes frequentemente enviam várias mensagens curtas em sequência (ex: "Às 15" seguido de "Quero aquele tratamento lá").
- Quando a mensagem do cliente contiver quebras de linha (\n), significa que são mensagens enviadas em sequência.
- COMBINE todas as partes como UMA ÚNICA INTENÇÃO antes de responder.
- Exemplo 1: "Escova\nMe encaixa qualquer hora" = "Cliente quer agendar escova e tem horário flexível."
- Exemplo 2: "Pedicure\nColoque as 17" = "Cliente quer remarcar/agendar Pedicure para as 17:00."
- Exemplo 3: "Muda pra amanhã\nàs 10" = "Cliente quer remarcar para amanhã às 10:00."
- Exemplo 4: "Às 15\nQuero aquele tratamento lá" = "Cliente quer agendar algum tratamento às 15h. Pergunte APENAS qual serviço."
- NUNCA trate cada linha como uma conversa separada. Interprete o conjunto completo.
- Responda de forma unificada com UMA ÚNICA RESPOSTA abordando tudo o que o cliente disse.
- NUNCA envie duas respostas separadas para mensagens sequenciais. Sempre UMA resposta consolidada.
- Se o cliente menciona um serviço existente + novo horário, entenda como REMARCAÇÃO (não como novo agendamento).

REGRA CRÍTICA — RESPOSTA ÚNICA E CONSOLIDADA:
- Você SEMPRE envia UMA ÚNICA MENSAGEM por vez. NUNCA divida sua resposta em mensagens separadas.
- Se o cliente faz duas perguntas ou dois assuntos (ex: "obrigado" + "que horas fecha?"), responda TUDO em UMA SÓ mensagem.
- Mesmo que o contexto mude (ex: encerramento + nova pergunta), responda tudo junto, de forma fluida, em uma única resposta.
- Exemplo ERRADO: Mensagem 1: "Por nada! Beijos." → Mensagem 2: "Fechamos às 18h."
- Exemplo CORRETO: "Por nada! Fechamos hoje às 18h. Quer que eu te encaixe antes disso?"
- Sua saída é SEMPRE uma única string de texto. Nunca gere múltiplos blocos de resposta.

REFERÊNCIAS VAGAS — REGRA CRÍTICA:
- Se o cliente usar termos vagos como "aquele tratamento lá", "aquele serviço", "o mesmo de sempre", "aquela coisa":
  → NÃO assuma qual serviço é. NÃO reserve horário sem saber o serviço.
  → Pergunte de forma objetiva: "Qual serviço você quer?" e liste as opções disponíveis.
  → Mas PRESERVE todas as outras informações já fornecidas (data, horário, nome).
- Se o cliente disse "às 15" + "quero aquele tratamento": você já sabe o HORÁRIO (15h), falta o SERVIÇO. Pergunte APENAS o serviço.
- NUNCA peça duas informações quando só falta uma.

INFORMAÇÕES DO ESTABELECIMENTO:
- Endereço: ${shopConfig.address}, ${shopConfig.neighborhood}, ${shopConfig.city}/${shopConfig.state}
- Telefone: ${shopConfig.phone}

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

AGENDAMENTOS EXISTENTES (para verificar DISPONIBILIDADE de horários — NÃO liste para o cliente automaticamente):
${existingAppointments || "Nenhum agendamento."}

AGENDAMENTOS DESTE CLIENTE (telefone: ${cleanPhone}):
${customerApptsText}
REGRA: Se o cliente perguntar sobre "agendamentos pendentes", "pendente de confirmação", "meus agendamentos", "algum agendamento", ou variações similares → liste os agendamentos DESTE CLIENTE acima, indicando o status de cada um (pendente, confirmado, etc). Responda de forma clara e objetiva.

CAPACIDADE DE ATENDIMENTO SIMULTÂNEO: ${maxConcurrent} atendente${maxConcurrent > 1 ? "s" : ""} por horário.

DURAÇÃO DOS SERVIÇOS — REGRA CRÍTICA:
Cada serviço tem uma duração definida. Ao verificar disponibilidade, considere que um agendamento OCUPA MÚLTIPLOS SLOTS de 30 minutos consecutivos com base na duração do serviço.
Exemplo: "Pintura + Escova" de 90 min agendada às 14:00 ocupa os slots 14:00, 14:30 e 15:00.
Portanto, se alguém já tem um serviço de 90 min às 14:00, os horários 14:00, 14:30 e 15:00 estão OCUPADOS.
NUNCA sugira um horário que cairia dentro do intervalo de duração de um agendamento existente.
Se o cliente pedir um horário que conflita com a duração de outro serviço, informe que está ocupado e sugira o próximo horário livre APÓS o término do serviço em andamento.

HORÁRIOS DISPONÍVEIS NOS PRÓXIMOS 7 DIAS (já consideram a duração dos serviços):
${availableSlots || "Nenhum horário disponível."}
IMPORTANTE: Use SEMPRE esta lista para sugerir horários livres. NÃO invente horários. Se o cliente pedir um horário que não está nesta lista, informe que está lotado e sugira alternativas da lista.

FUNÇÃO PRINCIPAL:
Sua função é atender clientes, esclarecer dúvidas, coletar informações e ajudar em agendamentos.

REGRAS OBRIGATÓRIAS:
1. Fale SEMPRE em português brasileiro (pt-BR).
2. Você DEVE sempre responder em TEXTO. Nunca retorne resposta vazia.
3. NUNCA responda apenas com emojis. Emojis são complementos, nunca a resposta inteira.
4. NUNCA invente informações. Se não souber, pergunte.
5. Se um serviço NÃO tem preço cadastrado, NÃO mencione valor.
6. Siga rigorosamente o tom de voz configurado.
7. PERGUNTAS FORA DO SEU DOMÍNIO (ex: "aceita cartão?", "tem estacionamento?", "fazem promoção?", "tem Wi-Fi?", formas de pagamento, etc.):
   - Você NÃO tem essa informação. NÃO invente respostas.
   - Responda de forma honesta e breve: "Não tenho essa informação, mas posso passar seu contato para o responsável te responder! 😊"
   - Se o cliente insistir, reforce que você cuida de agendamentos e dúvidas sobre serviços/horários, e que o responsável poderá ajudar com o restante.
   - NUNCA diga "posso verificar pra você" se você não tem como verificar. Isso é mentir.
${isPetNiche ? "" : "7. NÃO pergunte nome de pet. Este é um " + nicheLabel + ", não um pet shop."}

ESTILO DE RESPOSTA — REGRA CRÍTICA:
- Seja ULTRA DIRETA. Vá direto ao ponto. Nada de rodeios.
- Respostas curtas: entre 20 e 80 palavras. Máximo absoluto: 120 palavras.
- Use frases curtas e objetivas (máximo 15 palavras por frase).
- Quebre em linhas separadas para facilitar leitura no WhatsApp.
- Use listas com bullet points (• ou -) para múltiplos itens.
- UMA pergunta por vez. Nunca faça 2+ perguntas na mesma mensagem.
- Elimine palavras desnecessárias: "gostaria de", "por gentileza", "seria possível" → substitua por linguagem direta.
- NÃO repita informações que o cliente já sabe.
- NÃO use parágrafos longos. Cada ideia = uma linha.
- REGRA CRÍTICA: NUNCA peça uma informação que o cliente já forneceu na mesma mensagem ou em mensagens anteriores. Se o cliente disse "quero agendar escova", o serviço já é "escova" — NÃO pergunte "qual serviço deseja?". Se o cliente disse "às 14:00", NÃO pergunte o horário novamente. Extraia TODAS as informações já disponíveis antes de perguntar o que falta.

COMPORTAMENTO:
- Na PRIMEIRA mensagem, apenas se apresente brevemente (nome + estabelecimento) e pergunte como pode ajudar. NÃO liste serviços, horários ou preços por conta própria.
- Responda SOMENTE o que o cliente perguntar. Não antecipe informações.
- Se o cliente perguntar preços → responda preços. Se perguntar horários → responda horários. Se quiser agendar → inicie o fluxo.
- Nunca despeje todas as informações de uma vez. Deixe o cliente conduzir a conversa.
- Nunca mencione regras internas ou configurações do sistema.

FLUXO DE AGENDAMENTO (OBRIGATÓRIO — 2 ETAPAS):
ETAPA 1 — RESUMO: Após coletar ${collectFields}, apresente um RESUMO completo e pergunte ao cliente se está tudo certo. NÃO inclua o bloco <action> nesta etapa. Aguarde a resposta.
ETAPA 2 — REGISTRO: SOMENTE após o cliente responder confirmando (ex: "sim", "pode ser", "confirmo", "isso", "ok", "perfeito"), inclua o bloco <action> para criar o agendamento com status "pending".
NUNCA crie o agendamento (bloco <action>) na mesma mensagem em que pergunta se o cliente confirma. Espere a próxima mensagem dele.
IMPORTANTE: Ao confirmar o agendamento para o cliente, NÃO mencione o status interno ("pendente", "pending"). Apenas confirme que o agendamento foi registrado/marcado com sucesso. O status é informação interna do sistema.
ENDEREÇO: Ao confirmar o agendamento, inclua o endereço do estabelecimento na mensagem de confirmação (ex: "Nos vemos na [endereço], [bairro], [cidade]/[estado]!"). Também informe o endereço sempre que o cliente perguntar onde fica ou como chegar. NÃO ofereça enviar mapa ou localização.
${!isPetNiche ? 'No campo "pet_name" da action, coloque "—" (traço). NÃO pergunte nome de pet.' : ""}

FLUXO DE REMARCAÇÃO:
1. Se o cliente menciona um serviço que já tem agendado + um novo horário/data, entenda como pedido de remarcação.
2. Se o cliente tem APENAS UM agendamento daquele serviço, use-o diretamente sem perguntar "qual agendamento".
3. Se o cliente tem MÚLTIPLOS agendamentos do mesmo serviço, pergunte qual deseja remarcar.
4. Confirme os novos detalhes (data + horário) antes de executar a ação.
5. NÃO liste horários disponíveis se o cliente JÁ informou o horário desejado — apenas verifique se está disponível.

FLUXO DE CANCELAMENTO:
1. Identifique o agendamento.
2. Confirme que o cliente deseja cancelar.
3. Registre como cancelado.

FORMATO DE AÇÕES — REGRA CRÍTICA:
O bloco <action> NUNCA pode aparecer na mesma mensagem em que você pergunta ao cliente se deseja confirmar.
Fluxo correto: 1) Pergunte se confirma → 2) Espere resposta → 3) Só na PRÓXIMA resposta inclua <action>.

Para agendar (status SEMPRE "pending") — só após cliente confirmar:
${actionExample}

Para cancelar:
<action>{"type":"cancel","date":"2026-02-21","time":"10:00"}</action>

Para reagendar:
<action>{"type":"reschedule","old_date":"2026-02-21","old_time":"10:00","new_date":"2026-02-22","new_time":"14:00"}</action>

Para confirmar presença:
<action>{"type":"confirm","date":"2026-02-21","time":"10:00"}</action>`;
}

// --- Process AI Actions ---

async function processAction(serviceClient: any, shopConfig: PetShopConfig, cleanPhone: string, reply: string): Promise<string> {
  const actionMatch = reply.match(/<action>(.*?)<\/action>/s);
  if (!actionMatch) return reply;

  try {
    const action = JSON.parse(actionMatch[1]);
    console.log("Processing action:", JSON.stringify(action));

    if (action.type === "create") {
      const isPetNiche = ["petshop", "veterinaria"].includes(shopConfig.niche || "petshop");
      
      // For non-pet niches, auto-fill pet_name with owner_name or placeholder
      if (!isPetNiche && !action.pet_name) {
        action.pet_name = action.owner_name || "—";
      }

      // Validate required fields before inserting
      const missingFields: string[] = [];
      if (!action.pet_name && isPetNiche) missingFields.push("nome do pet");
      if (!action.owner_name) missingFields.push("nome do cliente");
      if (!action.service) missingFields.push("serviço");
      if (!action.date) missingFields.push("data");
      if (!action.time) missingFields.push("horário");

      if (missingFields.length > 0) {
        console.warn("Missing fields for appointment creation:", missingFields);
        const cleanReply = reply.replace(/<action>.*?<\/action>/s, "").trim();
        if (cleanReply) return cleanReply;
        return `Preciso de mais algumas informações para completar o agendamento: ${missingFields.join(", ")}. Pode me informar?`;
      }

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
        // Log error silently — never expose errors to the customer
        try {
          const svcClient = getServiceClient();
          await svcClient.from("admin_error_logs").insert({
            error_message: `Falha ao criar agendamento: ${insertErr.message}`,
            endpoint: "whatsapp-ai-handler/processAction",
            severity: "error",
            user_id: shopConfig.user_id,
          });
        } catch { /* ignore logging errors */ }
        // Return only the natural reply without any error indication
        return reply.replace(/<action>.*?<\/action>/s, "").trim();
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

    // --- TRIAL / SUBSCRIPTION ENFORCEMENT ---
    const { data: subscription } = await serviceClient
      .from("subscriptions")
      .select("status, trial_end_at, current_period_end")
      .eq("user_id", shopConfig.user_id)
      .maybeSingle();

    const GRACE_PERIOD_DAYS = 3;
    const now = new Date();
    let blocked = false;

    if (!subscription) {
      blocked = true;
    } else if (subscription.status === "cancelled") {
      blocked = true;
    } else if (subscription.status === "active" && subscription.trial_end_at) {
      const trialEnd = new Date(subscription.trial_end_at);
      if (now > trialEnd) {
        // Check if there's a paid period (current_period_end after trial_end)
        const hasPaidPeriod = subscription.current_period_end && new Date(subscription.current_period_end) > trialEnd;
        if (!hasPaidPeriod) {
          // Trial expired — check grace period
          const msOverdue = now.getTime() - trialEnd.getTime();
          const daysOverdue = Math.floor(msOverdue / (1000 * 60 * 60 * 24));
          if (daysOverdue > GRACE_PERIOD_DAYS) {
            blocked = true;
          } else {
            // Grace period — block messages but don't fully block
            blocked = true; // messages are blocked during grace too
          }
        }
      }
    }

    if (blocked) {
      console.log(`[TRIAL-BLOCK] Messages blocked for user ${shopConfig.user_id} — no active subscription`);
      // Log to admin_error_logs for admin visibility
      try {
        await serviceClient.from("admin_error_logs").insert({
          error_message: `[TRIAL-BLOCK] Mensagem bloqueada — assinatura inativa`,
          endpoint: "whatsapp-ai-handler",
          severity: "warning",
          user_id: shopConfig.user_id,
          stack_trace: JSON.stringify({ sender: cleanPhone, message: message.substring(0, 100), instanceName }),
        });
      } catch { /* ignore logging errors */ }
      // Don't respond to the customer at all — silent block
      return new Response(JSON.stringify({ success: false, reason: "subscription_inactive" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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

    const isPetNiche = ["petshop", "veterinaria"].includes(shopConfig.niche || "petshop");

    const statusPtBr: Record<string, string> = {
      pending: "pendente",
      confirmed: "confirmado",
      completed: "concluído",
      cancelled: "cancelado",
    };
    const translateStatus = (s: string) => statusPtBr[s] || s;

    const existingAppointments = (appointments || [])
      .map((a: any) => isPetNiche
        ? `${a.date} ${a.time} - ${a.service} (${a.pet_name}/${a.owner_name}, tel: ${a.owner_phone}, status: ${translateStatus(a.status)})`
        : `${a.date} ${a.time} - ${a.service} (${a.owner_name}, tel: ${a.owner_phone}, status: ${translateStatus(a.status)})`)
      .join("\n");

    const customerAppointments = (appointments || []).filter((a: any) => a.owner_phone?.replace(/\D/g, "").endsWith(cleanPhone.slice(-8)));
    const customerApptsText = customerAppointments.length > 0
      ? customerAppointments.map((a: any) => isPetNiche
        ? `- ${a.date} às ${a.time}: ${a.service} (pet: ${a.pet_name}, status: ${translateStatus(a.status)})`
        : `- ${a.date} às ${a.time}: ${a.service} (status: ${translateStatus(a.status)})`).join("\n")
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

    const ownerName = pastCustomerAppts[0]?.owner_name || customerAppointments[0]?.owner_name || null;
    const favoriteServices = [...new Set(pastCustomerAppts.map((a: any) => a.service))];
    const totalVisits = pastCustomerAppts.length;

    let longTermMemory = "";
    if (totalVisits > 0) {
      if (isPetNiche) {
        const petNames = [...new Set(pastCustomerAppts.map((a: any) => a.pet_name).filter((n: string) => n && n !== "—"))];
        longTermMemory = `\nMEMÓRIA DO CLIENTE (telefone: ${cleanPhone}):
- Nome do tutor: ${ownerName || "Desconhecido"}
- Pets conhecidos: ${petNames.join(", ") || "Nenhum"}
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
      } else {
        longTermMemory = `\nMEMÓRIA DO CLIENTE (telefone: ${cleanPhone}):
- Nome: ${ownerName || "Desconhecido"}
- Serviços já utilizados: ${favoriteServices.join(", ")}
- Total de visitas anteriores: ${totalVisits}
- Últimas visitas:
${pastCustomerAppts.slice(0, 5).map((a: any) => `  · ${a.date} - ${a.service}${a.notes ? ` [obs: ${a.notes}]` : ""}`).join("\n")}

USE ESSAS INFORMAÇÕES para personalizar o atendimento:
- Chame o cliente pelo nome se souber.
- Sugira serviços que já usou antes.
- Lembre de observações anteriores relevantes (ex: preferências).
- NÃO peça o nome novamente se já souber.`;
      }
    }

    const maxConcurrent = (shopConfig as any).max_concurrent_appointments || 1;
    const availableSlots = computeAvailableSlots(
      shopConfig.business_hours,
      appointments || [],
      maxConcurrent,
      shopConfig.services
    );

    const systemPrompt = buildSystemPrompt(shopConfig, cleanPhone, existingAppointments, customerApptsText, availableSlots, maxConcurrent) + longTermMemory;

    // Build messages array with history
    const aiMessages: { role: string; content: string }[] = [
      { role: "system", content: systemPrompt },
      ...conversationHistory,
    ];

    // Call AI
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY not configured");
      // Send a graceful fallback message instead of exposing the error
      const fallbackMsg = `Olá! No momento estou com uma instabilidade temporária. Por favor, tente novamente em alguns minutinhos! 🐾`;
      await sendWhatsAppMessage(instanceName, senderPhone, fallbackMsg);
      await saveMessage(serviceClient, shopConfig.user_id, cleanPhone, "assistant", fallbackMsg);
      return new Response(JSON.stringify({ success: true, reply: fallbackMsg }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiStartTime = Date.now();

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "openai/gpt-5-mini",
        messages: aiMessages,
        max_completion_tokens: 4096,
      }),
    });

    const aiResponseTimeMs = Date.now() - aiStartTime;
    console.log(`AI response time: ${aiResponseTimeMs}ms`);

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error("AI error:", aiResponse.status, errText);

      // Log error to admin_error_logs
      await serviceClient.from("admin_error_logs").insert({
        error_message: `AI error: ${aiResponse.status} - ${errText.substring(0, 500)}`,
        endpoint: "whatsapp-ai-handler",
        severity: "error",
        user_id: shopConfig.user_id,
      });

      // Generate alert if AI is consistently failing
      await serviceClient.from("system_alerts").insert({
        alert_type: "ai_error",
        severity: "error",
        message: `Erro na IA para instância ${instanceName}`,
        details: { status: aiResponse.status, user_id: shopConfig.user_id },
      });

      // Send a graceful fallback instead of exposing the error
      const fallbackMsg = `Olá! Estou com uma instabilidade temporária, mas já já volto! Tente novamente em alguns minutinhos 🐾`;
      await sendWhatsAppMessage(instanceName, senderPhone, fallbackMsg);
      await saveMessage(serviceClient, shopConfig.user_id, cleanPhone, "assistant", fallbackMsg);
      return new Response(JSON.stringify({ success: true, reply: fallbackMsg }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let aiData = await aiResponse.json();
    console.log("AI response structure:", JSON.stringify({
      choices_length: aiData.choices?.length,
      content_length: aiData.choices?.[0]?.message?.content?.length,
      content_preview: aiData.choices?.[0]?.message?.content?.substring(0, 200),
      finish_reason: aiData.choices?.[0]?.finish_reason,
    }));
    
    let reply = aiData.choices?.[0]?.message?.content;
    
    // Helper: check if reply is only emojis/symbols (no actual text)
    const isEmojiOnly = (text: string | null | undefined): boolean => {
      if (!text) return true;
      // Remove action blocks, emojis, punctuation, whitespace — check if any letters remain
      const cleaned = text
        .replace(/<action>.*?<\/action>/gs, "")
        .replace(/[\p{Emoji_Presentation}\p{Emoji}\p{Extended_Pictographic}]/gu, "")
        .replace(/[\s\p{P}\p{S}]/gu, "")
        .trim();
      return cleaned.length === 0;
    };

    // Retry with alternative model if response is empty or emoji-only
    // IMPORTANT: emoji-only responses with action blocks are also retried because
    // the AI is likely confused (e.g., sending "confirm" when user asked for a new booking)
    if (!reply || reply.trim() === "" || isEmojiOnly(reply)) {
      console.warn("Empty or emoji-only AI reply (stripping any action blocks), retrying with openai/gpt-5-mini...", JSON.stringify({ content_preview: reply?.substring(0, 200) }));
      
      // Strip any action blocks from the confused response to prevent wrong actions
      const strippedReply = reply?.replace(/<action>.*?<\/action>/gs, "").trim();
      console.warn("Empty or emoji-only AI reply, retrying with openai/gpt-5-mini...", JSON.stringify({ content_preview: reply?.substring(0, 100) }));
      
      // Build retry messages with an extra reinforcement instruction
      const retryMessages = [
        ...aiMessages,
        { role: "user", content: "INSTRUÇÃO DO SISTEMA: Sua última resposta continha apenas emojis. Responda OBRIGATORIAMENTE com TEXTO ESCRITO em português. Repita a resposta ao cliente usando palavras, não apenas emojis." },
      ];
      
      const retryResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "openai/gpt-5-nano",
          messages: retryMessages,
          max_completion_tokens: 4096,
        }),
      });

      if (retryResponse.ok) {
        const retryData = await retryResponse.json();
        const retryReply = retryData.choices?.[0]?.message?.content;
        console.log("Retry response length:", retryReply?.length);
        if (retryReply && retryReply.trim() !== "" && !isEmojiOnly(retryReply)) {
          reply = retryReply;
          aiData = retryData;
          console.log("Retry succeeded with openai/gpt-5-mini");
        }
      }
    }

    // Final fallback if still empty or emoji-only after retry
    if (!reply || reply.trim() === "" || isEmojiOnly(reply)) {
      console.error("Empty AI reply after retry. Full response:", JSON.stringify(aiData).substring(0, 1000));
      await serviceClient.from("admin_error_logs").insert({
        error_message: `Resposta vazia da IA (após retry) para instância ${instanceName}`,
        endpoint: "whatsapp-ai-handler",
        severity: "error",
        user_id: shopConfig.user_id,
        stack_trace: JSON.stringify(aiData).substring(0, 500),
      });
      const fallbackMsg = `Olá! Tive uma dificuldade técnica, mas pode repetir sua mensagem que vou te atender! 😊`;
      await sendWhatsAppMessage(instanceName, senderPhone, fallbackMsg);
      await saveMessage(serviceClient, shopConfig.user_id, cleanPhone, "assistant", fallbackMsg);
      return new Response(JSON.stringify({ success: true, reply: fallbackMsg }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Track AI usage with latency
    const tokensUsed = aiData.usage?.total_tokens || 0;
    await serviceClient.from("ai_usage").insert({
      user_id: shopConfig.user_id,
      tokens_used: tokensUsed,
      request_type: "whatsapp_chat",
      model: "gpt-5-mini",
      response_time_ms: aiResponseTimeMs,
    });

    // Alert if response time is too high (> 15 seconds)
    if (aiResponseTimeMs > 15000) {
      await serviceClient.from("system_alerts").insert({
        alert_type: "high_latency",
        severity: "warning",
        message: `Latência alta da IA: ${aiResponseTimeMs}ms`,
        details: { response_time_ms: aiResponseTimeMs, instance: instanceName, user_id: shopConfig.user_id },
      });
    }

    const lastAssistantMessage = await getLatestAssistantMessage(
      serviceClient,
      shopConfig.user_id,
      cleanPhone
    );

    // Guardrail 1: never send more than one question in a single message
    reply = enforceSingleQuestionPerReply(reply);

    // Guardrail 2: never send a question right after another assistant question
    if (shouldSuppressRepeatedQuestion(lastAssistantMessage, reply) || shouldSuppressConsecutiveQuestion(lastAssistantMessage, reply)) {
      console.log("Suppressing consecutive question in AI reply");
      reply = removeRepeatedQuestion(reply);
    }

    // Process actions (create/cancel/reschedule/confirm)
    reply = await processAction(serviceClient, shopConfig, cleanPhone, reply);

    // Re-check against latest persisted assistant message to avoid race conditions
    const latestAssistantBeforeSend = await getLatestAssistantMessage(
      serviceClient,
      shopConfig.user_id,
      cleanPhone
    );
    if (shouldSuppressConsecutiveQuestion(latestAssistantBeforeSend, reply)) {
      console.log("Suppressing race-condition consecutive question in AI reply");
      reply = removeRepeatedQuestion(reply);
    }

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
    // Log silently, never expose internal errors to WhatsApp customers
    try {
      const svcClient = getServiceClient();
      await svcClient.from("admin_error_logs").insert({
        error_message: `AI handler crash: ${String(err)}`,
        endpoint: "whatsapp-ai-handler",
        severity: "critical",
      });
    } catch { /* ignore */ }
    return new Response(JSON.stringify({ success: false }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
