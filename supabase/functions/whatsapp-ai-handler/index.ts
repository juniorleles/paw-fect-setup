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

  const normalizedUserMessage = normalize(userMessage || "");
  const normalizedReply = normalize(reply || "");

  const serviceList = (services || [])
    .map((s: any) => ({ original: s?.name || "", normalized: normalize(s?.name || "") }))
    .filter((s: { original: string; normalized: string }) => s.normalized.length > 1);

  let matchedService = serviceList
    .find((s: { original: string; normalized: string }) => normalizedUserMessage.includes(s.normalized))?.original;

  if (!matchedService && knownServiceHint) {
    const normalizedKnownService = normalize(knownServiceHint);
    matchedService = serviceList.find((s: { original: string; normalized: string }) => s.normalized === normalizedKnownService)?.original || knownServiceHint;
  }

  if (!matchedService && conversationHistory) {
    const allNormalized = conversationHistory
      .slice(-12)
      .map((m) => ({ role: m.role, normalized: normalize(m.content || "") }));

    for (const msg of [...allNormalized].reverse()) {
      if (msg.role !== "user") continue;
      matchedService = serviceList
        .find((s: { original: string; normalized: string }) => msg.normalized.includes(s.normalized))?.original;
      if (matchedService) break;
    }

    if (!matchedService) {
      for (const msg of [...allNormalized].reverse()) {
        matchedService = serviceList
          .find((s: { original: string; normalized: string }) => msg.normalized.includes(s.normalized))?.original;
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

  const serviceList = (services || [])
    .map((s: any) => ({ original: s?.name || "", normalized: normalize(s?.name || "") }))
    .filter((s: { original: string; normalized: string }) => s.normalized.length > 1);

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
    const found = serviceList.find((s: { original: string; normalized: string }) => normalizedMessage.includes(s.normalized));
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
REGRA CRÍTICA: Quando listar horários disponíveis, SEMPRE termine com uma pergunta pedindo que o cliente escolha (ex: "Qual horário você prefere?"). NUNCA liste horários sem perguntar qual o cliente quer. A lista de horários sem pergunta NÃO é uma resposta válida.
REGRA DE FORMATAÇÃO DE HORÁRIOS (CRÍTICA): Quando listar horários disponíveis para o cliente, LISTE CADA HORÁRIO INDIVIDUALMENTE usando bullet points. NUNCA resuma, comprima ou agrupe horários em faixas como "08:00 até 15:00 (vários horários)". Isso é PROIBIDO. Se houver muitos horários, selecione os 5-6 melhores opções e liste cada um individualmente. Exemplo CORRETO:
• 08:00
• 09:00
• 10:30
• 14:00
• 16:00
Exemplo ERRADO: "08:00 até 15:00 (vários horários)" — isso NÃO é aceitável.

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
REGRA PÓS-AGENDAMENTO: Após confirmar, NÃO faça NENHUMA pergunta adicional. Encerre de forma limpa.
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

async function processAction(serviceClient: any, shopConfig: PetShopConfig, cleanPhone: string, reply: string): Promise<string> {
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
      
      // Strip any action blocks from the confused response to prevent wrong actions
      const strippedReply = reply?.replace(/<action>.*?<\/action>/gs, "").trim();
      console.warn("Empty or emoji-only AI reply, retrying with gemini-2.5-flash-lite...", JSON.stringify({ content_preview: reply?.substring(0, 100) }));
      
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

    // Deterministic safeguards for booking flow
    reply = enforceBookingDateTimeQuestion(message, reply);
    reply = enforceKnownServiceNoRedundantQuestion(message, reply, shopConfig.services || [], conversationHistory, lastMentionedService);
    reply = enforceBookingDateTimeQuestion(message, reply);

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

    // Process actions (create/cancel/reschedule/confirm)
    reply = await processAction(serviceClient, shopConfig, cleanPhone, reply);

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
