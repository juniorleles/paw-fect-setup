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
  // Use fixed UTC-3 offset for BRT (Brazil abolished DST in 2019)
  const now = new Date();
  const brTimestamp = now.getTime() - 3 * 60 * 60 * 1000;
  const brNow = new Date(brTimestamp);
  const todayStr = brNow.toISOString().split("T")[0];
  const currentHour = brNow.getUTCHours();
  const currentMin = brNow.getUTCMinutes();

  console.log(`[AVAILABILITY] UTC now: ${now.toISOString()}, BR now: ${brNow.toISOString()}, currentHour: ${currentHour}, currentMin: ${currentMin}, todayStr: ${todayStr}`);

  const dayNames = ["Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"];

  const slotInterval = 30;

  const lines: string[] = [];

  for (let d = 0; d < daysAhead; d++) {
    const date = new Date(brNow);
    date.setUTCDate(date.getUTCDate() + d);
    const dateStr = date.toISOString().split("T")[0];
    const weekday = dayNames[date.getUTCDay()];

    const daySchedule = businessHours.find((h: any) => h.day === weekday);
    if (!daySchedule || !daySchedule.isOpen) continue;
    console.log(`[AVAILABILITY] ${weekday} ${dateStr}: openTime=${daySchedule.openTime}, closeTime=${daySchedule.closeTime}, d=${d}`);

    const [openH, openM] = daySchedule.openTime.split(":").map(Number);
    const [closeH, closeM] = daySchedule.closeTime.split(":").map(Number);

    // Build occupancy map considering service durations
    const occupancy = buildOccupancyMap(dateStr, appointments, services, slotInterval);

    // Generate all slot times for this day
    const allDaySlots: string[] = [];
    {
      let sh = openH, sm = openM;
      while (sh < closeH || (sh === closeH && sm < closeM)) {
        allDaySlots.push(`${String(sh).padStart(2, "0")}:${String(sm).padStart(2, "0")}`);
        sm += slotInterval;
        if (sm >= 60) { sh += Math.floor(sm / 60); sm = sm % 60; }
      }
    }

    // Get minimum service duration (in slots) to filter out slots that can't fit any service
    const minServiceDuration = Math.min(...(services as any[]).map((s: any) => s.duration || 30));
    const minServiceSlots = Math.max(1, Math.ceil(minServiceDuration / slotInterval));

    const freeSlots: string[] = [];
    for (let idx = 0; idx < allDaySlots.length; idx++) {
      const timeStr = allDaySlots[idx];
      const [h, m] = timeStr.split(":").map(Number);

      const isPast = d === 0 && (h < currentHour || (h === currentHour && m <= currentMin));
      if (isPast) continue;

      const booked = occupancy.get(timeStr) || 0;
      const available = maxConcurrent - booked;
      if (available <= 0) continue;

      // Check consecutive free slots from this position to determine max bookable duration
      let consecutiveFree = 0;
      for (let j = idx; j < allDaySlots.length; j++) {
        const slotBooked = occupancy.get(allDaySlots[j]) || 0;
        if (slotBooked < maxConcurrent) {
          consecutiveFree++;
        } else {
          break;
        }
      }

      // Only offer this slot if at least the minimum service duration fits
      if (consecutiveFree < minServiceSlots) continue;

      const maxFreeMin = consecutiveFree * slotInterval;
      if (maxConcurrent > 1) {
        freeSlots.push(`${timeStr} (${available}/${maxConcurrent} vagas, até ${maxFreeMin}min livre)`);
      } else {
        // Annotate with max free time so AI knows which services fit
        freeSlots.push(`${timeStr} (até ${maxFreeMin}min livre)`);
      }
    }

    console.log(`[AVAILABILITY] ${weekday} ${dateStr}: freeSlots=${freeSlots.length}, first=${freeSlots[0] || 'none'}, last=${freeSlots[freeSlots.length-1] || 'none'}`);
    if (freeSlots.length > 0) {
      lines.push(`${weekday} ${dateStr}: ${freeSlots.join(", ")}`);
    } else if (d === 0) {
      // Today with no available slots — check if it's because day is ending or truly booked
      const totalSlots = [];
      let sh = openH, sm = openM;
      while (sh < closeH || (sh === closeH && sm < closeM)) {
        totalSlots.push(`${String(sh).padStart(2, "0")}:${String(sm).padStart(2, "0")}`);
        sm += slotInterval;
        if (sm >= 60) { sh += Math.floor(sm / 60); sm = sm % 60; }
      }
      const futureSlots = totalSlots.filter(t => {
        const [th, tm] = t.split(":").map(Number);
        return th > currentHour || (th === currentHour && tm > currentMin);
      });
      if (futureSlots.length === 0) {
        lines.push(`${weekday} ${dateStr}: EXPEDIENTE ENCERRADO (horário de funcionamento já passou)`);
      } else {
        lines.push(`${weekday} ${dateStr}: LOTADO (todos os horários restantes estão ocupados)`);
      }
    } else {
      lines.push(`${weekday} ${dateStr}: LOTADO`);
    }
  }

  return lines.join("\n");
}

function filterAvailableSlotsForService(availableSlots: string, serviceDuration: number): string {
  if (!availableSlots || serviceDuration <= 30) return availableSlots;

  const lines = availableSlots
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const filteredLines = lines.map((line) => {
    if (/EXPEDIENTE ENCERRADO|LOTADO/i.test(line)) return line;

    const prefixMatch = line.match(/^([^:]+\s\d{4}-\d{2}-\d{2}):\s*/);
    if (!prefixMatch) return line;

    const dayPrefix = prefixMatch[1];
    const slotMatches = [...line.matchAll(/(\d{2}:\d{2}\s*\([^)]+\))/g)].map((m) => m[1]);

    const validSlots = slotMatches.filter((slot) => {
      const freeMinMatch = slot.match(/até\s*(\d+)min/i);
      if (!freeMinMatch) return true;
      return Number(freeMinMatch[1]) >= serviceDuration;
    });

    if (validSlots.length === 0) {
      return `${dayPrefix}: LOTADO`;
    }

    return `${dayPrefix}: ${validSlots.join(", ")}`;
  });

  return filteredLines.join("\n");
}

function getServiceClient() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );
}

// --- Structured Conversation State ---
// Persists booking flow progress so the AI never loses context.

interface ConversationState {
  step: string;       // greeting | service_selection | date_selection | time_selection | name_collection | confirming | post_booking
  service: string | null;
  date: string | null;
  time: string | null;
  client_name: string | null;
  pet_name: string | null;
  notes: string | null;
  extra: Record<string, any>;
}

const EMPTY_STATE: ConversationState = {
  step: "greeting",
  service: null,
  date: null,
  time: null,
  client_name: null,
  pet_name: null,
  notes: null,
  extra: {},
};

async function getConversationState(
  serviceClient: any,
  userId: string,
  phone: string
): Promise<ConversationState> {
  const { data } = await serviceClient
    .from("conversation_state")
    .select("step, service, date, time, client_name, pet_name, notes, extra")
    .eq("user_id", userId)
    .eq("phone", phone)
    .maybeSingle();

  if (!data) return { ...EMPTY_STATE };
  return {
    step: data.step || "greeting",
    service: data.service,
    date: data.date,
    time: data.time,
    client_name: data.client_name,
    pet_name: data.pet_name,
    notes: data.notes,
    extra: data.extra || {},
  };
}

async function updateConversationState(
  serviceClient: any,
  userId: string,
  phone: string,
  updates: Partial<ConversationState>
): Promise<void> {
  const row = {
    user_id: userId,
    phone,
    ...updates,
    updated_at: new Date().toISOString(),
  };
  await serviceClient
    .from("conversation_state")
    .upsert(row, { onConflict: "user_id,phone" });
}

async function clearConversationState(
  serviceClient: any,
  userId: string,
  phone: string
): Promise<void> {
  await serviceClient
    .from("conversation_state")
    .delete()
    .eq("user_id", userId)
    .eq("phone", phone);
}

// Infer conversation state updates from user message + context
function inferStateFromUserMessage(
  userMessage: string,
  currentState: ConversationState,
  services: any[],
  ownerName: string | null,
  conversationHistory: { role: string; content: string }[] = [],
  lastMentionedService: string | null = null,
): Partial<ConversationState> {
  const updates: Partial<ConversationState> = {};
  const userNorm = (userMessage || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

  // Detect service directly from user message
  let matchedService = inferServiceFromText(userMessage || "", services);

  // Fallback 1: explicit service already remembered by guardrail logic
  if (!matchedService && lastMentionedService) {
    matchedService = lastMentionedService;
  }

  // Fallback 2: recover service from recent assistant context (e.g. "seu serviço de Corte + Barba")
  if (!matchedService && conversationHistory.length > 0) {
    const lastAssistant = [...conversationHistory].reverse().find((m) => m.role === "assistant");
    if (lastAssistant?.content) {
      matchedService = inferServiceFromText(lastAssistant.content, services);
    }
  }

  // Fallback 3: keep previously known state service
  if (!matchedService && currentState.service) {
    matchedService = currentState.service;
  }

  if (matchedService) {
    updates.service = matchedService;
    if (currentState.step === "greeting" || currentState.step === "service_selection") {
      updates.step = "date_selection";
    }
  }

  // Detect date
  if (/\bamanha\b/i.test(userNorm)) {
    const tomorrow = new Date(Date.now() - 3 * 60 * 60 * 1000 + 24 * 60 * 60 * 1000);
    updates.date = tomorrow.toISOString().split("T")[0];
    if (!updates.step) updates.step = (currentState.service || updates.service) ? "time_selection" : currentState.step;
  } else if (/\bhoje\b/i.test(userNorm)) {
    const today = new Date(Date.now() - 3 * 60 * 60 * 1000);
    updates.date = today.toISOString().split("T")[0];
    if (!updates.step) updates.step = (currentState.service || updates.service) ? "time_selection" : currentState.step;
  } else {
    const weekdays: Record<string, number> = { domingo: 0, segunda: 1, terca: 2, quarta: 3, quinta: 4, sexta: 5, sabado: 6 };
    for (const [name, dayNum] of Object.entries(weekdays)) {
      if (userNorm.includes(name)) {
        const brNow = new Date(Date.now() - 3 * 60 * 60 * 1000);
        const diff = ((dayNum - brNow.getUTCDay()) + 7) % 7 || 7;
        const target = new Date(brNow.getTime() + diff * 24 * 60 * 60 * 1000);
        updates.date = target.toISOString().split("T")[0];
        if (!updates.step) updates.step = (currentState.service || updates.service) ? "time_selection" : currentState.step;
        break;
      }
    }
  }

  // Detect time (supports flexible formats like 8:0, 8h, às 8)
  const parsedTime = parseFlexibleTimeFromMessage(userMessage || "");
  if (parsedTime) {
    updates.time = parsedTime;
    updates.step = "name_collection";
  }

  // Detect name (simple heuristic: short message after AI asked for name)
  const namePatterns = userMessage.match(/(?:meu nome [eé]|me chamo|sou o|sou a|pode me chamar de)\s+(\w+)/i);
  if (namePatterns) {
    updates.client_name = namePatterns[1];
    updates.step = "confirming";
  }

  // If ownerName is known from memory and not yet in state
  if (ownerName && !currentState.client_name && !updates.client_name) {
    updates.client_name = ownerName;
  }

  // If we have all info, advance to confirming
  if ((currentState.service || updates.service) && (currentState.date || updates.date) && (currentState.time || updates.time) && (currentState.client_name || updates.client_name)) {
    updates.step = "confirming";
  }

  return updates;
}

// After successful booking, mark state as post_booking
function stateAfterBooking(): Partial<ConversationState> {
  return {
    step: "post_booking",
    service: null,
    date: null,
    time: null,
    notes: null,
  };
}

// Build state context string for injection into system prompt
function buildStateContext(state: ConversationState): string {
  if (state.step === "greeting") return "";

  const lines: string[] = [];
  lines.push("\n\n=== ESTADO ATUAL DA CONVERSA (ESTRUTURADO) ===");
  lines.push(`Etapa: ${state.step}`);
  if (state.service) lines.push(`Serviço escolhido: ${state.service}`);
  if (state.date) {
    const [y, m, d] = state.date.split("-");
    lines.push(`Data escolhida: ${d}/${m}/${y}`);
  }
  if (state.time) lines.push(`Horário escolhido: ${state.time}`);
  if (state.client_name) lines.push(`Nome do cliente: ${state.client_name}`);
  if (state.pet_name) lines.push(`Nome do pet: ${state.pet_name}`);

  const missing: string[] = [];
  if (!state.service) missing.push("serviço");
  if (!state.date) missing.push("data");
  if (!state.time) missing.push("horário");
  if (!state.client_name) missing.push("nome do cliente");

  if (missing.length > 0) {
    lines.push(`INFORMAÇÕES FALTANTES: ${missing.join(", ")}`);
    lines.push("REGRA: Pergunte APENAS o que está faltando. NÃO peça informações que já estão preenchidas acima.");
  } else {
    lines.push("TODAS as informações estão completas. Confirme o agendamento AUTOMATICAMENTE com o bloco <action>.");
  }
  lines.push("=== FIM DO ESTADO ===");

  return lines.join("\n");
}

// Build a concise summary of the last 3 conversation turns to prevent context loss
function buildConversationSummary(history: { role: string; content: string }[]): string {
  if (!history || history.length < 2) return "";

  // Get last 6 messages (3 turns = 3 user + 3 assistant max)
  const recent = history.slice(-6);

  const summaryLines: string[] = [];
  summaryLines.push("\n\n=== RESUMO DOS ÚLTIMOS TURNOS DA CONVERSA ===");

  for (const msg of recent) {
    const label = msg.role === "user" ? "CLIENTE" : "VOCÊ (IA)";
    // Truncate long messages to 150 chars for the summary
    const content = (msg.content || "").replace(/<action>.*?<\/action>/gs, "[AÇÃO DE AGENDAMENTO]").trim();
    const truncated = content.length > 150 ? content.substring(0, 150) + "..." : content;
    summaryLines.push(`${label}: ${truncated}`);
  }

  summaryLines.push("=== FIM DO RESUMO ===");
  summaryLines.push("REGRA: Use este resumo para manter o contexto. NÃO repita perguntas que já foram respondidas acima. Continue o fluxo de onde parou.");

  return summaryLines.join("\n");
}

function parseFlexibleTimeFromMessage(text: string): string | null {
  const normalized = (text || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

  const exact = normalized.match(/\b([01]?\d|2[0-3]):([0-5]?\d)\b/);
  if (exact) {
    const hh = exact[1].padStart(2, "0");
    const mm = exact[2].padStart(2, "0");
    return `${hh}:${mm}`;
  }

  const hourWithAs = normalized.match(/(?:\bas\s*)([01]?\d|2[0-3])\b/);
  if (hourWithAs) return `${hourWithAs[1].padStart(2, "0")}:00`;

  const hourWithH = normalized.match(/\b([01]?\d|2[0-3])h\b/);
  if (hourWithH) return `${hourWithH[1].padStart(2, "0")}:00`;

  return null;
}

function inferServiceFromText(text: string, services: any[]): string | null {
  const normalize = (value: string) => (value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();

  const normalizeConnectors = (value: string) =>
    normalize(value).replace(/\b(e)\b/g, "+").replace(/\s*\+\s*/g, " + ");

  const normalizedText = normalize(text || "");
  const connectorText = normalizeConnectors(text || "");

  const serviceList = (services || [])
    .map((s: any) => ({
      original: s?.name || "",
      normalized: normalize(s?.name || ""),
      withConnectors: normalizeConnectors(s?.name || ""),
    }))
    .filter((s: any) => s.normalized.length > 1)
    .sort((a: any, b: any) => b.normalized.length - a.normalized.length);

  const found = serviceList.find((s: any) =>
    normalizedText.includes(s.normalized) || connectorText.includes(s.withConnectors)
  );

  if (found?.original) return found.original;

  // Heuristic for barbershop combined requests like "barba e cabelo"
  const mentionsBarba = /\bbarba\b/.test(normalizedText);
  const mentionsHair = /\b(cabelo|corte)\b/.test(normalizedText);
  if (mentionsBarba && mentionsHair) {
    const combined = serviceList.find((s: any) => /barba/.test(s.normalized) && /corte|cabelo/.test(s.normalized));
    if (combined?.original) return combined.original;
  }

  return null;
}

// Sanitize leaked system instructions from AI reply
function sanitizeLeakedInstructions(reply: string): string {
  if (!reply) return reply;
  // Remove lines that look like leaked system instructions
  const leakedPatterns = [
    /^leia o hist[oó]rico.*$/gim,
    /^lembrete:?\s.*$/gim,
    /^regra:?\s.*$/gim,
    /^instru[cç][aãõ]o:?\s.*$/gim,
    /^n[aã]o (cumprim|repita|pe[cç]a).*$/gim,
    /^responda\s+diretamente.*$/gim,
    /^obrigad[ao]\.?\s*$/gim,
    /^use\s+(este|esse|essas)\s+(resumo|informa[cç][oõ]es).*$/gim,
    /^continue\s+o\s+fluxo.*$/gim,
  ];

  let cleaned = reply;
  for (const pattern of leakedPatterns) {
    cleaned = cleaned.replace(pattern, "");
  }

  // Clean up multiple blank lines left by removals
  cleaned = cleaned.replace(/\n{3,}/g, "\n\n").trim();

  if (cleaned.length < 5 && reply.length > 5) {
    // If sanitization removed almost everything, return original minus first leaked line
    const lines = reply.split("\n").filter(l => !/^(leia|lembrete|regra|instru)/i.test(l.trim()));
    return lines.join("\n").trim() || reply;
  }

  return cleaned;
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

function isBookingFlowContext(userMessage: string, reply: string): boolean {
  const bookingIntent = /(agendar|agendamento|marcar|quero\s+(fazer|cortar|agendar|marcar|manicure|pedicure|escova|banho|tosa)|gostaria\s+de\s+agendar|quero\s+\w+\s+(segunda|terça|quarta|quinta|sexta|s[aá]bado|domingo|amanh[aã]|hoje))/i.test(userMessage || "");
  // Detect standalone date/time references and corrections (e.g. "amanhã", "ops amanhã", "segunda", "10h")
  const dateTimeReference = /\b(amanh[aã]|hoje|segunda|terça|ter[cç]a|quarta|quinta|sexta|s[aá]bado|domingo|\d{1,2}[h:]|\d{1,2}:\d{2})\b/i.test(userMessage || "") || /[àa]s\s+\d{1,2}/i.test((userMessage || "").normalize("NFD").replace(/[\u0300-\u036f]/g, ""));
  const schedulingReply = /(hor[aá]rios?\s+dispon[ií]veis?|qual\s+hor[aá]rio\s+voc[eê]\s+prefere|pra\s+qual\s+dia\s+e\s+hor[aá]rio|qual\s+dia\s+e\s+hor[aá]rio)/i.test(reply || "");
  // Detect if the reply asks for the client's name (part of booking flow)
  const askingName = /(qual\s+(seu|o\s+seu)\s+nome|me\s+diz\s+(seu|o\s+seu)\s+nome|como\s+voc[eê]\s+se\s+chama|pra\s+eu\s+finalizar.*nome)/i.test(reply || "");
  return bookingIntent || dateTimeReference || schedulingReply || askingName;
}

function enforceBookingDateTimeQuestion(userMessage: string, reply: string): string {
  if (!reply || /<action>.*?<\/action>/s.test(reply)) return reply;

  if (!isBookingFlowContext(userMessage, reply)) return reply;

  const hasQuestion = /\?/.test(reply);
  if (hasQuestion) return reply;

  // If user already provided a time/date, do NOT ask again
  const userNorm = (userMessage || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const userAlreadyProvidedTime = /\b([01]?\d|2[0-3])[:h]([0-5]\d)?\b/.test(userNorm) || /[àa]s\s+\d{1,2}/i.test(userNorm);
  const userAlreadyProvidedDate = /\b(amanh[aã]|hoje|segunda|terca|ter[cç]a|quarta|quinta|sexta|s[aá]bado|domingo|\d{1,2}\/\d{1,2})\b/i.test(userNorm);

  if (userAlreadyProvidedTime) {
    console.log("[BookingGuard] User already provided time, skipping date/time question append");
    return reply;
  }

  const listsAvailableTimes = /hor[aá]rios?\s+dispon[ií]veis?/i.test(reply);
  if (listsAvailableTimes) {
    return `${reply.trim()}\nQual horário você prefere?`;
  }

  // If user provided date but no time, ask only for time
  if (userAlreadyProvidedDate) {
    return `${reply.trim()}\nQual horário você prefere?`;
  }

  return `${reply.trim()}\nPra qual dia e horário você quer agendar?`;
}

function buildSuggestedTimeOptionsFromAvailability(
  availableSlots: string,
  maxSuggestions = 6,
  preferredDayKeyword?: string,
): { dayLabel: string; times: string[] } | null {
  if (!availableSlots) return null;

  const normalize = (text: string) =>
    (text || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();

  const lines = availableSlots
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  const parsedOptions: { dayLabel: string; dayLabelNormalized: string; times: string[] }[] = [];

  for (const line of lines) {
    if (/EXPEDIENTE ENCERRADO|LOTADO/i.test(line)) continue;

    const dayPrefixMatch = line.match(/^([^:]+):/);
    if (!dayPrefixMatch) continue;

    const timesWithMeta = [...line.matchAll(/(\d{2}:\d{2})\s*\([^)]+\)/g)].map((m) => m[1]);
    const plainTimes = [...line.matchAll(/\b(\d{2}:\d{2})\b/g)].map((m) => m[1]);
    const times = [...new Set((timesWithMeta.length > 0 ? timesWithMeta : plainTimes))].slice(0, maxSuggestions);

    if (times.length === 0) continue;

    const dayLabelRaw = dayPrefixMatch[1].trim();
    const dateIsoMatch = dayLabelRaw.match(/(\d{4}-\d{2}-\d{2})/);
    const dayName = dayLabelRaw.replace(/\d{4}-\d{2}-\d{2}/, "").trim();

    let dayLabel = dayLabelRaw;
    if (dateIsoMatch) {
      const [y, m, d] = dateIsoMatch[1].split("-");
      dayLabel = `${dayName} (${d}/${m}/${y})`.trim();
    }

    parsedOptions.push({
      dayLabel,
      dayLabelNormalized: normalize(dayLabel),
      times,
    });
  }

  if (parsedOptions.length === 0) return null;

  if (preferredDayKeyword) {
    const preferredNormalized = normalize(preferredDayKeyword);
    const preferred = parsedOptions.find((opt) => opt.dayLabelNormalized.includes(preferredNormalized));
    if (preferred) {
      return { dayLabel: preferred.dayLabel, times: preferred.times };
    }
  }

  const first = parsedOptions[0];
  return { dayLabel: first.dayLabel, times: first.times };
}

// Guardrail: if user explicitly wants to book but AI deflects to a generic question,
// force continuation of booking flow deterministically.
function enforceBookingIntentContinuation(
  userMessage: string,
  reply: string,
  services: any[],
  knownService: string | null,
  availableSlots: string,
): string {
  if (!reply || /<action>.*?<\/action>/s.test(reply)) return reply;

  const userNorm = (userMessage || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const replyNorm = (reply || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

  const userHasBookingIntent = /(quero|gostaria|preciso|pode|vamos).*(agendar|marcar)|\bagendar\b|\bmarcar\b/.test(userNorm);
  const userHasDateOrTimeSignal = /\b(amanha|hoje|segunda|terca|quarta|quinta|sexta|sabado|domingo|\d{1,2}\/\d{1,2}|\d{4}-\d{2}-\d{2}|([01]?\d|2[0-3])[:h]([0-5]\d)?)\b/.test(userNorm)
    || /[àa]s\s+\d{1,2}/i.test(userNorm);
  const hasKnownBookingContext = !!knownService;

  const shouldContinueBooking = userHasBookingIntent || (hasKnownBookingContext && userHasDateOrTimeSignal);
  if (!shouldContinueBooking) return reply;

  const isGenericDeflection = /(o\s+que\s+.*deseja\s+fazer|como\s+posso\s+ajudar|em\s+que\s+posso\s+ajudar|como\s+posso\s+auxili(?:ar|a\-?lo|a\-?la|a\-?los|a\-?las)|como\s+(?:o\s+senhor\s+|a\s+senhora\s+|voce\s+|vc\s+)?(?:gostaria|deseja)\s+de?\s*prosseguir|estou\s+a\s+disposicao)/.test(replyNorm);
  if (!isGenericDeflection) return reply;

  const inferredService = inferServiceFromText(userMessage, services) || knownService;

  const preferredDayKeyword = (() => {
    if (/\bsegunda\b/.test(userNorm)) return "segunda";
    if (/\bterca\b/.test(userNorm)) return "terça";
    if (/\bquarta\b/.test(userNorm)) return "quarta";
    if (/\bquinta\b/.test(userNorm)) return "quinta";
    if (/\bsexta\b/.test(userNorm)) return "sexta";
    if (/\bsabado\b/.test(userNorm)) return "sábado";
    if (/\bdomingo\b/.test(userNorm)) return "domingo";
    return undefined;
  })();

  const suggestions = buildSuggestedTimeOptionsFromAvailability(availableSlots, 6, preferredDayKeyword);

  console.log(`[BookingContinuationGuard] Overriding generic deflection. inferredService=${inferredService || "none"}, hasSuggestions=${!!suggestions}, preferredDay=${preferredDayKeyword || "none"}`);

  if (suggestions) {
    const intro = inferredService
      ? `Perfeito! Vamos agendar ${inferredService} ✅`
      : "Perfeito! Vamos agendar ✅";
    const slotsText = suggestions.times.map((t) => `• ${t}`).join("\n");
    return `${intro}\nSeguem algumas sugestões de horários para ${suggestions.dayLabel}:\n${slotsText}\nQual horário você prefere?`;
  }

  if (inferredService) {
    return `Perfeito! Vamos agendar ${inferredService} ✅ Me diz o melhor dia e horário pra você.`;
  }

  return "Perfeito! Vamos agendar ✅ Me confirma qual serviço e o melhor dia/horário pra você.";
}

// Guardrail: If user already provided a specific time but AI reply re-asks for time, strip the redundant question
function enforceNoRedundantTimeQuestion(userMessage: string, reply: string, conversationHistory?: { role: string; content: string }[]): string {
  if (!reply || /<action>.*?<\/action>/s.test(reply)) return reply;

  const userNorm = (userMessage || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

  // Check if user explicitly provided a time (e.g., "às 13:00", "13h", "quero às 14:00")
  const userProvidedExactTime = /\b([01]?\d|2[0-3])[:h]([0-5]\d)?\b/.test(userNorm) || /[àa]s\s+\d{1,2}/i.test(userNorm);
  if (!userProvidedExactTime) return reply;

  // Check if the AI reply asks for time again
  const replyNorm = (reply || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const asksForTimeAgain = /(qual\s+hor[aá]rio\s+(voce|o\s+senhor|a\s+senhora|vc)\s+prefere|qual\s+hor[aá]rio\s+prefere|qual\s+hor[aá]rio\s+deseja|que\s+horas\s+(voce|vc)\s+(quer|prefere|deseja)|qual\s+hor[aá]rio\s+gostaria)/i.test(replyNorm);

  if (!asksForTimeAgain) return reply;

  console.log(`[TimeQuestionGuard] User already provided time in "${userMessage}" but AI re-asked for time. Stripping redundant question.`);

  // Extract the time the user chose
  let chosenTime: string | null = null;
  const exactMatch = userNorm.match(/\b([01]?\d|2[0-3])[:h]([0-5]\d)\b/);
  if (exactMatch) {
    chosenTime = `${exactMatch[1].padStart(2, "0")}:${exactMatch[2]}`;
  } else {
    const hourMatch = userNorm.match(/(?:as\s*)([01]?\d|2[0-3])/);
    if (hourMatch) {
      chosenTime = `${hourMatch[1].padStart(2, "0")}:00`;
    }
  }

  // Check if the chosen time appears in the last assistant message's available slots
  if (chosenTime && conversationHistory) {
    const lastAssistant = [...conversationHistory].reverse().find((m) => m.role === "assistant");
    if (lastAssistant) {
      const availableSlots = (lastAssistant.content || "").match(/\b([01]\d|2[0-3]):[0-5]\d\b/g) || [];
      if (availableSlots.includes(chosenTime)) {
        // Time is valid — remove the redundant question lines and let the AI process the booking
        const lines = reply.split("\n");
        const cleaned = lines.filter((line) => {
          const lineNorm = line.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
          return !/(qual\s+hor[aá]rio|que\s+horas|temos\s+disponibilidade)/i.test(lineNorm);
        });
        const result = cleaned.join("\n").trim();
        if (result && result.length > 3) {
          console.log(`[TimeQuestionGuard] Cleaned reply, keeping: "${result.substring(0, 100)}"`);
          return result;
        }
        // If cleaning removed everything, return acknowledgment without re-asking
        return `Perfeito, anotado o horário das ${chosenTime}! Vou confirmar o agendamento.`;
      }
    }
  }

  // Fallback: just strip the time question
  const lines = reply.split("\n");
  const cleaned = lines.filter((line) => {
    const lineNorm = line.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    return !/(qual\s+hor[aá]rio|que\s+horas)/i.test(lineNorm);
  });
  const result = cleaned.join("\n").trim();
  return result || reply;
}

function normalizeGuardText(text: string): string {
  return (text || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function detectAdditionalBookingIntent(userMessage: string): boolean {
  const userNorm = normalizeGuardText(userMessage);
  return /((agendar|marcar).*(mais\s+(um|uma|dois|duas|tres)|outro|de novo)|\bmais\s+(um|uma|dois|duas|tres)\s+(corte|banho|tosa|servico|horario|agendamento|pet))/i.test(userNorm);
}

function detectDateOrTimeSignal(userMessage: string): boolean {
  const userNorm = normalizeGuardText(userMessage);
  return /\b(amanha|hoje|segunda|terca|quarta|quinta|sexta|sabado|domingo|\d{1,2}\/\d{1,2}|\d{4}-\d{2}-\d{2}|([01]?\d|2[0-3])[:h]([0-5]\d)?)\b/i.test(userNorm)
    || /[àa]s\s+\d{1,2}/i.test(userNorm);
}

// Deterministic date correction: if user says "amanhã" but AI used today's date, fix it
function enforceDateCorrectionGuard(userMessage: string, reply: string): string {
  if (!reply) return reply;
  const userNorm = normalizeGuardText(userMessage);
  const saysAmanha = /\bamanha\b/i.test(userNorm);
  if (!saysAmanha) return reply;

  // Calculate BRT dates
  const now = new Date();
  const brTimestamp = now.getTime() - 3 * 60 * 60 * 1000;
  const brNow = new Date(brTimestamp);
  const todayISO = brNow.toISOString().split("T")[0]; // e.g. 2026-03-02

  const tomorrowDate = new Date(brTimestamp + 24 * 60 * 60 * 1000);
  const tomorrowISO = tomorrowDate.toISOString().split("T")[0]; // e.g. 2026-03-03

  // Today in DD/MM format
  const [tY, tM, tD] = todayISO.split("-");
  const todayDDMM = `${tD}/${tM}`;
  const todayDDMMYYYY = `${tD}/${tM}/${tY}`;
  const [tmY, tmM, tmD] = tomorrowISO.split("-");
  const tomorrowDDMM = `${tmD}/${tmM}`;
  const tomorrowDDMMYYYY = `${tmD}/${tmM}/${tmY}`;

  // Check if reply or action block contains today's date when it should be tomorrow
  if (reply.includes(todayISO) || reply.includes(todayDDMMYYYY) || reply.includes(todayDDMM)) {
    console.log(`[DateGuard] User said "amanhã" but AI used today (${todayISO}). Correcting to ${tomorrowISO}`);
    // Replace all occurrences of today's date with tomorrow's
    let corrected = reply
      .replaceAll(todayISO, tomorrowISO)
      .replaceAll(todayDDMMYYYY, tomorrowDDMMYYYY)
      .replaceAll(todayDDMM, tomorrowDDMM);

    // Also fix "hoje" → "amanhã" in the text (but not inside action blocks)
    const actionBlock = corrected.match(/<action>.*?<\/action>/s)?.[0] || "";
    const textOnly = corrected.replace(/<action>.*?<\/action>/s, "___ACTION___");
    const fixedText = textOnly
      .replace(/\bhoje\b/gi, "amanhã")
      .replace(/___ACTION___/, actionBlock);
    return fixedText;
  }

  return reply;
}

function enforceAdditionalBookingIntentGuard(userMessage: string, reply: string, lastAssistantMessage: string): string {
  if (!reply) return reply;

  const isAdditionalIntent = detectAdditionalBookingIntent(userMessage);
  if (!isAdditionalIntent) return reply;

  const hasDateOrTimeInUserMessage = detectDateOrTimeSignal(userMessage);

  // Definitive deterministic guard: for "mais um" without explicit new slot,
  // NEVER keep confirmation text from model/fallback, always ask for new date/time.
  if (!hasDateOrTimeInUserMessage) {
    return "Perfeito! Vamos agendar mais um ✅\nPra qual dia e horário você quer esse próximo agendamento?";
  }

  const actionMatch = reply.match(/<action>(.*?)<\/action>/s);
  if (!actionMatch) return reply;

  let action: any = null;
  try {
    action = JSON.parse(actionMatch[1]);
  } catch {
    return reply;
  }

  if (action?.type !== "create") return reply;

  const lastTime = (lastAssistantMessage || "").match(/\b([01]\d|2[0-3]):[0-5]\d\b/)?.[0] || null;
  const actionTime = typeof action.time === "string" ? action.time.slice(0, 5) : null;
  if (lastTime && actionTime && lastTime === actionTime) {
    return "Esse horário acabou de ser usado no agendamento anterior e ficou indisponível para este novo pedido.\nMe diga outro dia e horário que eu te confirmo agora ✅";
  }

  return reply;
}

function enforceKnownServiceNoRedundantQuestion(
  userMessage: string,
  reply: string,
  services: any[],
  conversationHistory?: { role: string; content: string }[],
  knownServiceHint?: string | null,
): string {
  if (!reply || /<action>.*?<\/action>/s.test(reply)) return reply;

  const normalize = (text: string) => text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();

  // Normalize connectors so "corte e barba" matches "Corte + Barba"
  const normalizeConnectors = (text: string) =>
    normalize(text).replace(/\b(e)\b/g, "+").replace(/\s*\+\s*/g, " + ");

  const normalizedUserMessage = normalize(userMessage || "");
  const connectorUserMessage = normalizeConnectors(userMessage || "");
  const normalizedReply = normalize(reply || "");

  const serviceList = (services || [])
    .map((s: any) => ({
      original: s?.name || "",
      normalized: normalize(s?.name || ""),
      withConnectors: normalizeConnectors(s?.name || ""),
    }))
    .filter((s: { original: string; normalized: string }) => s.normalized.length > 1)
    .sort((a: { normalized: string }, b: { normalized: string }) => b.normalized.length - a.normalized.length);

  const findServiceIn = (text: string) => {
    const norm = normalize(text);
    const conn = normalizeConnectors(text);
    return serviceList.find((s: { original: string; normalized: string; withConnectors: string }) =>
      norm.includes(s.normalized) || conn.includes(s.withConnectors)
    )?.original;
  };

  let matchedService = findServiceIn(userMessage || "");

  if (!matchedService && knownServiceHint) {
    const normalizedKnownService = normalize(knownServiceHint);
    matchedService = serviceList.find((s: { original: string; normalized: string }) => s.normalized === normalizedKnownService)?.original || knownServiceHint;
  }

  if (!matchedService && conversationHistory) {
    const recentMessages = conversationHistory.slice(-12);

    for (const msg of [...recentMessages].reverse()) {
      if (msg.role !== "user") continue;
      matchedService = findServiceIn(msg.content || "");
      if (matchedService) break;
    }

    if (!matchedService) {
      for (const msg of [...recentMessages].reverse()) {
        matchedService = findServiceIn(msg.content || "");
        if (matchedService) break;
      }
    }
  }

  const serviceQuestionPattern = /(qual\s+servico|que\s+servico|servico\s+voce\s+(quer|prefere|deseja)|qual\s+servico\s+e\s+que\s+horario|qual\s+seria\s+o\s+servico|qual\s+desses.*servico|servico\s+deseja\s+agendar|qual.*servico.*agendar|e\s+qual\s+servico|algum\s+servico\s+para|qual\s+servico\s+deseja\s+fazer|gostaria\s+de\s+agendar\s+qual\s+servico)/i;
  const asksForServiceAgain = serviceQuestionPattern.test(normalizedReply);

  // Detect service LISTING in the reply (e.g. bullet list with service names and prices)
  const listsServiceOptions = (() => {
    if (!matchedService) return false;
    let serviceNamesFoundInReply = 0;
    for (const svc of serviceList) {
      if (normalizedReply.includes(svc.normalized)) serviceNamesFoundInReply++;
    }
    // If 3+ services are mentioned AND it looks like a list → it's listing services
    return serviceNamesFoundInReply >= 3 && /[•\-·]/.test(reply);
  })();

  const dateCorrectionOnly = /(ops|opa|corrigindo|na\s+verdade|muda|troca|amanha|hoje|segunda|terca|quarta|quinta|sexta|sabado|domingo|\d{1,2}h|\d{1,2}:\d{2})/i.test(normalizedUserMessage);

  // --- Helper functions ---
  const extractUserTimeIntent = (text: string): { exact?: string; hour?: string } => {
    // Normalize accents so "Às" → "as", "às" → "as"
    const norm = text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

    const exactMatch = norm.match(/\b([01]?\d|2[0-3])[:h]([0-5]\d)\b/i);
    if (exactMatch) {
      const hh = exactMatch[1].padStart(2, "0");
      return { exact: `${hh}:${exactMatch[2]}` };
    }
    const hourWithAs = norm.match(/(?:\b(?:as)\s*)([01]?\d|2[0-3])\b/);
    if (hourWithAs) return { hour: hourWithAs[1].padStart(2, "0") };
    const hourWithH = norm.match(/\b([01]?\d|2[0-3])h\b/);
    if (hourWithH) return { hour: hourWithH[1].padStart(2, "0") };
    return {};
  };

  const getLastAssistantMessageFromHistory = (): string => {
    if (!conversationHistory || conversationHistory.length === 0) return "";
    for (let i = conversationHistory.length - 1; i >= 0; i--) {
      if (conversationHistory[i].role === "assistant") return conversationHistory[i].content || "";
    }
    return "";
  };

  const extractAvailableSlotsFromText = (text: string): string[] => {
    if (!text) return [];
    const matches = text.match(/\b([01]\d|2[0-3]):[0-5]\d\b/g) || [];
    return [...new Set(matches)];
  };

  const inferDateLabel = (): string => {
    const userNorm = normalize(userMessage || "");
    if (/\bamanha\b/.test(userNorm)) return "amanhã";
    if (/\bhoje\b/.test(userNorm)) return "hoje";
    const weekdayMatch = userNorm.match(/\b(segunda|terca|quarta|quinta|sexta|sabado|domingo)\b/);
    if (weekdayMatch) return weekdayMatch[1];
    const lastAssistant = normalize(getLastAssistantMessageFromHistory());
    if (/\bamanha\b/.test(lastAssistant)) return "amanhã";
    if (/\bhoje\b/.test(lastAssistant)) return "hoje";
    const assistantWeekdayMatch = lastAssistant.match(/\b(segunda|terca|quarta|quinta|sexta|sabado|domingo)\b/);
    if (assistantWeekdayMatch) return assistantWeekdayMatch[1];
    return "o dia combinado";
  };

  // --- PRIORITY CHECK: If service is known AND user is providing a time, intercept ONLY if the AI reply is wrong ---
  if (matchedService) {
    const userTimeIntent = extractUserTimeIntent(userMessage || "");
    if (userTimeIntent.exact || userTimeIntent.hour) {
      // First: check if the AI reply already correctly mentions the service and does NOT ask for it again
      const replyAlreadyCorrect = !asksForServiceAgain && !listsServiceOptions &&
        normalizedReply.includes(normalize(matchedService));

      if (replyAlreadyCorrect) {
        console.log(`[ServiceGuard] AI reply already correct (mentions "${matchedService}", no redundant question). Passing through.`);
        return reply;
      }

      const lastAssistantMessage = getLastAssistantMessageFromHistory();
      const availableSlots = extractAvailableSlotsFromText(lastAssistantMessage);

      const compatibleSlots = availableSlots.filter((slot) => {
        if (userTimeIntent.exact) return slot === userTimeIntent.exact;
        if (userTimeIntent.hour) return slot.startsWith(`${userTimeIntent.hour}:`);
        return false;
      });

      if (compatibleSlots.length > 1) {
        const optionsText = compatibleSlots.join(" ou ");
        console.log(`[ServiceGuard] Service "${matchedService}" known + ambiguous time → disambiguating: ${optionsText}`);
        return `Perfeito 😊 Você prefere ${optionsText}?`;
      }

      if (compatibleSlots.length === 1) {
        const chosenTime = compatibleSlots[0];
        console.log(`[ServiceGuard] Service "${matchedService}" known + exact time ${chosenTime} → passing through to AI for auto-confirmation`);
        // Don't override with static message — let the AI generate the proper
        // 1-step auto-confirmation with <action> block. Only strip redundant
        // service questions if present.
        if (asksForServiceAgain || listsServiceOptions) {
          console.log(`[ServiceGuard] Stripping redundant service question, keeping time context`);
          // Return a clean message that preserves the time choice without asking "Deseja confirmar?"
          // The AI prompt is trained to auto-confirm, so we pass the reply through
          // after cleaning the redundant service question.
        } else {
          return reply;
        }
      }

      // If no compatible slots found from history but service is known and reply lists services, override
      if (asksForServiceAgain || listsServiceOptions) {
        console.log(`[ServiceGuard] Service "${matchedService}" known + time intent detected + reply asks for service → overriding`);
        return `Perfeito, ${matchedService}! Qual horário você prefere?`;
      }
    }
  }

  if (!matchedService) {
    if ((asksForServiceAgain || listsServiceOptions) && dateCorrectionOnly) {
      console.log("[ServiceGuard] No service matched, but date/time correction context detected. Stripping redundant service question.");
    } else {
      console.log("[ServiceGuard] No service matched in message or history");
      return reply;
    }
  }

  if (!asksForServiceAgain && !listsServiceOptions) {
    console.log("[ServiceGuard] Reply does NOT ask for service again, no changes needed");
    return reply;
  }

  console.log("[ServiceGuard] Reply asks for service again — removing redundant question and service list");

  const lines = reply.split("\n");
  const cleaned: string[] = [];
  let skippingServiceOptions = false;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    const normalizedLine = normalize(line);

    if (/^opc(ao|oes|oe)\s+de\s+servico/i.test(normalizedLine)) {
      skippingServiceOptions = true;
      continue;
    }

    if (skippingServiceOptions) {
      if (/^horarios?\s+disponiveis?/i.test(normalizedLine)) {
        skippingServiceOptions = false;
        cleaned.push(rawLine);
        continue;
      }
      if (line === "" || /^[•\-·]/.test(line)) continue;
      skippingServiceOptions = false;
    }

    // Skip bullet lines that list service names with prices (e.g. "• Manicure: R$50")
    if (/^[•\-·]/.test(line)) {
      const isSvcListing = serviceList.some((s: { original: string; normalized: string }) => normalizedLine.includes(s.normalized));
      if (isSvcListing && /r\$|\d+\s*min/.test(normalizedLine)) {
        continue; // skip service listing bullet
      }
    }

    if (serviceQuestionPattern.test(normalizedLine)) {
      if (/horario/i.test(normalizedLine)) {
        if (matchedService) {
          cleaned.push(`Perfeito, ${matchedService}! Qual horário você prefere?`);
        } else {
          cleaned.push("Perfeito! Qual horário você prefere?");
        }
      }
      continue;
    }

    cleaned.push(rawLine);
  }

  const sanitized = cleaned
    .map((l) => l.trimEnd())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  const fallback = matchedService
    ? `Perfeito, ${matchedService}! Qual horário você prefere?`
    : "Perfeito! Qual horário você prefere?";

  const result = sanitized || fallback;
  console.log(`[ServiceGuard] Final result: "${result.substring(0, 200)}"`);
  return result;
}

// --- Humanized Typing Delay ---

function calculateHumanDelay(text: string): number {
  const len = (text || "").length;
  // Short messages (greetings): 1-2s
  if (len <= 50) return 1000 + Math.random() * 1000;
  // Simple choices: 2-3s
  if (len <= 150) return 2000 + Math.random() * 1000;
  // Full booking confirmations: 3-5s
  if (len <= 400) return 3000 + Math.random() * 2000;
  // Long detailed responses: 4-6s
  return 4000 + Math.random() * 2000;
}

async function sendComposingPresence(instanceName: string, phone: string): Promise<void> {
  const evolutionUrl = Deno.env.get("EVOLUTION_API_URL");
  const evolutionKey = Deno.env.get("EVOLUTION_API_KEY");
  if (!evolutionUrl || !evolutionKey) return;

  const baseUrl = evolutionUrl.replace(/\/+$/, "");
  const cleanPhone = phone.replace("@s.whatsapp.net", "");
  try {
    await fetch(`${baseUrl}/chat/presence/${instanceName}`, {
      method: "POST",
      headers: {
        apikey: evolutionKey.trim(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ number: cleanPhone, presence: "composing" }),
    });
    console.log("[TypingDelay] Composing presence sent");
  } catch (err) {
    console.warn("[TypingDelay] Failed to send composing presence:", err);
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function sendWhatsAppMessage(instanceName: string, phone: string, text: string) {
  const evolutionUrl = Deno.env.get("EVOLUTION_API_URL");
  const evolutionKey = Deno.env.get("EVOLUTION_API_KEY");
  if (!evolutionUrl || !evolutionKey) return;

  // Send "composing" presence and wait humanized delay
  const delay = calculateHumanDelay(text);
  console.log(`[TypingDelay] Text length: ${text.length}, delay: ${delay}ms`);
  await sendComposingPresence(instanceName, phone);
  await sleep(delay);

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
    "resposta anterior continha apenas emojis",
    "notei que a resposta anterior",
    "Peço desculpas por isso",
    "ignore a mensagem anterior",
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

  // Remove only truly duplicated consecutive user messages.
  // Keep distinct sequenced messages (ex: "Quero marcar manicure" + "Ops amanhã")
  // so we don't lose booking context.
  const normalizeForDedup = (text: string) => (text || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();

  const cleaned: { role: string; content: string }[] = [];
  for (let i = 0; i < filtered.length; i++) {
    const msg = filtered[i];
    const next = filtered[i + 1];

    if (msg.role === "user" && next && next.role === "user") {
      const currentNorm = normalizeForDedup(msg.content || "");
      const nextNorm = normalizeForDedup(next.content || "");
      if (currentNorm === nextNorm) continue;
    }

    cleaned.push(msg);
  }

  // Ensure conversation doesn't end with orphaned user messages without a response
  // and limit to last 10 messages to keep context manageable
  return cleaned.slice(-10);
}

async function findLastMentionedService(
  serviceClient: any,
  userId: string,
  phone: string,
  services: any[],
): Promise<string | null> {
  const normalize = (text: string) => (text || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();

  // Normalize connectors: "+" "e" "&" all become a single canonical separator
  const normalizeConnectors = (text: string) =>
    normalize(text).replace(/\b(e)\b/g, "+").replace(/\s*\+\s*/g, " + ");

  const serviceList = (services || [])
    .map((s: any) => ({
      original: s?.name || "",
      normalized: normalize(s?.name || ""),
      withConnectors: normalizeConnectors(s?.name || ""),
    }))
    .filter((s: { original: string; normalized: string }) => s.normalized.length > 1)
    .sort((a: { normalized: string }, b: { normalized: string }) => b.normalized.length - a.normalized.length);

  if (serviceList.length === 0) return null;

  const { data } = await serviceClient
    .from("conversation_messages")
    .select("role, content")
    .eq("user_id", userId)
    .eq("phone", phone)
    .order("created_at", { ascending: false })
    .limit(60);

  const messages = data || [];
  for (const msg of messages) {
    const normalizedMessage = normalize(msg.content || "");
    const connectorMessage = normalizeConnectors(msg.content || "");
    const found = serviceList.find((s: { original: string; normalized: string; withConnectors: string }) =>
      normalizedMessage.includes(s.normalized) || connectorMessage.includes(s.withConnectors)
    );
    if (found) return found.original;
  }

  return null;
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

// --- No-Show Recovery Response Handler ---

async function handleNoShowRecoveryResponse(
  serviceClient: any,
  shopConfig: PetShopConfig,
  cleanPhone: string,
  message: string
): Promise<string | null> {
  const trimmed = message.trim();
  // Intercept standalone numeric replies (valid: 1-3, invalid: 0, negatives, >3)
  if (!/^-?\d+$/.test(trimmed)) return null;

  const numValue = parseInt(trimmed);
  const slotIndex = numValue - 1;

  // Find pending no-show recovery for this phone
  const { data: noShowAppts } = await serviceClient
    .from("appointments")
    .select("id, user_id, owner_name, pet_name, service, date, time, notes, recovery_status")
    .eq("user_id", shopConfig.user_id)
    .eq("status", "no_show")
    .eq("recovery_status", "pending")
    .order("no_show_detected_at", { ascending: false });

  // Filter by phone match
  const matchingAppts = (noShowAppts || []).filter((a: any) => {
    // We need to check the phone from a broader query since owner_phone might need matching
    return true; // We'll match by phone below
  });

  if (!matchingAppts || matchingAppts.length === 0) return null;

  // Find the specific no-show that was sent a recovery to this phone
  // Check all no-shows from this user and match phone
  const { data: phoneMatchAppts } = await serviceClient
    .from("appointments")
    .select("id, owner_name, pet_name, service, date, time, notes, owner_phone, recovery_status")
    .eq("user_id", shopConfig.user_id)
    .eq("status", "no_show")
    .eq("recovery_status", "pending")
    .not("recovery_message_sent_at", "is", null)
    .order("recovery_message_sent_at", { ascending: false });

  const recoveryAppt = (phoneMatchAppts || []).find((a: any) =>
    phoneMatches(a.owner_phone || "", cleanPhone)
  );

  if (!recoveryAppt) return null;

  // Parse recovery slots from notes
  let recoverySlots: { date: string; time: string; weekday: string }[] = [];
  try {
    const notesData = typeof recoveryAppt.notes === "string"
      ? JSON.parse(recoveryAppt.notes)
      : recoveryAppt.notes;
    recoverySlots = notesData?.recovery_slots || [];
  } catch {
    console.error("[NoShowRecovery] Failed to parse recovery slots from notes");
    return null;
  }

  if (numValue <= 0 || slotIndex >= recoverySlots.length) {
    return `Desculpe, opção ${trimmed} não é válida. Por favor, escolha entre 1 e ${recoverySlots.length}, ou me diga outro horário que funcione pra você! 😊`;
  }

  const chosenSlot = recoverySlots[slotIndex];

  // Check if chosen slot is still available (validate via insert — the trigger will catch conflicts)
  const isPetNiche = ["petshop", "veterinaria"].includes(shopConfig.niche || "petshop");

  const { error: insertErr } = await serviceClient
    .from("appointments")
    .insert({
      user_id: shopConfig.user_id,
      pet_name: recoveryAppt.pet_name || "—",
      owner_name: recoveryAppt.owner_name,
      owner_phone: cleanPhone,
      service: recoveryAppt.service,
      date: chosenSlot.date,
      time: chosenSlot.time,
      notes: `Reagendamento automático (recuperação de no-show do dia ${recoveryAppt.date})`,
      status: "pending",
    });

  if (insertErr) {
    console.error("[NoShowRecovery] Insert error:", insertErr);
    const isSlotConflict = /lot(ado|ação)|conflita/i.test(insertErr.message || "");
    if (isSlotConflict) {
      return `Poxa, o horário ${chosenSlot.time} do dia ${formatDateBRHelper(chosenSlot.date)} não está mais disponível 😕\nMe diga outro horário que funcione pra você!`;
    }
    return `Desculpe, não consegui finalizar o reagendamento agora. Pode tentar novamente? 😊`;
  }

  // Mark the original no-show as recovered
  await serviceClient
    .from("appointments")
    .update({ recovery_status: "recovered" })
    .eq("id", recoveryAppt.id);

  // Increment trial appointment counter
  try {
    await serviceClient.rpc("increment_trial_appointments", { p_user_id: shopConfig.user_id });
  } catch { /* ignore */ }

  const dayLabel = chosenSlot.weekday
    ? `${getWeekdayShortHelper(chosenSlot.weekday)} ${formatDateBRHelper(chosenSlot.date)}`
    : formatDateBRHelper(chosenSlot.date);

  return `✅ Reagendamento confirmado!\n\n` +
    `📋 *${recoveryAppt.service}*${isPetNiche ? ` para *${recoveryAppt.pet_name}*` : ""}\n` +
    `📅 ${dayLabel} às ${chosenSlot.time}\n\n` +
    `Te esperamos! 💜`;
}

// Helper functions for no-show recovery (avoid name clash with edge function scope)
function formatDateBRHelper(dateStr: string): string {
  const [y, m, d] = dateStr.split("-");
  return `${d}/${m}`;
}

function getWeekdayShortHelper(weekday: string): string {
  const map: Record<string, string> = {
    "Domingo": "Dom",
    "Segunda-feira": "Seg",
    "Terça-feira": "Ter",
    "Quarta-feira": "Qua",
    "Quinta-feira": "Qui",
    "Sexta-feira": "Sex",
    "Sábado": "Sáb",
  };
  return map[weekday] || weekday;
}

// --- Confirmation Quick Responses ---

async function handleConfirmationResponse(
  serviceClient: any,
  shopConfig: PetShopConfig,
  cleanPhone: string,
  message: string
): Promise<string | null> {
  const normalized = message.trim().toUpperCase();

  const isConfirm = normalized === "CONFIRMO" || normalized === "CONFIRMAR" || normalized === "1";
  const isReschedule = normalized === "REMARCAR" || normalized === "PRECISO REMARCAR" || normalized === "REAGENDAR" || normalized === "2";
  const isCancel = normalized === "CANCELAR" || normalized === "CANCELA" || normalized === "3";

  if (!isConfirm && !isReschedule && !isCancel) return null;

  // For numeric replies (1, 2, 3), only handle if the customer has a recent reminder
  if (normalized === "1" || normalized === "2" || normalized === "3") {
    const brNowMs = new Date().getTime() - 3 * 60 * 60 * 1000;
    const today = new Date(brNowMs).toISOString().split("T")[0];
    const { data: reminderCheck } = await serviceClient
      .from("appointments")
      .select("id, confirmation_message_sent_at")
      .eq("user_id", shopConfig.user_id)
      .gte("date", today)
      .in("status", ["pending", "confirmed"])
      .not("confirmation_message_sent_at", "is", null)
      .limit(1);

    // Only intercept numeric replies if there's a recent reminder context
    const hasRecentReminder = (reminderCheck || []).some((a: any) => {
      if (!a.confirmation_message_sent_at) return false;
      const sentAt = new Date(a.confirmation_message_sent_at).getTime();
      const hoursSince = (Date.now() - sentAt) / (1000 * 60 * 60);
      return hoursSince < 48; // Within 48 hours of reminder
    });

    if (!hasRecentReminder) return null; // Let AI handle "1" normally
  }

  const brNowMs = new Date().getTime() - 3 * 60 * 60 * 1000;
  const today = new Date(brNowMs).toISOString().split("T")[0];
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

  // Prioritize the appointment that had a reminder sent (confirmation_message_sent_at not null)
  // and is still pending — this is the one the user is most likely responding to
  const reminderAppt = customerAppts.find((a: any) =>
    a.confirmation_message_sent_at && a.status === "pending"
  );
  const nextAppt = reminderAppt || customerAppts[0];

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

  // Pre-calculate "amanhã" and "depois de amanhã" to avoid AI date errors
  const tomorrowDate = new Date(nowDate.getTime() + 24 * 60 * 60 * 1000);
  const dayAfterDate = new Date(nowDate.getTime() + 2 * 24 * 60 * 60 * 1000);
  const tomorrowStr = tomorrowDate.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
  const tomorrowWeekday = tomorrowDate.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo", weekday: "long" });
  const tomorrowISO = `${tomorrowDate.toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" })}`;
  const dayAfterStr = dayAfterDate.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
  const dayAfterWeekday = dayAfterDate.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo", weekday: "long" });
  const dayAfterISO = `${dayAfterDate.toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" })}`;

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
"quero agendar mais um", "mais um pet", "outro pet", "agendar mais um pet", "quero agendar mais um pet", "outro horário", "agendar de novo", "quero marcar outro", "tenho outro pet", "agendar mais um pet para amanhã", "preciso marcar mais dois", "quero mais um corte", "mais dois cortes", "mais três horários"

Você DEVE:
1. Entender que ele quer fazer um NOVO agendamento ADICIONAL (não consultar os existentes).
2. Iniciar IMEDIATAMENTE a coleta de dados para o novo agendamento (${collectFields}).
3. NÃO listar agendamentos existentes.
4. NÃO perguntar se ele quer cancelar, remarcar ou confirmar agendamentos anteriores.

O cliente pode ter 1, 5 ou 10 agendamentos — cada novo pedido é independente.
NUNCA confunda "agendar mais um" com "ver meus agendamentos".

RASTREAMENTO DE QUANTIDADE (CRÍTICO):
Se o cliente pedir múltiplos agendamentos de uma vez (ex: "preciso marcar mais dois cortes", "quero 3 horários", "mais dois banhos"):
1. Identifique o NÚMERO exato de agendamentos solicitados (ex: "dois" = 2, "três" = 3).
2. Processe UM agendamento por vez — colete dados, confirme e registre.
3. Após CADA confirmação, informe quantos faltam e inicie a coleta do próximo. Exemplo: "Agendamento 1 de 2 confirmado! ✅ Vamos ao segundo — pra qual dia e horário?"
4. NUNCA considere o pedido concluído até que TODOS os agendamentos solicitados tenham sido registrados.
5. Se o serviço for o mesmo (ex: "dois cortes"), NÃO pergunte o serviço novamente para os próximos — já está definido.

ANTI-DUPLICAÇÃO DE HORÁRIO (CRÍTICO):
Quando o cliente pedir "mais um" ou "outro" agendamento do MESMO serviço:
1. NUNCA reutilize automaticamente o mesmo dia e horário do agendamento anterior.
2. SEMPRE pergunte "Pra qual dia e horário?" para o novo agendamento.
3. Se o cliente pedir o mesmo horário de um agendamento que ACABOU de ser confirmado, avise que aquele horário já está ocupado e sugira alternativas.
4. Mantenha o nome do cliente e outros dados já coletados — peça APENAS dia e horário para o próximo agendamento.
########## FIM DA REGRA MAIS IMPORTANTE ##########

IMPORTANTE SOBRE CONVERSA:
- Você está em uma conversa contínua via WhatsApp. O histórico de mensagens anteriores já está incluído.
- NÃO se apresente novamente se já tiver se apresentado em mensagens anteriores.
- Mantenha o contexto da conversa. Se o cliente já forneceu informações (nome, etc.), não peça novamente.
- Seja natural e fluida, como uma conversa real de WhatsApp.
- Só se apresente na PRIMEIRA mensagem de uma conversa nova (quando não houver histórico).
- REGRA DE APRESENTAÇÃO (CRÍTICA): Na PRIMEIRA mensagem, a apresentação deve vir COMPLETA em UMA ÚNICA LINHA, sem quebra de parágrafo, contendo: saudação + "Eu sou ${shopConfig.assistant_name || "a secretária digital"} da ${shopConfig.shop_name}" + ajuda oferecida. Exemplo: "Boa noite! Eu sou ${shopConfig.assistant_name || "a secretária digital"} da ${shopConfig.shop_name} e estou aqui para te ajudar."
- NUNCA envie a apresentação em duas partes ou com quebra que possa truncar no WhatsApp.

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
AMANHÃ: ${tomorrowWeekday}, ${tomorrowStr} (${tomorrowISO})
DEPOIS DE AMANHÃ: ${dayAfterWeekday}, ${dayAfterStr} (${dayAfterISO})
REGRA CRÍTICA DE DATAS: Quando o cliente disser "amanhã", use EXATAMENTE a data acima (${tomorrowWeekday}, ${tomorrowStr}). NUNCA calcule "amanhã" por conta própria. Use os valores pré-calculados.

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
REGRA: Se o cliente perguntar sobre "meus agendamentos", "algum agendamento", "quando vai ser", ou variações similares → liste os agendamentos DESTE CLIENTE acima com serviço, data e horário. NÃO mencione status internos como "pendente", "pendente de confirmação", "confirmado", etc. Esses status são informações INTERNAS do sistema e NÃO devem ser expostos ao cliente. Apenas informe os dados do agendamento de forma natural (ex: "Sua escova está agendada para amanhã, segunda-feira (02/03), às 08:00 😊").

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
REGRA DE EXPEDIENTE: Se um dia mostrar "EXPEDIENTE ENCERRADO", significa que o horário de funcionamento já passou para aquele dia. NÃO diga que está "lotado" ou "preenchido" — informe que o expediente já encerrou e sugira o próximo dia disponível.
REGRA CRÍTICA DE EXPEDIENTE — PROIBIÇÃO ABSOLUTA: Se o dia de HOJE tiver horários listados acima (ex: "Segunda-feira 2026-03-02: 15:00, 15:30, 16:00..."), o expediente NÃO encerrou. NUNCA diga "o expediente já encerrou" ou "hoje já encerrou" quando existem horários disponíveis para hoje na lista acima. Nesse caso, você DEVE oferecer os horários de HOJE primeiro. Só sugira outro dia se o cliente preferir ou se hoje realmente mostrar "EXPEDIENTE ENCERRADO".
REGRA CRÍTICA: Quando listar horários disponíveis, SEMPRE termine com uma pergunta pedindo que o cliente escolha (ex: "Qual horário você prefere?"). NUNCA liste horários sem perguntar qual o cliente quer. A lista de horários sem pergunta NÃO é uma resposta válida.
REGRA DE FORMATAÇÃO DE HORÁRIOS (CRÍTICA): Quando listar horários para o cliente, apresente-os como SUGESTÕES DE HORÁRIOS (não como "horários disponíveis"). Use frases como "Temos estas sugestões de horários para você:" ou "Seguem algumas sugestões de horários:". LISTE CADA HORÁRIO INDIVIDUALMENTE usando bullet points. NUNCA resuma, comprima ou agrupe horários em faixas como "08:00 até 15:00 (vários horários)". Isso é PROIBIDO. Se houver muitos horários, selecione os 5-6 melhores opções e liste cada um individualmente. Exemplo CORRETO:
Temos estas sugestões de horários para você:
• 08:00
• 09:00
• 10:30
• 14:00
• 16:00
Exemplo ERRADO: "Temos estes horários disponíveis:" ou "08:00 até 15:00 (vários horários)" — isso NÃO é aceitável.

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
- REGRA CRÍTICA: Se o cliente fornece MÚLTIPLAS informações de uma vez (ex: nome + horário, ou serviço + data + horário), processe TODAS juntas. NÃO ignore nenhuma. Se ele disse "Jene" e "quero às 10h" na mesma mensagem, você já tem o nome E o horário — NÃO liste horários disponíveis novamente. Avance direto para a próxima etapa com as informações coletadas.
- NUNCA liste horários disponíveis se o cliente JÁ escolheu um horário. Apenas verifique se está disponível e prossiga.
- REGRA DE MENSAGENS CONCATENADAS: As mensagens do cliente podem chegar concatenadas com quebras de linha (ex: "Quero marcar corte masculino hj às 20h\nMelhor às 19"). Isso significa que o cliente enviou mensagens curtas em sequência. Você DEVE interpretar TODAS as linhas como UMA ÚNICA intenção. A ÚLTIMA linha tem PRIORIDADE quando há mudança de decisão (ex: mudou de 20h para 19h). Responda em UMA ÚNICA mensagem consolidada usando a decisão FINAL do cliente. NÃO trate cada linha como uma conversa separada. NÃO liste serviços se o cliente já disse qual quer.
- REGRA DE MUDANÇA DE DECISÃO (CRÍTICA): Se o cliente muda de ideia durante a conversa (ex: "às 20h" → "melhor às 19"), ACEITE a mudança sem perder o contexto. O serviço, a data e todas as outras informações já coletadas permanecem válidos. Apenas atualize o dado que mudou. NUNCA reinicie o fluxo de agendamento. NUNCA pergunte novamente o serviço ou outras informações que já foram fornecidas. Exemplo correto: cliente disse "corte masculino hoje às 20h" e depois "melhor às 19" → você já sabe: serviço=corte masculino, data=hoje, horário=19:00. Prossiga com esses dados.
- REGRA DE FLEXIBILIDADE DE HORÁRIO: Se o cliente disser "qualquer hora", "qualquer horário", "pode me encaixar", "tanto faz o horário", sugira os próximos 2-3 horários disponíveis e pergunte qual prefere. NÃO pergunte "qual horário?" de volta — ofereça opções concretas.
- REGRA DE DESAMBIGUAÇÃO DE HORÁRIO (CRÍTICA): Quando o cliente informar um horário parcial ou ambíguo (ex: "às 8", "às 9", "de manhã", "à tarde"), verifique QUANTOS horários disponíveis correspondem. Se houver MAIS DE UM horário compatível (ex: "às 8" pode ser 08:00 ou 08:30), NUNCA assuma automaticamente. Pergunte qual prefere listando as opções compatíveis. Exemplo: cliente diz "às 8" e existem 08:00 e 08:30 → responda "Você prefere 08:00 ou 08:30? 😊". Só confirme direto quando o horário for EXATO e sem ambiguidade (ex: "às 08:30" = apenas uma opção).

COMPORTAMENTO:
- Na PRIMEIRA mensagem, apenas se apresente brevemente (nome + estabelecimento) e pergunte como pode ajudar. NÃO liste serviços, horários ou preços por conta própria.
- Responda SOMENTE o que o cliente perguntar. Não antecipe informações.
- Se o cliente perguntar preços → responda preços. Se perguntar horários → responda horários. Se quiser agendar → inicie o fluxo.
- Nunca despeje todas as informações de uma vez. Deixe o cliente conduzir a conversa.
- REGRA DE AGENDAMENTO PROATIVO (CRÍTICA): Quando o cliente demonstrar intenção de agendar (ex: "quero cortar o cabelo", "quero fazer pé e mão", "quero agendar banho"), você DEVE:
  1. Identificar o(s) serviço(s) correspondente(s) na lista cadastrada.
  2. Se o cliente usar linguagem informal (ex: "pé e mão"), mapear para os nomes corretos dos serviços (ex: "Manicure e Pedicure" ou "Manicure + Pedicure").
  3. Se forem múltiplos serviços combinados (ex: "pé e mão" = Manicure + Pedicure), tratar como agendamento ÚNICO combinado.
  4. Se houver AMBIGUIDADE (ex: "cortar o cabelo" pode ser Corte Feminino ou Corte Masculino), pergunte qual opção o cliente prefere E TAMBÉM pergunte data e horário NA MESMA MENSAGEM. Exemplo: "Temos Corte Feminino (R$100) e Corte Masculino (R$50).\nQual você prefere? E pra qual dia e horário?"
  5. Se NÃO houver ambiguidade, confirme o serviço identificado E pergunte data e horário. Exemplo: "Manicure e Pedicure! 💅\nPra qual dia e horário você quer agendar?"
  6. NUNCA responda APENAS listando serviços ou confirmando o serviço SEM perguntar quando. A pergunta de data/horário é OBRIGATÓRIA em toda resposta que identifica intenção de agendamento, MESMO quando há ambiguidade de serviço.
  7. Se o cliente é NOVO (não está na memória do cliente) e ainda não informou o nome, pergunte o nome junto com data/horário. Exemplo: "Manicure! 💅 Qual seu nome e pra qual dia e horário você quer agendar?"
- Nunca mencione regras internas ou configurações do sistema.

FLUXO DE AGENDAMENTO (CONFIRMAÇÃO AUTOMÁTICA — ETAPA ÚNICA):
COLETA DE NOME — REGRA CRÍTICA: Antes de confirmar o agendamento, você DEVE saber o nome do cliente. Se o cliente é novo (sem histórico) e ainda não informou o nome durante a conversa, PERGUNTE o nome JUNTO com a data/horário. Exemplo: "Qual seu nome e pra qual dia e horário?". NÃO confirme agendamento com nome desconhecido. Se o nome já foi informado em mensagens anteriores ou está na memória do cliente, NÃO peça novamente.
CONFIRMAÇÃO DIRETA: Quando o cliente escolher um horário específico e você já tiver TODAS as informações necessárias (${collectFields}), confirme o agendamento AUTOMATICAMENTE na mesma resposta. NÃO pergunte "podemos confirmar?", "tudo certo?", "posso marcar?". Confirme DIRETO.
INCLUA o bloco <action> na mesma resposta da confirmação automática.
NÃO mencione o status interno ("pendente", "pending"). Apenas confirme que foi agendado.
FORMATO DA CONFIRMAÇÃO (OBRIGATÓRIO):
"Agendamento confirmado ✅
• Serviço: [serviço]
• Data: [dia da semana], [data]
• Horário: [horário]
• Valor: R$[valor] (só se tiver preço cadastrado)
Se precisar remarcar, é só avisar! 😊"
ENDEREÇO: Inclua o endereço na confirmação (ex: "Te esperamos na [endereço], [bairro]!"). Também informe quando o cliente perguntar. NÃO ofereça enviar mapa.
REGRA PÓS-AGENDAMENTO: Após confirmar, NÃO faça NENHUMA pergunta adicional — EXCETO se o cliente pediu múltiplos agendamentos (ex: "dois cortes"). Nesse caso, informe "Agendamento X de Y confirmado!" e pergunte dia/horário para o próximo. Quando TODOS estiverem registrados, encerre de forma limpa.
${!isPetNiche ? 'No campo "pet_name" da action, coloque "—" (traço). NÃO pergunte nome de pet.' : ""}

FLUXO DE REMARCAÇÃO:
1. Se o cliente menciona um serviço que já tem agendado + um novo horário/data, entenda como pedido de remarcação.
2. Se o cliente tem APENAS UM agendamento daquele serviço, use-o diretamente sem perguntar "qual agendamento".
3. Se o cliente tem MÚLTIPLOS agendamentos do mesmo serviço, pergunte qual deseja remarcar.
4. Confirme os novos detalhes (data + horário) antes de executar a ação.
5. NÃO liste horários disponíveis se o cliente JÁ informou o horário desejado — apenas verifique se está disponível.

FLUXO DE ATRASO:
Se o cliente disser que vai se atrasar (ex: "vou me atrasar 15 min", "vou chegar atrasado", "estou preso no trânsito"):
1. Identifique o agendamento mais próximo do cliente.
2. Responda de forma acolhedora e compreensiva (ex: "Sem problemas! Vou anotar que você chegará um pouquinho mais tarde.").
3. Se o cliente informar o tempo de atraso, adicione esse tempo ao horário original e use uma action "reschedule" para atualizar.
   Exemplo: agendamento às 14:00 + atraso de 15 min → reschedule para 14:15.
4. Se o cliente NÃO informar o tempo exato, pergunte gentilmente quanto tempo de atraso estima.
5. NÃO cancele o agendamento. NÃO peça confirmação — atraso é uma informação, não uma ação destrutiva.

FLUXO DE CANCELAMENTO:
1. Identifique o agendamento.
2. Confirme que o cliente deseja cancelar.
3. Registre como cancelado.

FORMATO DE AÇÕES — REGRA CRÍTICA:
O bloco <action> DEVE ser incluído na MESMA mensagem em que você confirma o agendamento para o cliente.
NÃO separe em duas mensagens. Confirme e registre de uma vez só.

Para agendar (status SEMPRE "pending") — inclua na mesma mensagem da confirmação automática:
${actionExample}

Para cancelar:
<action>{"type":"cancel","date":"2026-02-21","time":"10:00"}</action>

Para reagendar:
<action>{"type":"reschedule","old_date":"2026-02-21","old_time":"10:00","new_date":"2026-02-22","new_time":"14:00"}</action>

Para confirmar presença:
<action>{"type":"confirm","date":"2026-02-21","time":"10:00"}</action>`;
}

// --- Process AI Actions ---

async function processAction(serviceClient: any, shopConfig: PetShopConfig, cleanPhone: string, reply: string, userMessage?: string, lastAssistantMessage?: string): Promise<string> {
  const actionMatch = reply.match(/<action>(.*?)<\/action>/s);
  if (!actionMatch) return reply;

  try {
    const action = JSON.parse(actionMatch[1]);

    // Guard: if the AI is ASKING for confirmation (question mark in text) and the action
    // is destructive (cancel/reschedule), do NOT execute it yet — strip the action and
    // let it happen only after the user confirms.
    const replyTextOnly = reply.replace(/<action>.*?<\/action>/s, "").trim();
    if ((action.type === "cancel" || action.type === "reschedule") && /\?/.test(replyTextOnly)) {
      console.log(`[ActionGuard] Stripping premature ${action.type} action — reply contains confirmation question`);
      return replyTextOnly;
    }
  } catch { /* will be re-parsed below */ }

  // Re-parse for actual execution
  const actionMatch2 = reply.match(/<action>(.*?)<\/action>/s);
  if (!actionMatch2) return reply;

  try {
    const action = JSON.parse(actionMatch2[1]);
    console.log("Processing action:", JSON.stringify(action));

    if (action.type === "create") {
      // Deterministic guard: for "mais um/novo agendamento" without explicit new date/time,
      // NEVER allow immediate confirmation or DB insertion.
      const isAdditionalIntent = detectAdditionalBookingIntent(userMessage || "");
      const hasDateOrTimeInUserMessage = detectDateOrTimeSignal(userMessage || "");

      if (isAdditionalIntent && !hasDateOrTimeInUserMessage) {
        console.log("[AdditionalBookingGuard] Blocked auto-create for 'mais um' without date/time");
        return "Perfeito! Vamos agendar mais um ✅\nPra qual dia e horário você quer esse próximo agendamento?";
      }

      const actionTime = typeof action.time === "string" ? action.time.slice(0, 5) : null;
      const previousTime = (lastAssistantMessage || "").match(/\b([01]\d|2[0-3]):[0-5]\d\b/)?.[0] || null;
      if (isAdditionalIntent && actionTime && previousTime && actionTime === previousTime && !hasDateOrTimeInUserMessage) {
        console.log("[AdditionalBookingGuard] Blocked same-slot reuse for additional booking");
        return "Esse horário acabou de ser usado no agendamento anterior.\nMe diga outro dia e horário que eu te confirmo agora ✅";
      }

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
        // Log error silently
        try {
          const svcClient = getServiceClient();
          await svcClient.from("admin_error_logs").insert({
            error_message: `Falha ao criar agendamento: ${insertErr.message}`,
            endpoint: "whatsapp-ai-handler/processAction",
            severity: "error",
            user_id: shopConfig.user_id,
          });
        } catch { /* ignore logging errors */ }
        
        // CRITICAL: Return a friendly error message instead of the false confirmation
        const isSlotConflict = /lot(ado|ação)|conflita/i.test(insertErr.message || "");
        if (isSlotConflict) {
          return `Poxa, infelizmente o horário ${action.time} não está mais disponível para ${action.date} 😕\nVamos tentar outro horário? Me diz qual fica melhor pra você!`;
        }
        return `Desculpe, não consegui finalizar o agendamento agora. Pode tentar novamente? 😊`;
      }

      // Increment trial appointment counter — atomic
      try {
        const { data: subData } = await serviceClient
          .from("subscriptions")
          .select("current_period_end, trial_end_at")
          .eq("user_id", shopConfig.user_id)
          .maybeSingle();
        if (subData) {
          const hasPaid = subData.current_period_end && subData.trial_end_at && 
            new Date(subData.current_period_end) > new Date(subData.trial_end_at);
          if (!hasPaid) {
            await serviceClient.rpc("increment_trial_appointments", { p_user_id: shopConfig.user_id });
          }
        }
      } catch { /* ignore */ }
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

// --- Deterministic Booking Shortcut ---
// Bypasses AI entirely when the user selects a time from a previously listed set of options.
// This prevents context loss, hallucinations, and repeated questions.

async function tryDeterministicBooking(
  serviceClient: any,
  shopConfig: PetShopConfig,
  cleanPhone: string,
  userMessage: string,
  conversationHistory: { role: string; content: string }[],
  ownerName: string | null,
  lastMentionedService: string | null,
  convStateService: string | null,
  isPetNiche: boolean,
  instanceName: string,
  senderPhone: string,
  availableSlots: string,
  appointments: any[],
  isFarewell: boolean,
): Promise<string | null> {
  if (isFarewell) return null;

  const userNorm = (userMessage || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

  // Only trigger for short time-selection messages (not complex multi-intent messages)
  if (userNorm.length > 80) return null;

  // Detect cancel/reschedule intents — let AI handle
  if (/(cancelar|remarcar|reagendar|desmarcar)/i.test(userNorm)) return null;

  // Detect time intent in user message (supports 8:0, 8h, às 8)
  const chosenTime = parseFlexibleTimeFromMessage(userMessage || "");
  if (!chosenTime) return null;

  // Check: does the last assistant message contain a list of available times?
  const lastAssistant = [...conversationHistory].reverse().find(m => m.role === "assistant");
  if (!lastAssistant) return null;

  const assistantSlots = (lastAssistant.content || "").match(/\b([01]\d|2[0-3]):[0-5]\d\b/g) || [];
  if (assistantSlots.length < 2) return null; // Not a time listing

  // Verify the chosen time is in the listed options
  let finalTime = chosenTime;
  if (!assistantSlots.includes(chosenTime)) {
    // Check partial hour match (user said "às 14" → "14:00")
    const hourPrefix = chosenTime.split(":")[0];
    const hourMatches = assistantSlots.filter(s => s.startsWith(`${hourPrefix}:`));
    if (hourMatches.length > 1) {
      return null; // Ambiguous — let AI handle
    }
    if (hourMatches.length === 1) {
      finalTime = hourMatches[0];
    } else {
      return null; // Time not in list
    }
  }

  // We have a valid time selection. Now gather remaining data.
  const inferredServiceFromAssistant = inferServiceFromText(lastAssistant.content || "", shopConfig.services || []);
  let serviceName = lastMentionedService || convStateService || inferredServiceFromAssistant;
  if (!serviceName) {
    console.log(`[DeterministicBooking] Aborted: no service resolved for ${cleanPhone}`);
    return null;
  }

  // Verify service exists in config
  const serviceConfig = (shopConfig.services as any[]).find((s: any) =>
    (s.name || "").toLowerCase() === serviceName!.toLowerCase()
  );
  if (!serviceConfig) return null;

  // Owner name: from memory or conversation
  let clientName = ownerName;
  if (!clientName) {
    // Try to extract from conversation history
    for (let i = conversationHistory.length - 1; i >= 0; i--) {
      const msg = conversationHistory[i];
      if (msg.role !== "user") continue;
      const nameMatch = msg.content?.match(/(?:meu nome [eé]|me chamo|sou o|sou a|pode me chamar de)\s+(\w+)/i);
      if (nameMatch) {
        clientName = nameMatch[1];
        break;
      }
      // If previous message was AI asking for name, this msg is the name
      if (i > 0) {
        const prevMsg = conversationHistory[i - 1];
        if (prevMsg.role === "assistant" && /qual\s+(seu|o\s+seu)\s+nome/i.test(prevMsg.content || "")) {
          const potentialName = msg.content?.trim();
          if (potentialName && potentialName.length >= 2 && potentialName.length <= 30) {
            clientName = potentialName.split(/\s/)[0];
            break;
          }
        }
      }
    }
  }

  if (!clientName) {
    const askNameMsg = `Perfeito! Para confirmar ${serviceName} às ${finalTime}, me diz seu nome, por favor.`;
    console.log(`[DeterministicBooking] Missing client name for ${cleanPhone} — asking name before confirmation`);
    await saveMessage(serviceClient, shopConfig.user_id, cleanPhone, "assistant", askNameMsg);
    await sendWhatsAppMessage(instanceName, senderPhone, askNameMsg);
    return askNameMsg;
  }

  // Determine date from last assistant message or available slots
  let chosenDate: string | null = null;
  const assistantContent = lastAssistant.content || "";

  // Extract date from assistant's message (DD/MM pattern) — use the LAST date mentioned
  // because the AI often says "day X is full" then "suggestions for day Y"
  const allDatesInAssistant = [...assistantContent.matchAll(/(\d{2}\/\d{2})/g)];
  if (allDatesInAssistant.length > 0) {
    const lastDate = allDatesInAssistant[allDatesInAssistant.length - 1][1];
    const [dd, mm] = lastDate.split("/");
    const brNow = new Date(Date.now() - 3 * 60 * 60 * 1000);
    const year = brNow.getUTCFullYear();
    chosenDate = `${year}-${mm}-${dd}`;
    console.log(`[DeterministicBooking] Extracted date ${chosenDate} (last of ${allDatesInAssistant.length} dates in assistant msg)`);
  }

  // Check if user message mentions "amanhã"
  if (/\bamanha\b/i.test(userNorm)) {
    const tomorrow = new Date(Date.now() - 3 * 60 * 60 * 1000 + 24 * 60 * 60 * 1000);
    chosenDate = tomorrow.toISOString().split("T")[0];
  }

  if (!chosenDate) {
    // Find from available slots
    const slotLines = availableSlots.split("\n");
    for (const line of slotLines) {
      const dm = line.match(/(\d{4}-\d{2}-\d{2})/);
      if (dm && line.includes(finalTime)) {
        chosenDate = dm[1];
        break;
      }
    }
  }

  if (!chosenDate) return null;

  // Validate the slot is available (slots now have annotations like "15:00 (até 60min livre)")
  if (!availableSlots.includes(chosenDate) || !availableSlots.includes(finalTime)) return null;

  // Check that the service duration fits in the consecutive free time at this slot
  const serviceDuration = serviceConfig.duration || 30;
  const slotLine = availableSlots.split("\n").find((l: string) => l.includes(chosenDate) && l.includes(finalTime));
  if (slotLine) {
    const freeMinMatch = slotLine.match(new RegExp(`${finalTime.replace(":", ":")}\\s*\\(até (\\d+)min`));
    if (freeMinMatch) {
      const freeMin = parseInt(freeMinMatch[1]);
      if (serviceDuration > freeMin) {
        console.log(`[DeterministicBooking] Slot ${finalTime} has ${freeMin}min free but service needs ${serviceDuration}min`);
        // Find alternative slots on the same date that have enough free time
        const altSlots: string[] = [];
        const slotMatches = slotLine.matchAll(/(\d{2}:\d{2})\s*\(até (\d+)min/g);
        for (const sm of slotMatches) {
          if (parseInt(sm[2]) >= serviceDuration && sm[1] !== finalTime) {
            altSlots.push(sm[1]);
          }
        }
        const altText = altSlots.length > 0
          ? `\nHorários disponíveis para ${serviceName}: ${altSlots.slice(0, 5).join(", ")}`
          : "\nMe diz outro horário que fica melhor pra você!";
        const reply = `Poxa, o horário ${finalTime} não comporta o ${serviceName} (${serviceDuration}min) 😕${altText}`;
        await saveMessage(serviceClient, shopConfig.user_id, cleanPhone, "assistant", reply);
        await sendWhatsAppMessage(instanceName, senderPhone, reply);
        return reply;
      }
    }
  }

  console.log(`[DeterministicBooking] Bypassing AI — service: ${serviceName}, date: ${chosenDate}, time: ${finalTime}, client: ${clientName}`);

  // Get pet name for pet niches
  let petName = "—";
  if (isPetNiche) {
    const pastPetAppts = appointments.filter((a: any) => phoneMatches(a.owner_phone || "", cleanPhone));
    if (pastPetAppts.length > 0 && pastPetAppts[0].pet_name && pastPetAppts[0].pet_name !== "—") {
      petName = pastPetAppts[0].pet_name;
    } else {
      return null; // Pet niche needs pet name — let AI ask
    }
  }

  // Insert appointment
  const { error: insertErr } = await serviceClient
    .from("appointments")
    .insert({
      user_id: shopConfig.user_id,
      pet_name: petName,
      owner_name: clientName,
      owner_phone: cleanPhone,
      service: serviceName,
      date: chosenDate,
      time: finalTime,
      notes: "",
      status: "pending",
    });

  if (insertErr) {
    console.error("[DeterministicBooking] Insert error:", insertErr);
    if (/lot(ado|ação)|conflita/i.test(insertErr.message || "")) {
      const reply = `Poxa, o horário ${finalTime} não está mais disponível 😕\nMe diz outro horário que fica melhor pra você!`;
      await saveMessage(serviceClient, shopConfig.user_id, cleanPhone, "assistant", reply);
      await sendWhatsAppMessage(instanceName, senderPhone, reply);
      return reply;
    }
    return null; // Let AI handle
  }

  // Increment counters
  try {
    const { data: subData } = await serviceClient
      .from("subscriptions")
      .select("current_period_end, trial_end_at")
      .eq("user_id", shopConfig.user_id)
      .maybeSingle();
    if (subData) {
      const hasPaid = subData.current_period_end && subData.trial_end_at &&
        new Date(subData.current_period_end) > new Date(subData.trial_end_at);
      if (!hasPaid) {
        await serviceClient.rpc("increment_trial_appointments", { p_user_id: shopConfig.user_id });
      }
    }
  } catch { /* ignore */ }
  await serviceClient.rpc("increment_trial_messages", { p_user_id: shopConfig.user_id });

  // Format confirmation
  const [y, m, d] = chosenDate.split("-");
  const dateBR = `${d}/${m}`;
  const dayNames = ["Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"];
  const dateObj = new Date(`${chosenDate}T12:00:00-03:00`);
  const weekday = dayNames[dateObj.getDay()] || "";

  let confirmMsg = `Agendamento confirmado ✅\n\n`;
  confirmMsg += `• Serviço: ${serviceName}\n`;
  confirmMsg += `• Data: ${weekday}, ${dateBR}\n`;
  confirmMsg += `• Horário: ${finalTime}\n`;
  if (serviceConfig.price != null) {
    confirmMsg += `• Valor: R$${Number(serviceConfig.price).toFixed(2)}\n`;
  }
  confirmMsg += `\nTe esperamos na ${shopConfig.address}, ${shopConfig.neighborhood}!`;
  confirmMsg += `\nSe precisar remarcar, é só avisar! 😊`;

  await serviceClient.from("ai_usage").insert({
    user_id: shopConfig.user_id,
    tokens_used: 0,
    request_type: "deterministic_booking",
    model: "deterministic",
    response_time_ms: 0,
  });

  await saveMessage(serviceClient, shopConfig.user_id, cleanPhone, "assistant", confirmMsg);
  await sendWhatsAppMessage(instanceName, senderPhone, confirmMsg);

  // Update structured state after successful deterministic booking
  await updateConversationState(serviceClient, shopConfig.user_id, cleanPhone, stateAfterBooking());
  console.log(`[DeterministicBooking] Success — ${serviceName} for ${clientName} at ${chosenDate} ${finalTime} — state reset`);
  return confirmMsg;
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

    // --- TRIAL / SUBSCRIPTION ENFORCEMENT (quota-based) ---
    const { data: subscription } = await serviceClient
      .from("subscriptions")
      .select("status, trial_end_at, current_period_end, trial_appointments_used, trial_messages_used, trial_appointments_limit, trial_messages_limit")
      .eq("user_id", shopConfig.user_id)
      .maybeSingle();

    const now = new Date();
    let blocked = false;

    if (!subscription) {
      blocked = true;
    } else if (subscription.status === "cancelled") {
      blocked = true;
    } else if (subscription.status === "active") {
      // Check message quota (applies to ALL plans: trial and paid)
      const msgsUsed = subscription.trial_messages_used ?? 0;
      const msgsLimit = subscription.trial_messages_limit ?? 150;

      if (msgsLimit > 0 && msgsUsed >= msgsLimit) {
        blocked = true;
        console.log(`[QUOTA-BLOCK] Messages exhausted for user ${shopConfig.user_id}: msgs=${msgsUsed}/${msgsLimit}`);
      }

      // Check appointment quota only if limit is NOT -1 (unlimited)
      const aptsUsed = subscription.trial_appointments_used ?? 0;
      const aptsLimit = subscription.trial_appointments_limit ?? 30;

      if (aptsLimit !== -1 && aptsUsed >= aptsLimit) {
        blocked = true;
        console.log(`[QUOTA-BLOCK] Appointments exhausted for user ${shopConfig.user_id}: apts=${aptsUsed}/${aptsLimit}`);
      }
    }

    if (blocked) {
      console.log(`[TRIAL-BLOCK] Messages blocked for user ${shopConfig.user_id} — no active subscription or quota exhausted`);
      try {
        await serviceClient.from("admin_error_logs").insert({
          error_message: `[TRIAL-BLOCK] Mensagem bloqueada — assinatura inativa ou cota esgotada`,
          endpoint: "whatsapp-ai-handler",
          severity: "warning",
          user_id: shopConfig.user_id,
          stack_trace: JSON.stringify({ sender: cleanPhone, message: message.substring(0, 100), instanceName }),
        });
      } catch { /* ignore logging errors */ }
      return new Response(JSON.stringify({ success: false, reason: "subscription_inactive" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Increment message counter for ALL active plans (trial and paid) — atomic
    if (subscription && subscription.status === "active") {
      await serviceClient.rpc("increment_trial_messages", { p_user_id: shopConfig.user_id });
    }

    // Check for no-show recovery responses (1, 2, 3) BEFORE confirmation handler
    const recoveryReply = await handleNoShowRecoveryResponse(serviceClient, shopConfig, cleanPhone, message);
    if (recoveryReply) {
      await saveMessage(serviceClient, shopConfig.user_id, cleanPhone, "user", message);
      await saveMessage(serviceClient, shopConfig.user_id, cleanPhone, "assistant", recoveryReply);
      await sendWhatsAppMessage(instanceName, senderPhone, recoveryReply);
      return new Response(JSON.stringify({ success: true, reply: recoveryReply }), {
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

    // --- New Conversation Detection & Farewell Cleanup ---
    const msgNorm = (message || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, " ").replace(/\s+/g, " ").trim();
    
    // Helper: normalize a single line for greeting/farewell matching
    const normalizeLine = (line: string) => line.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, " ").replace(/\s+/g, " ").trim();
    
    // Helper: check if ALL lines of a (possibly multiline) message match a pattern
    const greetingPattern = /^(boa\s+(noite|tarde)|bom\s+dia|oi|ola|hey|eai|e\s+ai|fala|salve|hello|hi|tudo\s+bem|como\s+vai)$/i;
    const farewellPattern = /^(tchau|ate\s+(mais|logo|breve)|flw|falou|valeu|obrigad[oa]|brigad[oa]|bye|adeus|bjs|beijos|xau)$/i;
    const greetingOrFarewellPattern = /^(boa\s+(noite|tarde)|bom\s+dia|oi|ola|hey|eai|e\s+ai|fala|salve|hello|hi|tudo\s+bem|como\s+vai|tchau|ate\s+(mais|logo|breve)|flw|falou|valeu|obrigad[oa]|brigad[oa]|bye|adeus|bjs|beijos|xau)$/i;
    
    // Split ORIGINAL message by newlines BEFORE normalization — supports concatenated messages like "Obrigado\nAté mais"
    const msgLines = (message || "").split(/\n/).map(l => normalizeLine(l)).filter(Boolean);
    const allLinesAreGreetingOrFarewell = msgLines.length > 0 && msgLines.every(line => greetingOrFarewellPattern.test(line));
    const hasAnyFarewell = msgLines.some(line => farewellPattern.test(line));
    const hasAnyGreeting = msgLines.some(line => greetingPattern.test(line));
    
    // Also check the single-line normalized version (for messages without newlines)
    const singleLineIsGreeting = greetingPattern.test(msgNorm);
    const singleLineIsFarewell = farewellPattern.test(msgNorm);
    
    const isGreeting = (allLinesAreGreetingOrFarewell && hasAnyGreeting) || singleLineIsGreeting;
    const isFarewell = (allLinesAreGreetingOrFarewell && hasAnyFarewell) || singleLineIsFarewell;

    if (isGreeting) {
      // Clear history if greeting arrives after 30+ min of inactivity
      const { data: recentMsgs } = await serviceClient
        .from("conversation_messages")
        .select("created_at")
        .eq("user_id", shopConfig.user_id)
        .eq("phone", cleanPhone)
        .order("created_at", { ascending: false })
        .limit(2);

      if (recentMsgs && recentMsgs.length >= 2) {
        const lastMsgTime = new Date(recentMsgs[1].created_at).getTime();
        const currentMsgTime = new Date(recentMsgs[0].created_at).getTime();
        const gapMinutes = (currentMsgTime - lastMsgTime) / (1000 * 60);

        if (gapMinutes >= 30) {
          console.log(`[NewConversation] Greeting "${message}" after ${Math.round(gapMinutes)}min gap — clearing old history and state`);
          await serviceClient
            .from("conversation_messages")
            .delete()
            .eq("user_id", shopConfig.user_id)
            .eq("phone", cleanPhone)
            .lt("created_at", recentMsgs[0].created_at);
          await clearConversationState(serviceClient, shopConfig.user_id, cleanPhone);
        }
      }
    }

    if (isFarewell) {
      // Farewells immediately mark end of conversation — clear history after AI responds
      // We'll clear AFTER sending the farewell response (see below)
      console.log(`[FarewellDetected] "${message}" — will clear history after responding`);
    }

    // Get conversation history and robust service memory for guardrails
    const conversationHistory = await getConversationHistory(serviceClient, shopConfig.user_id, cleanPhone);
    const lastMentionedService = await findLastMentionedService(serviceClient, shopConfig.user_id, cleanPhone, shopConfig.services || []);
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

    const serviceDurationForContext = lastMentionedService
      ? getServiceDuration(shopConfig.services || [], lastMentionedService)
      : null;

    // --- Load and update structured conversation state ---
    const convState = await getConversationState(serviceClient, shopConfig.user_id, cleanPhone);
    console.log(`[STATE] Loaded state for ${cleanPhone}: step=${convState.step}, service=${convState.service}, date=${convState.date}, time=${convState.time}, name=${convState.client_name}`);

    // Apply known owner name from long-term memory
    if (ownerName && !convState.client_name) {
      convState.client_name = ownerName;
    }

    // Infer state updates from the user message
    const stateUpdates = inferStateFromUserMessage(message, convState, shopConfig.services || [], ownerName, conversationHistory, lastMentionedService);
    if (Object.keys(stateUpdates).length > 0) {
      // Merge updates into current state
      Object.assign(convState, stateUpdates);
      await updateConversationState(serviceClient, shopConfig.user_id, cleanPhone, stateUpdates);
      console.log(`[STATE] Updated: step=${convState.step}, service=${convState.service}, date=${convState.date}, time=${convState.time}, name=${convState.client_name}`);
    }

    const availableSlotsForContext = serviceDurationForContext
      ? filterAvailableSlotsForService(availableSlots, serviceDurationForContext)
      : availableSlots;

    if (serviceDurationForContext) {
      console.log(`[AVAILABILITY_CONTEXT] Service "${lastMentionedService}" (${serviceDurationForContext}min) filtered for AI context`);
    }

    // --- Inject no-show recovery context if this phone has a pending recovery ---
    let recoveryContext = "";
    {
      const { data: pendingRecovery } = await serviceClient
        .from("appointments")
        .select("id, owner_name, pet_name, service, date, time, notes")
        .eq("user_id", shopConfig.user_id)
        .eq("status", "no_show")
        .eq("recovery_status", "pending")
        .not("recovery_message_sent_at", "is", null)
        .order("recovery_message_sent_at", { ascending: false })
        .limit(5);

      const recoveryForPhone = (pendingRecovery || []).filter((a: any) => {
        // Match by checking if the customer's phone from existing appointments matches
        return true; // We check all pending recoveries for this user
      });

      if (recoveryForPhone.length > 0) {
        const rec = recoveryForPhone[0];
        let slotsInfo = "";
        try {
          const notesData = typeof rec.notes === "string" ? JSON.parse(rec.notes) : rec.notes;
          const slots = notesData?.recovery_slots || [];
          slotsInfo = slots.map((s: any, i: number) => `${i + 1}) ${s.weekday} ${s.date} às ${s.time}`).join(", ");
        } catch { /* ignore */ }

        recoveryContext = `\n\nCONTEXTO DE RECUPERAÇÃO DE FALTA:
Este cliente faltou a um agendamento anterior de "${rec.service}" marcado para ${rec.date} às ${rec.time}.
Já enviamos uma mensagem de recuperação oferecendo horários: ${slotsInfo || "horários disponíveis"}.
O cliente está respondendo sobre essa remarcação. Ajude-o a escolher um novo horário usando os horários disponíveis acima.
Se o cliente pedir outro horário diferente dos sugeridos, ofereça as opções da lista de disponibilidade.
Mantenha o mesmo serviço (${rec.service}) a menos que o cliente peça para mudar.`;
      }
    }

    // Inject structured conversation state into prompt
    const stateContext = buildStateContext(convState);

    // Build automatic conversation summary from last 3 turns
    const conversationSummary = buildConversationSummary(conversationHistory);

    const systemPrompt = buildSystemPrompt(shopConfig, cleanPhone, existingAppointments, customerApptsText, availableSlotsForContext, maxConcurrent) + longTermMemory + recoveryContext + stateContext + conversationSummary;

    // Log conversation history for debugging context loss
    console.log(`[CONTEXT] Conversation history for ${cleanPhone}: ${conversationHistory.length} messages`);
    if (conversationHistory.length > 0) {
      console.log(`[CONTEXT] History preview: ${JSON.stringify(conversationHistory.map(m => ({ role: m.role, content: m.content.substring(0, 60) })))}`);
    }

    // Build messages array with history
    const aiMessages: { role: string; content: string }[] = [
      { role: "system", content: systemPrompt },
      ...conversationHistory,
    ];

    // CRITICAL: If there's conversation history (not first message), append reminder
    // directly to the system prompt to prevent leaking as a separate message
    const hasAssistantInHistory = conversationHistory.some(m => m.role === "assistant");
    if (hasAssistantInHistory) {
      aiMessages[0].content += "\n\nLEMBRETE INTERNO (NUNCA inclua isto na resposta): Você já se apresentou nesta conversa. NÃO cumprimente novamente. Responda DIRETAMENTE ao que o cliente está pedindo.";
    }

    // --- DETERMINISTIC BOOKING SHORTCUT ---
    // When user selects a time from a list the AI just presented, bypass the AI entirely
    // to prevent context loss, hallucinations, and re-asking for information.
    const deterministicBookingResult = await tryDeterministicBooking(
      serviceClient, shopConfig, cleanPhone, message, conversationHistory,
      ownerName, lastMentionedService, convState.service, isPetNiche, instanceName, senderPhone,
      availableSlots, appointments || [], isFarewell
    );
    if (deterministicBookingResult) {
      return new Response(JSON.stringify({ success: true, reply: deterministicBookingResult }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Call AI
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY not configured");
      // Send a graceful fallback message instead of exposing the error
      const nicheEmojiMap: Record<string, string> = { petshop: "🐾", veterinaria: "🐾", salao: "💇‍♀️", barbearia: "💈", estetica: "✨", clinica: "🏥", escritorio: "📋", outros: "😊" };
      const fallbackEmoji = nicheEmojiMap[shopConfig.niche] || nicheEmojiMap.outros;
      const fallbackMsg = `Olá! No momento estou com uma instabilidade temporária. Por favor, tente novamente em alguns minutinhos! ${fallbackEmoji}`;
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
        model: "google/gemini-3-flash-preview",
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
      const nicheEmojiMap2: Record<string, string> = { petshop: "🐾", veterinaria: "🐾", salao: "💇‍♀️", barbearia: "💈", estetica: "✨", clinica: "🏥", escritorio: "📋", outros: "😊" };
      const fallbackEmoji2 = nicheEmojiMap2[shopConfig.niche] || nicheEmojiMap2.outros;
      const fallbackMsg = `Olá! Estou com uma instabilidade temporária, mas já já volto! Tente novamente em alguns minutinhos ${fallbackEmoji2}`;
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
      console.warn("Empty or emoji-only AI reply (stripping any action blocks), retrying with gemini-2.5-flash-lite...", JSON.stringify({ content_preview: reply?.substring(0, 200) }));
      
      // Build retry messages with an extra reinforcement instruction
      // CRITICAL: Tell the retry model NOT to generate action blocks — the original response was confused
      const retryMessages = [
        ...aiMessages,
        { role: "user", content: "INSTRUÇÃO DO SISTEMA: Sua última resposta continha apenas emojis ou estava vazia. Responda OBRIGATORIAMENTE com TEXTO ESCRITO em português. NÃO inclua blocos <action>. Apenas responda ao cliente de forma natural e textual." },
      ];
      
      const retryResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash-lite",
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
          console.log("Retry succeeded with gemini-2.5-flash-lite");
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

    // Guardrail 0: GreetingGuard — simple greetings/farewells must NEVER trigger booking actions
    // Reuse the multiline-aware detection from above
    const isSimpleGreeting = allLinesAreGreetingOrFarewell;
    if (isSimpleGreeting && /<action>.*?<\/action>/s.test(reply)) {
      console.log(`[GreetingGuard] Simple greeting/farewell "${message}" triggered an action block — stripping action to prevent false booking`);
      reply = reply.replace(/<action>.*?<\/action>/gs, "").trim();
      // If stripping the action leaves a "confirmation" text, clean it up
      if (!reply || reply.length < 5 || /agendamento\s+confirmado/i.test(reply)) {
        // Generate appropriate farewell or greeting response
        if (isFarewell) {
          const nicheEmojiMap3: Record<string, string> = { petshop: "🐾", veterinaria: "🐾", salao: "💇‍♀️", barbearia: "💈", estetica: "✨", clinica: "🏥", escritorio: "📋", outros: "😊" };
          const emoji = nicheEmojiMap3[shopConfig.niche] || "😊";
          reply = `Por nada! Qualquer coisa é só chamar ${emoji}`;
        } else {
          reply = "";
        }
      }
    }
    
    // Extra safety: even without action blocks, farewell messages should never get booking confirmations
    if (isSimpleGreeting && /agendamento\s+confirmado/i.test(reply)) {
      console.log(`[GreetingGuard] Farewell/greeting got a booking confirmation text — replacing with proper response`);
      if (isFarewell) {
        const nicheEmojiMap4: Record<string, string> = { petshop: "🐾", veterinaria: "🐾", salao: "💇‍♀️", barbearia: "💈", estetica: "✨", clinica: "🏥", escritorio: "📋", outros: "😊" };
        reply = `Por nada! Qualquer coisa é só chamar ${nicheEmojiMap4[shopConfig.niche] || "😊"}`;
      } else {
        reply = reply.replace(/agendamento\s+confirmado.*$/gis, "").trim();
      }
    }

    // Guardrail: ReGreetingGuard — if AI replied with a generic greeting but conversation already has history, retry and force a direct reply
    const genericGreetingReplyPattern = /^(?:\s*(?:senhor|senhora)[,\s]+)?(?:boa\s+(?:tarde|noite)|bom\s+dia|ol[aá]|oi)(?:[,\s]+(?:senhor|senhora))?[!.,\s]*(?:me\s+diga[,\s]*)?(?:como\s+posso|em\s+que\s+posso|como\s+(te\s+)?ajud|estou\s+[àa]\s+disposi[çc][ãa]o|me\s+diga|diga|fale)/i;
    const stripGreetingPrefix = (text: string) =>
      text
        .replace(/^(?:\s*(?:senhor|senhora)[,\s]+)?(?:boa\s+(?:tarde|noite)|bom\s+dia|ol[aá]|oi)(?:[,\s]+(?:senhor|senhora))?[!.,\s]*/i, "")
        .replace(/^(?:me\s+diga[,\s]*)?(?:como\s+posso|em\s+que\s+posso|como\s+(?:te\s+)?ajud[aeo]?|diga|fale)[^\n]*\??\s*/i, "")
        .trim();

    const isGenericGreetingOnlyReply = (text: string) => {
      const normalized = (text || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .trim();

      if (!normalized) return false;
      const startsWithGreeting = /^(?:senhor[,\s]+|senhora[,\s]+)?(?:bom dia|boa tarde|boa noite|ola|oi)(?:[,\s]+(?:senhor|senhora))?/.test(normalized);
      const hasGenericHelpPrompt = /(em que posso ajudar|como posso ajudar|como posso te ajudar|me diga|diga|fale)/.test(normalized);
      const hasBookingContent = /(agend|horario|data|servico|disponiv|sexta|segunda|terca|quarta|quinta|sabado|domingo)/.test(normalized);

      return startsWithGreeting && hasGenericHelpPrompt && !hasBookingContent;
    };

    const aiGaveGenericGreeting = isGenericGreetingOnlyReply(reply) || genericGreetingReplyPattern.test(reply.trim());

    if (aiGaveGenericGreeting && hasAssistantInHistory) {
      console.log(`[ReGreetingGuard] AI re-greeted despite existing conversation history. User msg: "${message}", AI reply: "${reply.substring(0, 80)}..." — retrying`);

      const retryMessages = [
        ...aiMessages,
        { role: "assistant", content: reply },
        { role: "user", content: `INSTRUÇÃO URGENTE DO SISTEMA: Sua resposta anterior foi uma saudação genérica, mas esta conversa JÁ ESTÁ EM ANDAMENTO. O cliente disse: "${message}". Responda DIRETAMENTE ao que ele pediu. NÃO cumprimente. NÃO se apresente. Se ele quer agendar, informe os horários disponíveis. Se ele fez uma pergunta, responda.` },
      ];

      try {
        const retryResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-3-flash-preview",
            messages: retryMessages,
            max_completion_tokens: 4096,
          }),
        });

        if (retryResponse.ok) {
          const retryData = await retryResponse.json();
          const retryReply = retryData.choices?.[0]?.message?.content;
          if (retryReply && retryReply.trim().length > 5 && !isGenericGreetingOnlyReply(retryReply) && !genericGreetingReplyPattern.test(retryReply.trim())) {
            console.log(`[ReGreetingGuard] Retry succeeded: "${retryReply.substring(0, 80)}..."`);
            reply = retryReply;
            aiData = retryData;
          } else if (retryReply) {
            const strippedRetry = stripGreetingPrefix(retryReply);
            if (strippedRetry.length > 5) {
              console.log("[ReGreetingGuard] Retry still greeted — greeting prefix stripped deterministically");
              reply = strippedRetry;
              aiData = retryData;
            }
          }
        }
      } catch (retryErr) {
        console.error("[ReGreetingGuard] Retry failed:", retryErr);
      }

      // Last fallback: if greeting survived and user is clearly choosing a time, keep booking context instead of re-greeting
      if (isGenericGreetingOnlyReply(reply) || genericGreetingReplyPattern.test(reply.trim())) {
        const normalizedMsg = (message || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
        const userIsChoosingTime = /\b([01]?\d|2[0-3])(:[0-5]\d)?\b|\bas\s+([01]?\d|2[0-3])\b|\b([01]?\d|2[0-3])h\b/.test(normalizedMsg);
        if (userIsChoosingTime) {
          reply = lastMentionedService
            ? "Perfeito! Para confirmar esse horário, me diz seu nome, por favor."
            : "Perfeito, esse horário está disponível ✅ Me confirma qual serviço você quer nesse horário para eu finalizar o agendamento.";
          console.log("[ReGreetingGuard] Applied deterministic fallback for time-selection message");
        }
      }
    }

    // Deterministic safeguards for booking flow
    reply = enforceBookingDateTimeQuestion(message, reply);
    reply = enforceKnownServiceNoRedundantQuestion(message, reply, shopConfig.services || [], conversationHistory, lastMentionedService || convState.service);
    reply = enforceBookingIntentContinuation(message, reply, shopConfig.services || [], lastMentionedService || convState.service, availableSlotsForContext);
    reply = enforceBookingDateTimeQuestion(message, reply);
    reply = enforceNoRedundantTimeQuestion(message, reply, conversationHistory);

    // Track AI usage with latency
    const tokensUsed = aiData.usage?.total_tokens || 0;
    await serviceClient.from("ai_usage").insert({
      user_id: shopConfig.user_id,
      tokens_used: tokensUsed,
      request_type: "whatsapp_chat",
      model: "gemini-3-flash-preview",
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

    // Preserve scheduling questions (service choice + date/time) in booking flows
    const isBookingFlowMessage = isBookingFlowContext(message, reply);

    // Guardrail 1: never send more than one question in a single message
    if (!isBookingFlowMessage) {
      reply = enforceSingleQuestionPerReply(reply);
    }

    // Guardrail 2: never send a question right after another assistant question
    if (!isBookingFlowMessage && (shouldSuppressRepeatedQuestion(lastAssistantMessage, reply) || shouldSuppressConsecutiveQuestion(lastAssistantMessage, reply))) {
      console.log("Suppressing consecutive question in AI reply");
      reply = removeRepeatedQuestion(reply);
    }

    // Guardrail 3: If AI is about to create an appointment but we don't know the client's name, block the action and ask for it
    const ownerNameFromHistory = pastCustomerAppts?.[0]?.owner_name || customerAppointments?.[0]?.owner_name || null;
    const replyHasAction = /<action>.*?<\/action>/s.test(reply);
    
    if (replyHasAction && !ownerNameFromHistory) {
      // Check if the action has an owner_name filled
      const actionContent = reply.match(/<action>(.*?)<\/action>/s)?.[1] || "";
      let actionHasName = false;
      try {
        const actionJson = JSON.parse(actionContent);
        actionHasName = !!actionJson.owner_name && actionJson.owner_name !== "—" && actionJson.owner_name.length >= 2;
      } catch { /* ignore */ }
      
      if (!actionHasName) {
        console.log("[NameGuard] AI tried to create appointment without client name. Blocking action.");
        // Remove the action block and ask for the name
        reply = reply.replace(/<action>.*?<\/action>/s, "").trim();
        // Clean up any broken confirmation text
        reply = reply.replace(/(agendamento\s+confirmado\s*✅?)/gi, "").trim();
        if (!reply || reply.length < 5) {
          reply = "Quase lá! Qual o seu nome para eu finalizar o agendamento? 😊";
        } else {
          reply += "\n\nQual o seu nome para eu finalizar? 😊";
        }
      }
    }

    // Guardrail 4: for "agendar mais um", never auto-reuse previous slot without explicit new date/time
    reply = enforceAdditionalBookingIntentGuard(message, reply, lastAssistantMessage);

    // Guardrail 5: if user says "amanhã" but AI used today's date, correct deterministically
    reply = enforceDateCorrectionGuard(message, reply);

    // Process actions (create/cancel/reschedule/confirm)
    reply = await processAction(serviceClient, shopConfig, cleanPhone, reply, message, lastAssistantMessage);

    // Re-check against latest persisted assistant message to avoid race conditions
    const latestAssistantBeforeSend = await getLatestAssistantMessage(
      serviceClient,
      shopConfig.user_id,
      cleanPhone
    );
    if (!isBookingFlowMessage && shouldSuppressConsecutiveQuestion(latestAssistantBeforeSend, reply)) {
      console.log("Suppressing race-condition consecutive question in AI reply");
      reply = removeRepeatedQuestion(reply);
    }

    // Sanitize any leaked system instructions before saving/sending
    reply = sanitizeLeakedInstructions(reply);

    // Save assistant reply to history
    await saveMessage(serviceClient, shopConfig.user_id, cleanPhone, "assistant", reply);

    // Message counter already incremented at the start of processing (line ~1614)

    // Send reply via WhatsApp
    await sendWhatsAppMessage(instanceName, senderPhone, reply);

    // --- Post-reply state update: detect if a booking was completed ---
    if (/agendamento\s+confirmado/i.test(reply) || (reply.includes('<action>') && reply.includes('"type"') && reply.includes('"create"'))) {
      await updateConversationState(serviceClient, shopConfig.user_id, cleanPhone, stateAfterBooking());
      console.log(`[STATE] Booking completed — state reset to post_booking`);
    }

    // --- Farewell Cleanup: clear conversation history AND state after responding to farewell ---
    if (isFarewell) {
      console.log(`[FarewellCleanup] Clearing conversation history and state for ${cleanPhone} after farewell`);
      await serviceClient
        .from("conversation_messages")
        .delete()
        .eq("user_id", shopConfig.user_id)
        .eq("phone", cleanPhone);
      await clearConversationState(serviceClient, shopConfig.user_id, cleanPhone);
    }

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
