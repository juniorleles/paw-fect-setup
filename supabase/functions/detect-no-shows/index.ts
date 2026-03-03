import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // BRT = UTC-3
    const now = new Date();
    const brtNow = new Date(now.getTime() - 3 * 60 * 60 * 1000);
    const todayBRT = brtNow.toISOString().split("T")[0];
    const currentTimeBRT = brtNow.toTimeString().slice(0, 5); // HH:MM

    console.log(`[detect-no-shows] Running at BRT: ${todayBRT} ${currentTimeBRT}`);

    // Find appointments that are pending/confirmed but their time has passed (1h grace)
    // Case 1: Past dates (any time)
    // Case 2: Today but time + 1h has passed
    const oneHourAgoBRT = new Date(brtNow.getTime() - 60 * 60 * 1000);
    const cutoffTime = oneHourAgoBRT.toTimeString().slice(0, 5);

    // Fetch past-date pending appointments
    const { data: pastDateAppts, error: err1 } = await supabase
      .from("appointments")
      .select("id, user_id, owner_name, pet_name, service, date, time, owner_phone")
      .in("status", ["pending", "confirmed"])
      .lt("date", todayBRT)
      .is("no_show_detected_at", null);

    if (err1) {
      console.error("[detect-no-shows] Error fetching past-date:", err1);
    }

    // Fetch today's appointments where time + 1h has passed
    const { data: todayAppts, error: err2 } = await supabase
      .from("appointments")
      .select("id, user_id, owner_name, pet_name, service, date, time, owner_phone")
      .in("status", ["pending", "confirmed"])
      .eq("date", todayBRT)
      .lt("time", cutoffTime)
      .is("no_show_detected_at", null);

    if (err2) {
      console.error("[detect-no-shows] Error fetching today:", err2);
    }

    const allNoShows = [...(pastDateAppts || []), ...(todayAppts || [])];

    if (allNoShows.length === 0) {
      console.log("[detect-no-shows] No no-shows detected");
      return new Response(
        JSON.stringify({ message: "No no-shows detected", count: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[detect-no-shows] Found ${allNoShows.length} no-shows`);

    // Update all detected no-shows
    const ids = allNoShows.map((a) => a.id);
    const { error: updateErr } = await supabase
      .from("appointments")
      .update({
        status: "no_show",
        no_show_detected_at: new Date().toISOString(),
      })
      .in("id", ids);

    if (updateErr) {
      console.error("[detect-no-shows] Error updating:", updateErr);
      throw updateErr;
    }

    // Group by user for alert summary
    const userCounts: Record<string, number> = {};
    for (const appt of allNoShows) {
      userCounts[appt.user_id] = (userCounts[appt.user_id] || 0) + 1;
    }

    // Log system alert
    await supabase.from("system_alerts").insert({
      alert_type: "no_show_detection",
      severity: "info",
      message: `Detectados ${allNoShows.length} no-shows em ${Object.keys(userCounts).length} estabelecimento(s)`,
      details: {
        total: allNoShows.length,
        by_user: userCounts,
        detected_at: new Date().toISOString(),
        appointments: allNoShows.map((a) => ({
          id: a.id,
          owner: a.owner_name,
          pet: a.pet_name,
          service: a.service,
          date: a.date,
          time: a.time,
        })),
      },
    });

    console.log(`[detect-no-shows] Marked ${allNoShows.length} as no_show`);

    // Also mark stale pending recoveries as "lost" (48h without response)
    const staleThreshold = new Date(now.getTime() - 48 * 60 * 60 * 1000).toISOString();
    const { data: staleRecoveries, error: staleErr } = await supabase
      .from("appointments")
      .update({ recovery_status: "lost" })
      .eq("status", "no_show")
      .eq("recovery_status", "pending")
      .lt("recovery_message_sent_at", staleThreshold)
      .select("id");

    if (!staleErr && staleRecoveries && staleRecoveries.length > 0) {
      console.log(`[detect-no-shows] Marked ${staleRecoveries.length} stale recoveries as lost`);
    }

    return new Response(
      JSON.stringify({
        message: `Detected ${allNoShows.length} no-shows`,
        count: allNoShows.length,
        ids,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[detect-no-shows] Fatal error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
