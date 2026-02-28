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
  const schedulingReply = /(hor[aá]rios?\s+dispon[ií]veis?|qual\s+hor[aá]rio\s+voc[eê]\s+prefere|pra\s+qual\s+dia\s+e\s+hor[aá]rio|qual\s+dia\s+e\s+hor[aá]rio)/i.test(reply || "");
  return bookingIntent || schedulingReply;
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
