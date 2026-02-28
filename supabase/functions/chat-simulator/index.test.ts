import "https://deno.land/std@0.224.0/dotenv/load.ts";
import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";

const SUPABASE_URL = Deno.env.get("VITE_SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("VITE_SUPABASE_PUBLISHABLE_KEY")!;

const config = {
  shopName: "Salão Teste",
  assistantName: "Luna",
  voiceTone: "friendly",
  services: [
    { name: "Escova", price: 80, duration: 45 },
    { name: "Corte Feminino", price: 100, duration: 60 },
  ],
  businessHours: [
    { day: "Segunda-feira", isOpen: true, openTime: "08:00", closeTime: "18:00" },
    { day: "Terça-feira", isOpen: true, openTime: "08:00", closeTime: "18:00" },
    { day: "Quarta-feira", isOpen: true, openTime: "08:00", closeTime: "18:00" },
    { day: "Quinta-feira", isOpen: true, openTime: "08:00", closeTime: "18:00" },
    { day: "Sexta-feira", isOpen: true, openTime: "08:00", closeTime: "18:00" },
    { day: "Sábado", isOpen: true, openTime: "09:00", closeTime: "14:00" },
    { day: "Domingo", isOpen: false, openTime: "08:00", closeTime: "18:00" },
  ],
  address: "Rua Teste, 123",
  neighborhood: "Centro",
  city: "São Paulo",
  state: "SP",
  niche: "salao",
};

Deno.test("Should NOT ask date/time again when user already provided time", async () => {
  const messages = [
    { role: "user" as const, content: "Oi, quero agendar uma escova" },
    { role: "assistant" as const, content: "Olá! 😊 Claro, temos o serviço de Escova (R$80, 45 min). Pra qual dia e horário você quer agendar?" },
    { role: "user" as const, content: "Pode agendar para 13:30" },
  ];

  const response = await fetch(`${SUPABASE_URL}/functions/v1/chat-simulator`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify({ config, messages, simulatedAppointments: [] }),
  });

  const data = await response.json();
  console.log("Reply:", data.reply);

  assertEquals(response.status, 200);
  // The reply should NOT end with "Pra qual dia e horário você quer agendar?"
  const hasRedundantQuestion = /pra qual dia e hor[aá]rio voc[eê] quer agendar/i.test(data.reply);
  assertEquals(hasRedundantQuestion, false, `Reply should not ask for date/time again. Got: "${data.reply}"`);
});

Deno.test("Should still ask date/time when user does NOT provide time", async () => {
  const messages = [
    { role: "user" as const, content: "Quero agendar uma escova" },
  ];

  const response = await fetch(`${SUPABASE_URL}/functions/v1/chat-simulator`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify({ config, messages, simulatedAppointments: [] }),
  });

  const data = await response.json();
  console.log("Reply:", data.reply);

  assertEquals(response.status, 200);
  // The reply SHOULD contain a question mark (asking for date/time or name)
  const hasQuestion = /\?/.test(data.reply);
  assertEquals(hasQuestion, true, `Reply should ask a question. Got: "${data.reply}"`);
});
