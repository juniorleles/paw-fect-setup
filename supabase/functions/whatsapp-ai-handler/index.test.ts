import "https://deno.land/std@0.224.0/dotenv/load.ts";
import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";

// ---- Copy guardrail functions inline for unit testing ----

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

function countQuestions(text: string): number {
  const normalized = normalizeQuestionText(text);
  return (normalized.match(/\?/g) || []).length;
}

function hasAnyQuestion(text: string): boolean {
  return countQuestions(text) > 0;
}

function extractPrimaryQuestion(text: string): string {
  const normalized = normalizeQuestionText(text);
  const pieces = normalized.split("?").map((p) => p.trim()).filter(Boolean);
  if (pieces.length === 0) return "";
  return pieces[pieces.length - 1];
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
  const lines = reply.split("\n").map((l) => l.trim()).filter(Boolean);
  let questionKept = false;
  const compact: string[] = [];
  for (const line of lines) {
    const isQuestion = line.includes("?");
    if (!isQuestion) { compact.push(line); continue; }
    if (!questionKept) { compact.push(line); questionKept = true; }
  }
  const sanitized = compact.join("\n").trim();
  if (sanitized) return sanitized;
  return "Perfeito, informação anotada. Vou seguir com o seu atendimento.";
}

function removeRepeatedQuestion(reply: string): string {
  const lines = reply.split("\n").map((l) => l.trim()).filter(Boolean);
  const withoutQuestions = lines.filter((line) => !line.includes("?"));
  const sanitized = withoutQuestions.join("\n").trim();
  if (sanitized) return sanitized;
  return "Perfeito, informação anotada. Vou seguir com o seu atendimento.";
}

function isBookingFlowContext(userMessage: string, reply: string): boolean {
  const bookingIntent = /(agendar|agendamento|marcar|quero\s+(fazer|cortar|agendar|marcar|manicure|pedicure|escova|banho|tosa)|gostaria\s+de\s+agendar|quero\s+\w+\s+(segunda|terça|quarta|quinta|sexta|s[aá]bado|domingo|amanh[aã]|hoje))/i.test(userMessage || "");
  const dateTimeReference = /\b(amanh[aã]|hoje|segunda|terça|ter[cç]a|quarta|quinta|sexta|s[aá]bado|domingo|\d{1,2}[h:]|\d{1,2}:\d{2})\b/i.test(userMessage || "") || /[àa]s\s+\d{1,2}/i.test((userMessage || "").normalize("NFD").replace(/[\u0300-\u036f]/g, ""));
  const schedulingReply = /(hor[aá]rios?\s+dispon[ií]veis?|qual\s+hor[aá]rio\s+voc[eê]\s+prefere|pra\s+qual\s+dia\s+e\s+hor[aá]rio|qual\s+dia\s+e\s+hor[aá]rio)/i.test(reply || "");
  return bookingIntent || dateTimeReference || schedulingReply;
}

function enforceKnownServiceNoRedundantQuestion(userMessage: string, reply: string, services: any[], conversationHistory?: { role: string; content: string }[]): string {
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

  const listsServiceOptions = (() => {
    if (!matchedService) return false;
    let count = 0;
    for (const svc of serviceList) {
      if (normalizedReply.includes(svc.normalized)) count++;
    }
    return count >= 3 && /[•\-·]/.test(reply);
  })();

  const dateCorrectionOnly = /(ops|opa|corrigindo|na\s+verdade|muda|troca|amanha|hoje|segunda|terca|quarta|quinta|sexta|sabado|domingo|\d{1,2}h|\d{1,2}:\d{2})/i.test(normalizedUserMessage);

  const extractUserTimeIntent = (text: string): { exact?: string; hour?: string } => {
    const norm = text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    const exactMatch = norm.match(/\b([01]?\d|2[0-3])[:h]([0-5]\d)\b/);
    if (exactMatch) return { exact: `${exactMatch[1].padStart(2, "0")}:${exactMatch[2]}` };
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
    return [...new Set(text.match(/\b([01]\d|2[0-3]):[0-5]\d\b/g) || [])];
  };

  const inferDateLabel = (): string => {
    const userNorm = normalize(userMessage || "");
    if (/\bamanha\b/.test(userNorm)) return "amanhã";
    if (/\bhoje\b/.test(userNorm)) return "hoje";
    const lastAssistant = normalize(getLastAssistantMessageFromHistory());
    if (/\bamanha\b/.test(lastAssistant)) return "amanhã";
    if (/\bhoje\b/.test(lastAssistant)) return "hoje";
    return "o dia combinado";
  };

  // PRIORITY: service known + user provides time → intercept ONLY if AI reply is wrong
  if (matchedService) {
    const userTimeIntent = extractUserTimeIntent(userMessage || "");
    if (userTimeIntent.exact || userTimeIntent.hour) {
      // First: check if the AI reply already correctly mentions the service and does NOT ask for it again
      const replyAlreadyCorrect = !asksForServiceAgain && !listsServiceOptions &&
        normalizedReply.includes(normalize(matchedService));

      if (replyAlreadyCorrect) {
        return reply;
      }

      const lastAssistantMessage = getLastAssistantMessageFromHistory();
      const availableSlots = extractAvailableSlotsFromText(lastAssistantMessage);
      const compatibleSlots = availableSlots.filter((slot) => {
        if (userTimeIntent.exact) return slot === userTimeIntent.exact;
        if (userTimeIntent.hour) return slot.startsWith(`${userTimeIntent.hour}:`);
        return false;
      });
      if (compatibleSlots.length > 1) return `Perfeito 😊 Você prefere ${compatibleSlots.join(" ou ")}?`;
      if (compatibleSlots.length === 1) return `Perfeito 😊 ${matchedService} para ${inferDateLabel()} às ${compatibleSlots[0]}. Deseja confirmar?`;
      if (asksForServiceAgain || listsServiceOptions) return `Perfeito, ${matchedService}! Qual horário você prefere?`;
    }
  }

  if (!matchedService) {
    if ((asksForServiceAgain || listsServiceOptions) && dateCorrectionOnly) {
      // strip
    } else {
      return reply;
    }
  }

  if (!asksForServiceAgain && !listsServiceOptions) return reply;

  const lines = reply.split("\n");
  const cleaned: string[] = [];
  for (const rawLine of lines) {
    const line = rawLine.trim();
    const normalizedLine = normalize(line);
    if (/^[•\-·]/.test(line)) {
      const isSvcListing = serviceList.some((s: { original: string; normalized: string }) => normalizedLine.includes(s.normalized));
      if (isSvcListing && /r\$|\d+\s*min/.test(normalizedLine)) continue;
    }
    if (serviceQuestionPattern.test(normalizedLine)) {
      if (/horario/i.test(normalizedLine) && matchedService) {
        cleaned.push(`Perfeito, ${matchedService}! Qual horário você prefere?`);
      }
      continue;
    }
    cleaned.push(rawLine);
  }

  const sanitized = cleaned.join("\n").replace(/\n{3,}/g, "\n\n").trim();
  return sanitized || (matchedService ? `Perfeito, ${matchedService}! Qual horário você prefere?` : "Perfeito! Qual horário você prefere?");
}


// ---- Simulate the full pipeline ----
function applyGuardrails(userMessage: string, lastAssistantMsg: string, rawReply: string): string {
  const isBookingFlowMessage = isBookingFlowContext(userMessage, rawReply);

  // Guardrail 1: max 1 question per reply (except booking flow)
  let reply = isBookingFlowMessage ? rawReply : enforceSingleQuestionPerReply(rawReply);

  // Guardrail 2: no question after a question (except booking flow)
  if (!isBookingFlowMessage && (shouldSuppressRepeatedQuestion(lastAssistantMsg, reply) || shouldSuppressConsecutiveQuestion(lastAssistantMsg, reply))) {
    reply = removeRepeatedQuestion(reply);
  }
  return reply;
}

// ====================== TESTS ======================

Deno.test("enforceSingleQuestionPerReply: keeps only first question", () => {
  const input = "Fechamos às 18:00 hoje.\nEscova 30 min + Manicure 60 min = 90 min.\nQuer que eu reserve às 16:30 ou prefere outro horário da lista?\nQual seu nome para registrar o agendamento?";
  const result = enforceSingleQuestionPerReply(input);
  const questionCount = (result.match(/\?/g) || []).length;
  assertEquals(questionCount, 1, "Should have exactly 1 question");
  assertEquals(result.includes("Qual seu nome"), false, "Second question should be removed");
});

Deno.test("shouldSuppressConsecutiveQuestion: blocks question after question", () => {
  const lastAssistant = "Quer que eu reserve às 16:30 ou prefere outro horário da lista?";
  const currentReply = "Perfeito 😊\nQual seu nome para registrar o agendamento?";
  const result = shouldSuppressConsecutiveQuestion(lastAssistant, currentReply);
  assertEquals(result, true, "Should suppress consecutive question");
});

Deno.test("shouldSuppressConsecutiveQuestion: allows question after statement", () => {
  const lastAssistant = "Perfeito, informação anotada. Vou seguir com o seu atendimento.";
  const currentReply = "Qual seu nome para registrar o agendamento?";
  const result = shouldSuppressConsecutiveQuestion(lastAssistant, currentReply);
  assertEquals(result, false, "Should NOT suppress question after a statement");
});

Deno.test("Full pipeline: two questions in reply after previous question → only statement remains", () => {
  const userMessage = "ok";
  const lastAssistant = "Quer que eu reserve às 16:30 ou prefere outro horário da lista? 😊";
  const rawReply = "Perfeito 😊\nQual seu nome para registrar o agendamento?";
  const result = applyGuardrails(userMessage, lastAssistant, rawReply);
  
  const hasQuestion = result.includes("?");
  assertEquals(hasQuestion, false, "No questions should remain");
  console.log("Final reply:", result);
});

Deno.test("Full pipeline: question after statement → question preserved", () => {
  const userMessage = "ok";
  const lastAssistant = "Entendido, anotei o horário das 16h.";
  const rawReply = "Qual seu nome para registrar o agendamento?";
  const result = applyGuardrails(userMessage, lastAssistant, rawReply);
  
  assertEquals(result.includes("?"), true, "Question should be preserved");
});

Deno.test("Booking flow: preserve time-choice question even after previous question", () => {
  const userMessage = "Quero manicure sábado";
  const lastAssistant = "Perfeito! Qual serviço você prefere?";
  const rawReply = "Manicure para sábado (28/02/2026).\nHorários disponíveis:\n• 08:00 • 08:30 • 09:00\nQual horário você prefere?";
  const result = applyGuardrails(userMessage, lastAssistant, rawReply);

  assertEquals(result.includes("Qual horário você prefere?"), true, "Must preserve booking question");
});

Deno.test("Booking flow: 'ops amanhã' date correction preserves scheduling question", () => {
  const userMessage = "Ops amanhã";
  const lastAssistant = "Manicure para hoje.\nHorários disponíveis:\n• 14:00 • 15:00\nQual horário você prefere?";
  const rawReply = "Manicure para amanhã (01/03/2026).\nHorários disponíveis:\n• 08:00 • 09:00 • 10:00\nQual horário você prefere?";
  const result = applyGuardrails(userMessage, lastAssistant, rawReply);

  assertEquals(result.includes("Qual horário você prefere?"), true, "Must preserve booking question after date correction");
});

Deno.test("removeRepeatedQuestion: fallback when only question in reply", () => {
  const reply = "Qual seu nome para registrar o agendamento?";
  const result = removeRepeatedQuestion(reply);
  assertEquals(result, "Perfeito, informação anotada. Vou seguir com o seu atendimento.");
});

Deno.test("Full pipeline: exact screenshot scenario", () => {
  // Simulating the exact scenario from the user's screenshot
  const userMessage = "ok";
  const lastAssistant = "Fechamos às 18:00 hoje.\nEscova 30 min + Manicure 60 min = 90 min.\nEx.: começando às 16:30, termina às 18:00.\nQuer que eu reserve às 16:30 ou prefere outro horário da lista? 😊";
  
  // This is the problematic second message
  const rawReply = "Perfeito 😊\nQual seu nome para registrar o agendamento?";
  
  const result = applyGuardrails(userMessage, lastAssistant, rawReply);
  
  const hasQuestion = result.includes("?");
  assertEquals(hasQuestion, false, "Should NOT have any question since previous message had a question");
  console.log("Screenshot scenario result:", result);
});

Deno.test("Redundant service guard: 'manicure' from history removes service question", () => {
  const services = [
    { name: "Manicure", price: 50, duration: 60 },
    { name: "Pedicure", price: 60, duration: 60 },
  ];
  const conversationHistory = [
    { role: "user", content: "Quero marcar manicure hj" },
    { role: "assistant", content: "Manicure para hoje!\nHorários disponíveis:\n• 14:00 • 15:00\nQual horário você prefere?" },
    { role: "user", content: "Ops amanhã" },
  ];
  const rawReply = "Sem problemas!\nTemos estes horários disponíveis:\n• 08:00, 08:30, 09:00\nQual desses você prefere e qual seria o serviço? 😊";
  
  const result = enforceKnownServiceNoRedundantQuestion("Ops amanhã", rawReply, services, conversationHistory);
  
  assertEquals(result.includes("qual seria o serviço"), false, "Should NOT ask for service again");
  assertEquals(result.includes("qual serviço"), false, "Should NOT ask for service (variation)");
  assertEquals(result.includes("08:00") || result.includes("horários disponíveis"), true, "Should preserve time slots");
  console.log("Redundant service guard result:", result);
});

Deno.test("Redundant service guard: exact screenshot scenario with 'deseja agendar'", () => {
  const services = [
    { name: "Manicure", price: 50, duration: 60 },
    { name: "Pedicure", price: 60, duration: 60 },
  ];
  const conversationHistory = [
    { role: "user", content: "Quero marcar manicure hj\nOps amanhã" },
  ];
  const rawReply = "Sem problemas! Para amanhã, sábado (28/02), temos estes horários disponíveis:\n\n· 08:00, 08:30, 09:00, 09:30, 10:00, 10:30, 11:00, 11:30, 12:00 e 12:30.\n\nQual desses você prefere e qual serviço deseja agendar? 😊";
  
  const result = enforceKnownServiceNoRedundantQuestion("Quero marcar manicure hj\nOps amanhã", rawReply, services, conversationHistory);
  
  assertEquals(result.includes("qual serviço deseja agendar"), false, "Should NOT ask for service");
  assertEquals(result.includes("08:00"), true, "Should preserve time slots");
  assertEquals(result.includes("horário") || result.includes("Qual horário"), true, "Should have a time question instead");
  console.log("Screenshot scenario result:", result);
});

function removeConsecutiveDuplicateUserMessages(messages: { role: string; content: string }[]) {
  const normalizeForDedup = (text: string) => (text || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();

  const cleaned: { role: string; content: string }[] = [];
  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];
    const next = messages[i + 1];

    if (msg.role === "user" && next && next.role === "user") {
      const currentNorm = normalizeForDedup(msg.content || "");
      const nextNorm = normalizeForDedup(next.content || "");
      if (currentNorm === nextNorm) continue;
    }

    cleaned.push(msg);
  }

  return cleaned;
}

Deno.test("History dedup: keeps distinct consecutive user messages needed for context", () => {
  const history = [
    { role: "user", content: "Quero marcar manicure hj" },
    { role: "user", content: "Ops amanhã" },
    { role: "assistant", content: "Sem problemas!" },
  ];

  const cleaned = removeConsecutiveDuplicateUserMessages(history);
  assertEquals(cleaned.length, 3, "Distinct consecutive user messages must be preserved");
  assertEquals(cleaned[0].content, "Quero marcar manicure hj");
  assertEquals(cleaned[1].content, "Ops amanhã");
});

// ====================== SCENARIO TEST: "Quero marcar manicure hj" + "Ops amanhã" ======================

Deno.test("SCENARIO: 'Quero marcar manicure hj' → 'Ops amanhã' → AI must NOT ask for service again", () => {
  const services = [
    { name: "Escova", price: 50, duration: 30 },
    { name: "Manicure", price: 50, duration: 60 },
    { name: "Pedicure", price: 50, duration: 60 },
    { name: "Pintura cabelo", price: 100, duration: 60 },
  ];

  const conversationHistory = [
    { role: "user", content: "Quero marcar manicure hj" },
    { role: "assistant", content: "Manicure para hoje! 💅\nHorários disponíveis:\n• 14:00\n• 15:00\n• 16:00\nQual horário você prefere?" },
    { role: "user", content: "Ops amanhã" },
  ];

  const rawReply = "Sem problemas! Para amanhã, sábado (01/03), temos estes horários disponíveis:\n\n• 08:00, 08:30, 09:00, 09:30, 10:00, 10:30, 11:00, 11:30, 12:00 e 12:30.\n\nQual serviço você gostaria de agendar e em qual desses horários? 😊";

  const result = enforceKnownServiceNoRedundantQuestion("Ops amanhã", rawReply, services, conversationHistory);

  console.log("\n=== SCENARIO RESULT ===");
  console.log("Input: 'Ops amanhã'");
  console.log("Service from history: Manicure");
  console.log("Output:\n" + result);
  console.log("=== END ===\n");

  assertEquals(result.includes("qual serviço"), false, "Should NOT ask 'qual serviço'");
  assertEquals(result.includes("Qual serviço"), false, "Should NOT ask 'Qual serviço'");
  assertEquals(result.includes("gostaria de agendar"), false, "Should NOT ask 'gostaria de agendar'");
  assertEquals(result.includes("08:00") || result.includes("horário"), true, "Should preserve time info");
});

Deno.test("SCENARIO: full flow → 'Às 8' after manicure selected → must NOT list services", () => {
  const services = [
    { name: "Escova", price: 50, duration: 30 },
    { name: "Manicure", price: 50, duration: 60 },
    { name: "Pedicure", price: 50, duration: 60 },
  ];

  const conversationHistory = [
    { role: "user", content: "Quero marcar manicure hj" },
    { role: "assistant", content: "Manicure para hoje! 💅\nHorários disponíveis:\n• 14:00 • 15:00\nQual horário você prefere?" },
    { role: "user", content: "Ops amanhã" },
    { role: "assistant", content: "Sem problemas! Para amanhã temos:\n• 08:00\n• 08:30\n• 09:00\nQual horário você prefere?" },
    { role: "user", content: "Às 8" },
  ];

  const rawReply = "Para às 08:00 temos disponibilidade! 😊\n\nQual serviço você gostaria de agendar?\n\n• Escova: R$50\n• Manicure: R$50\n• Pedicure: R$50";

  const result = enforceKnownServiceNoRedundantQuestion("Às 8", rawReply, services, conversationHistory);

  console.log("\n=== SCENARIO 2 RESULT ===");
  console.log("Input: 'Às 8'");
  console.log("Service from history: Manicure");
  console.log("Output:\n" + result);
  console.log("=== END ===\n");

  assertEquals(result.includes("Qual serviço"), false, "Should NOT ask for service");
  assertEquals(result.includes("qual serviço"), false, "Should NOT ask for service (lc)");
  assertEquals(result.includes("Escova: R$"), false, "Should NOT list services");
  assertEquals(result.includes("08:00") || result.includes("08:30") || result.includes("Manicure") || result.includes("horário"), true, "Should reference time or confirm");
});

Deno.test("SCENARIO: exact screenshot — 'Às 8:30' after disambiguation → must confirm manicure, NOT ask service", () => {
  const services = [
    { name: "Escova", price: 50, duration: 30 },
    { name: "Manicure", price: 50, duration: 60 },
    { name: "Pedicure", price: 50, duration: 60 },
  ];

  const conversationHistory = [
    { role: "user", content: "Quero marcar manicure hj\nOps amanhã" },
    { role: "assistant", content: "Sem problemas! Como hoje já passamos do horário, amanhã (sábado, 28/02) atendemos das 08:00 às 13:00.\n\nPerfeito! Qual horário você prefere?" },
    { role: "user", content: "Eu quero às 8h" },
    { role: "assistant", content: "Para às 08:00 de amanhã, tenho disponibilidade para:\n\n· 08:00\n· 08:30\n\nPerfeito! Qual horário você prefere?" },
    { role: "user", content: "Às 8:30" },
  ];

  const rawReply = "Combinado! Para eu deixar tudo prontinho, qual serviço você gostaria de agendar para amanhã às 08:30? 😊";

  const result = enforceKnownServiceNoRedundantQuestion("Às 8:30", rawReply, services, conversationHistory);

  console.log("\n=== SCENARIO 3 (EXACT SCREENSHOT) ===");
  console.log("Input: 'Às 8:30'");
  console.log("Service from history: Manicure");
  console.log("Output:\n" + result);
  console.log("=== END ===\n");

  assertEquals(result.includes("qual serviço"), false, "Should NOT ask for service");
  assertEquals(result.includes("Qual serviço"), false, "Should NOT ask for service (cap)");
  assertEquals(result.includes("Manicure") || result.includes("manicure"), true, "Should mention the service Manicure");
  assertEquals(result.includes("08:30"), true, "Should mention the chosen time");
});

Deno.test("SCENARIO: AI already correct — mentions service+day correctly → guardrail must NOT override", () => {
  const services = [
    { name: "Manicure", price: 50, duration: 60 },
    { name: "Pedicure", price: 60, duration: 60 },
  ];

  const conversationHistory = [
    { role: "user", content: "Quero marcar manicure hj\nOps amanhã" },
    { role: "assistant", content: "Para amanhã, domingo, o Studio Mara estará fechado.\n\nPosso agendar sua Manicure (R$50) para segunda-feira?\n\nTemos os seguintes horários disponíveis:\n• 08:00\n• 08:30\n• 09:00\n• 09:30\n\nQual desses você prefere? 😊" },
    { role: "user", content: "Quero marcar às 08:00" },
  ];

  const rawReply = "Perfeito! Posso agendar sua Manicure para segunda-feira, dia 02/03, às 08:00?\n\nO valor do serviço é R$50.\n\nSe estiver tudo certinho, é só me avisar que eu já reservo seu horário! 😊";

  const result = enforceKnownServiceNoRedundantQuestion("Quero marcar às 08:00", rawReply, services, conversationHistory);

  console.log("\n=== SCENARIO 4 (AI ALREADY CORRECT) ===");
  console.log("Input: 'Quero marcar às 08:00'");
  console.log("Output:\n" + result);
  console.log("=== END ===\n");

  // The guardrail must NOT replace the AI's correct response
  assertEquals(result.includes("segunda-feira"), true, "Must preserve 'segunda-feira' from AI response");
  assertEquals(result.includes("Manicure"), true, "Must preserve 'Manicure'");
  assertEquals(result.includes("08:00"), true, "Must preserve '08:00'");
  assertEquals(result.includes("amanhã às 08:00. Deseja confirmar"), false, "Must NOT replace with wrong 'amanhã' guardrail");
});

Deno.test("SCENARIO: 'Pode ser às 8' must be detected as booking flow context", () => {
  const result = isBookingFlowContext("Pode ser às 8", "Perfeito 😊 Manicure para segunda-feira às 08:00. Deseja confirmar?");
  console.log("\n=== SCENARIO 5 (às 8 booking detection) ===");
  console.log("isBookingFlowContext result:", result);
  console.log("=== END ===\n");
  assertEquals(result, true, "'Pode ser às 8' must be recognized as booking flow");
});
