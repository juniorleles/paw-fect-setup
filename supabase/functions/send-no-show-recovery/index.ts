import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const log = (step: string, details?: any) => {
  const d = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[NO-SHOW-RECOVERY] ${step}${d}`);
};

// --- Availability helpers (same logic as whatsapp-ai-handler) ---

function timeToMinutes(t: string): number {
  const [h, m] = t.slice(0, 5).split(":").map(Number);
  return h * 60 + m;
}

function minutesToTime(mins: number): string {
  const h = String(Math.floor(mins / 60)).padStart(2, "0");
  const m = String(mins % 60).padStart(2, "0");
  return `${h}:${m}`;
}

function getServiceDuration(services: any[], serviceName: string): number {
  const normalized = (serviceName || "").trim().toLowerCase();
  const svc = services.find((s: any) => (s.name || "").trim().toLowerCase() === normalized);
  if (svc) return svc.duration || 30;
  return 30;
}

function buildOccupancyMap(
  dateStr: string,
  appointments: any[],
  services: any[],
  slotInterval: number
): Map<string, number> {
  const occupancy = new Map<string, number>();
  const dayApts = appointments.filter(
    (a: any) => a.date === dateStr && a.status !== "cancelled" && a.status !== "no_show"
  );

  for (const apt of dayApts) {
    const aptStart = timeToMinutes(apt.time);
    const aptDuration = getServiceDuration(services, apt.service);
    const slotsOccupied = Math.max(1, Math.ceil(aptDuration / slotInterval));

    for (let i = 0; i < slotsOccupied; i++) {
      const slotTime = minutesToTime(aptStart + i * slotInterval);
      occupancy.set(slotTime, (occupancy.get(slotTime) || 0) + 1);
    }
  }
  return occupancy;
}

function getNextAvailableSlots(
  businessHours: any[],
  appointments: any[],
  maxConcurrent: number,
  services: any[],
  count = 3
): { date: string; time: string; weekday: string }[] {
  const now = new Date();
  const brTimestamp = now.getTime() - 3 * 60 * 60 * 1000;
  const brNow = new Date(brTimestamp);
  const currentHour = brNow.getUTCHours();
  const currentMin = brNow.getUTCMinutes();

  const dayNames = ["Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"];
  const slotInterval = 30;
  const slots: { date: string; time: string; weekday: string }[] = [];

  for (let d = 0; d < 14 && slots.length < count; d++) {
    const date = new Date(brNow);
    date.setUTCDate(date.getUTCDate() + d);
    const dateStr = date.toISOString().split("T")[0];
    const weekday = dayNames[date.getUTCDay()];

    const daySchedule = businessHours.find((h: any) => h.day === weekday);
    if (!daySchedule || !daySchedule.isOpen) continue;

    const [openH, openM] = daySchedule.openTime.split(":").map(Number);
    const [closeH, closeM] = daySchedule.closeTime.split(":").map(Number);

    const occupancy = buildOccupancyMap(dateStr, appointments, services, slotInterval);

    let h = openH, m = openM;
    while ((h < closeH || (h === closeH && m < closeM)) && slots.length < count) {
      const timeStr = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;

      const isPast = d === 0 && (h < currentHour || (h === currentHour && m <= currentMin));
      if (!isPast) {
        const booked = occupancy.get(timeStr) || 0;
        if (booked < maxConcurrent) {
          slots.push({ date: dateStr, time: timeStr, weekday });
        }
      }

      m += slotInterval;
      if (m >= 60) { h += Math.floor(m / 60); m = m % 60; }
    }
  }

  return slots;
}

function formatDateBR(dateStr: string): string {
  const [y, m, d] = dateStr.split("-");
  return `${d}/${m}`;
}

function getWeekdayShort(weekday: string): string {
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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const evolutionUrl = Deno.env.get("EVOLUTION_API_URL");
    const evolutionKey = Deno.env.get("EVOLUTION_API_KEY");

    if (!evolutionUrl || !evolutionKey) {
      throw new Error("Evolution API credentials not configured");
    }

    // BRT check: Quiet Hours 22:00-08:00
    const now = new Date();
    const brtNow = new Date(now.getTime() - 3 * 60 * 60 * 1000);
    const brtHour = brtNow.getUTCHours();

    if (brtHour >= 22 || brtHour < 8) {
      log("Quiet hours active, skipping", { brtHour });
      return new Response(
        JSON.stringify({ message: "Quiet hours - skipping", brtHour }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch no-show appointments that haven't received a recovery message yet
    const { data: noShows, error: fetchErr } = await supabase
      .from("appointments")
      .select("id, user_id, owner_name, pet_name, service, date, time, owner_phone")
      .eq("status", "no_show")
      .is("recovery_message_sent_at", null)
      .is("recovery_status", null);

    if (fetchErr) {
      log("Error fetching no-shows", { error: fetchErr });
      throw fetchErr;
    }

    if (!noShows || noShows.length === 0) {
      log("No pending no-shows to recover");
      return new Response(
        JSON.stringify({ message: "No pending recoveries", count: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    log(`Found ${noShows.length} no-shows to recover`);

    // Group by user_id for efficient config/subscription lookup
    const byUser = new Map<string, typeof noShows>();
    for (const ns of noShows) {
      if (!byUser.has(ns.user_id)) byUser.set(ns.user_id, []);
      byUser.get(ns.user_id)!.push(ns);
    }

    let totalSent = 0;
    let totalSkipped = 0;

    for (const [userId, userNoShows] of byUser) {
      // Check subscription - only paid plans
      const { data: sub } = await supabase
        .from("subscriptions")
        .select("plan, status, trial_messages_used, trial_messages_limit")
        .eq("user_id", userId)
        .eq("status", "active")
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!sub || (sub.plan !== "starter" && sub.plan !== "professional")) {
        log("Skipping user - free plan or no subscription", { userId });
        totalSkipped += userNoShows.length;
        continue;
      }

      // Check message limit
      const remaining = sub.trial_messages_limit === -1
        ? Infinity
        : sub.trial_messages_limit - sub.trial_messages_used;

      if (remaining < 1) {
        log("Skipping user - message limit reached", { userId, remaining });
        totalSkipped += userNoShows.length;
        continue;
      }

      // Get pet shop config
      const { data: config } = await supabase
        .from("pet_shop_configs")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();

      if (!config || !config.evolution_instance_name) {
        log("Skipping user - no config or instance", { userId });
        totalSkipped += userNoShows.length;
        continue;
      }

      // Get all future appointments for availability calculation
      const todayBRT = brtNow.toISOString().split("T")[0];
      const { data: existingAppts } = await supabase
        .from("appointments")
        .select("id, date, time, service, status")
        .eq("user_id", userId)
        .gte("date", todayBRT)
        .neq("status", "cancelled")
        .neq("status", "no_show");

      const maxConcurrent = Math.min(
        Math.max(1, config.max_concurrent_appointments ?? 1),
        sub.plan === "professional" ? 5 : 1
      );

      // Calculate next 3 available slots
      const availableSlots = getNextAvailableSlots(
        config.business_hours || [],
        existingAppts || [],
        maxConcurrent,
        config.services || [],
        3
      );

      if (availableSlots.length === 0) {
        log("No available slots for user", { userId });
        totalSkipped += userNoShows.length;
        continue;
      }

      // Process each no-show for this user (limited by remaining messages)
      let sentForUser = 0;
      for (const ns of userNoShows) {
        if (sentForUser >= remaining) break;

        if (!ns.owner_phone) {
          log("Skipping - no phone", { appointmentId: ns.id });
          totalSkipped++;
          continue;
        }

        // Build recovery message
        const slotsText = availableSlots
          .map((s, i) => `${i + 1}️⃣ ${getWeekdayShort(s.weekday)} ${formatDateBR(s.date)} às ${s.time}`)
          .join("\n");

        const message = [
          `Olá ${ns.owner_name}! 😊`,
          ``,
          `Sentimos sua falta no agendamento de *${ns.service}* para o(a) *${ns.pet_name}* que estava marcado para ${formatDateBR(ns.date)} às ${ns.time}.`,
          ``,
          `Que tal remarcar? Temos esses horários disponíveis:`,
          slotsText,
          ``,
          `Responda com o número do horário desejado ou me diga outro horário que funcione melhor pra você! 💜`,
        ].join("\n");

        const formattedPhone = ns.owner_phone.replace(/\D/g, "");

        try {
          const evoResponse = await fetch(
            `${evolutionUrl}/message/sendText/${config.evolution_instance_name}`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                apikey: evolutionKey,
              },
              body: JSON.stringify({
                number: formattedPhone,
                text: message,
              }),
            }
          );

          if (!evoResponse.ok) {
            const errText = await evoResponse.text();
            log("Evolution API error", { phone: formattedPhone, error: errText });
            totalSkipped++;
            continue;
          }

          await evoResponse.text(); // consume body

          // Update appointment with recovery info
          await supabase
            .from("appointments")
            .update({
              recovery_message_sent_at: new Date().toISOString(),
              recovery_status: "pending",
              notes: JSON.stringify({
                recovery_slots: availableSlots,
                recovery_message: message,
              }),
            })
            .eq("id", ns.id);

          // Increment message counter
          await supabase.rpc("increment_trial_messages", { p_user_id: userId });

          sentForUser++;
          totalSent++;
          log("Recovery message sent", { appointmentId: ns.id, phone: formattedPhone });
        } catch (e) {
          log("Send error", { appointmentId: ns.id, error: e.message });
          totalSkipped++;
        }
      }
    }

    log("Recovery campaign complete", { sent: totalSent, skipped: totalSkipped });

    return new Response(
      JSON.stringify({
        message: `Recovery complete: ${totalSent} sent, ${totalSkipped} skipped`,
        sent: totalSent,
        skipped: totalSkipped,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    log("Fatal error", { message: error.message });
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
