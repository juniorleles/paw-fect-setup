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

  // Get the shortest service duration to determine slot interval
  const minDuration = Math.min(...services.map((s: any) => s.duration || 30), 30);
  const slotInterval = minDuration;

  const lines: string[] = [];

  for (let d = 0; d < daysAhead; d++) {
    const date = new Date(brNow);
    date.setDate(date.getDate() + d);
    const dateStr = date.toISOString().split("T")[0];
    const weekday = dayNames[date.getDay()];

    // Find business hours for this weekday
    const daySchedule = businessHours.find((h: any) => h.day === weekday);
    if (!daySchedule || !daySchedule.isOpen) continue;

    const [openH, openM] = daySchedule.openTime.split(":").map(Number);
    const [closeH, closeM] = daySchedule.closeTime.split(":").map(Number);

    // Count bookings per time slot for this date
    const bookedCount: Record<string, number> = {};
    for (const apt of appointments) {
      if (apt.date === dateStr && apt.status !== "cancelled") {
        // Normalize time to HH:MM (DB stores HH:MM:SS)
        const normalizedTime = apt.time.slice(0, 5);
        bookedCount[normalizedTime] = (bookedCount[normalizedTime] || 0) + 1;
      }
    }

    const freeSlots: string[] = [];
    let h = openH, m = openM;
    while (h < closeH || (h === closeH && m < closeM)) {
      const timeStr = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;

      // Skip past times for today
      const isPast = d === 0 && (h < currentHour || (h === currentHour && m <= currentMin));
      if (!isPast) {
        const booked = bookedCount[timeStr] || 0;
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

  // Filter out error/fallback messages that pollute context
  const FALLBACK_PHRASES = [
    "Tive uma dificuldade técnica",
    "Desculpe, não consegui processar",
    "instabilidade temporária",
  ];

  const filtered = (data || [])
    .map((m: any) => ({ role: m.role, content: m.content }))
    .filter((m) => {
      if (m.role === "assistant") {
        return !FALLBACK_PHRASES.some((phrase) => m.content?.includes(phrase));
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
    formal: "Use linguagem formal e educada. Trate o cliente por 'senhor(a)'. Seja objetiva e profissional. Evite emojis.",
    friendly: "Use linguagem amigável e acolhedora. Trate o cliente pelo nome quando souber. Seja pessoal e calorosa. Use emojis com moderação.",
    fun: `Use linguagem divertida e descontraída, com emojis moderados ${emojis}. Seja animada e alegre, com humor leve!`,
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

IMPORTANTE SOBRE CONVERSA:
- Você está em uma conversa contínua via WhatsApp. O histórico de mensagens anteriores já está incluído.
- NÃO se apresente novamente se já tiver se apresentado em mensagens anteriores.
- Mantenha o contexto da conversa. Se o cliente já forneceu informações (nome, etc.), não peça novamente.
- Seja natural e fluida, como uma conversa real de WhatsApp.
- Só se apresente na PRIMEIRA mensagem de uma conversa nova (quando não houver histórico).

INFORMAÇÕES DO ESTABELECIMENTO:
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

CAPACIDADE DE ATENDIMENTO SIMULTÂNEO: ${maxConcurrent} atendente${maxConcurrent > 1 ? "s" : ""} por horário.

HORÁRIOS DISPONÍVEIS NOS PRÓXIMOS 7 DIAS:
${availableSlots || "Nenhum horário disponível."}
IMPORTANTE: Use SEMPRE esta lista para sugerir horários livres. NÃO invente horários. Se o cliente pedir um horário que não está nesta lista, informe que está lotado e sugira alternativas da lista.

REGRAS DE COMPORTAMENTO:
1. Fale SEMPRE em português brasileiro (pt-BR).
2. Seja CURTA e DIRETA. Máximo 3-4 frases por mensagem.
3. NUNCA invente dados. Se serviços ou horários não estiverem cadastrados, peça ao responsável configurar.
4. Siga rigorosamente o tom de voz configurado.
5. Se um serviço NÃO tem preço cadastrado, NÃO mencione valor, NÃO pergunte sobre preço e NÃO invente preços. Trate como um agendamento simples sem valor.
6. Só mencione preço/valor quando o serviço tiver um preço explicitamente cadastrado na lista acima.
${isPetNiche ? "" : "7. NÃO pergunte nome de pet. Este é um " + nicheLabel + ", não um pet shop."}

FLUXO DE AGENDAMENTO (OBRIGATÓRIO — 2 ETAPAS):
ETAPA 1 — RESUMO: Após coletar ${collectFields}, apresente um RESUMO completo e pergunte ao cliente se está tudo certo. NÃO inclua o bloco <action> nesta etapa. Aguarde a resposta.
ETAPA 2 — REGISTRO: SOMENTE após o cliente responder confirmando (ex: "sim", "pode ser", "confirmo", "isso", "ok", "perfeito"), inclua o bloco <action> para criar o agendamento com status "pending".
NUNCA crie o agendamento (bloco <action>) na mesma mensagem em que pergunta se o cliente confirma. Espere a próxima mensagem dele.
${!isPetNiche ? 'No campo "pet_name" da action, coloque "—" (traço). NÃO pergunte nome de pet.' : ""}

FLUXO DE REMARCAÇÃO:
1. Identifique o agendamento existente do cliente.
2. Sugira horários disponíveis.
3. Confirme os novos detalhes antes de atualizar.

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

    const existingAppointments = (appointments || [])
      .map((a: any) => isPetNiche
        ? `${a.date} ${a.time} - ${a.service} (${a.pet_name}/${a.owner_name}, tel: ${a.owner_phone}, status: ${a.status})`
        : `${a.date} ${a.time} - ${a.service} (${a.owner_name}, tel: ${a.owner_phone}, status: ${a.status})`)
      .join("\n");

    const customerAppointments = (appointments || [])
      .filter((a: any) => phoneMatches(a.owner_phone || "", cleanPhone));

    const customerApptsText = customerAppointments.length > 0
      ? customerAppointments.map((a: any) => isPetNiche
        ? `- ${a.date} às ${a.time}: ${a.service} (pet: ${a.pet_name}, status: ${a.status})`
        : `- ${a.date} às ${a.time}: ${a.service} (status: ${a.status})`).join("\n")
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
        model: "google/gemini-3-flash-preview",
        messages: aiMessages,
        temperature: 0.7,
        max_tokens: 1024,
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
    
    // Retry with alternative model if response is empty
    if (!reply || reply.trim() === "") {
      console.warn("Empty AI reply, retrying with google/gemini-3-pro-preview...");
      const retryResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-pro-preview",
          messages: aiMessages,
          temperature: 0.7,
          max_tokens: 1024,
        }),
      });

      if (retryResponse.ok) {
        const retryData = await retryResponse.json();
        const retryReply = retryData.choices?.[0]?.message?.content;
        console.log("Retry response length:", retryReply?.length);
        if (retryReply && retryReply.trim() !== "") {
          reply = retryReply;
          aiData = retryData;
          console.log("Retry succeeded with gemini-2.5-pro");
        }
      }
    }

    // Final fallback if still empty after retry
    if (!reply || reply.trim() === "") {
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
      model: "gemini-2.5-flash",
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
