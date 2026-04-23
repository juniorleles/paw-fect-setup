// Manage WhatsApp Message Templates via Meta Graph API
// Supports: list, create, delete — with DB sync to whatsapp_templates
// Used for Meta App Review (whatsapp_business_management permission demo)
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const GRAPH_VERSION = "v21.0";

interface ManagePayload {
  action: "list" | "create" | "delete";
  userId: string; // target client user_id (admin operates on behalf)
  // create
  name?: string;
  language?: string;
  category?: "UTILITY" | "MARKETING" | "AUTHENTICATION";
  body?: string;
  // delete
  templateName?: string;
  hsmId?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Verify caller is admin
    const authHeader = req.headers.get("Authorization") || "";
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) {
      return json({ error: "Unauthorized" }, 401);
    }

    const admin = createClient(supabaseUrl, serviceKey);
    const { data: isAdmin } = await admin.rpc("has_role", {
      _user_id: userData.user.id,
      _role: "admin",
    });
    if (!isAdmin) {
      return json({ error: "Admin access required" }, 403);
    }

    const payload: ManagePayload = await req.json();
    if (!payload.userId || !payload.action) {
      return json({ error: "userId and action required" }, 400);
    }

    // Fetch target client config
    const { data: cfg, error: cfgErr } = await admin
      .from("pet_shop_configs")
      .select("meta_waba_id, meta_access_token, shop_name")
      .eq("user_id", payload.userId)
      .maybeSingle();

    if (cfgErr || !cfg?.meta_waba_id || !cfg?.meta_access_token) {
      return json(
        { error: "Cliente não tem WABA conectada via Meta Cloud API" },
        400,
      );
    }

    const wabaId = cfg.meta_waba_id;
    const token = cfg.meta_access_token;

    // ── ACTIONS ──────────────────────────────────────────────────────
    if (payload.action === "list") {
      const url = `https://graph.facebook.com/${GRAPH_VERSION}/${wabaId}/message_templates?fields=name,status,category,language,components,id&limit=100`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) {
        console.error("[TEMPLATES][LIST] error:", data);
        return json({ error: data.error?.message || "Graph error" }, res.status);
      }

      // Sync to DB
      const templates = data.data || [];
      for (const t of templates) {
        const bodyComp = (t.components || []).find(
          (c: any) => c.type === "BODY",
        );
        await admin.from("whatsapp_templates").upsert(
          {
            user_id: payload.userId,
            template_id: t.id,
            name: t.name,
            language: t.language,
            category: t.category,
            status: t.status,
            body: bodyComp?.text || "",
            provider: "meta",
            metadata: t,
          },
          { onConflict: "template_id" },
        );
      }

      return json({ templates });
    }

    if (payload.action === "create") {
      if (!payload.name || !payload.body || !payload.category) {
        return json({ error: "name, body and category are required" }, 400);
      }
      const language = payload.language || "pt_BR";
      const url = `https://graph.facebook.com/${GRAPH_VERSION}/${wabaId}/message_templates`;
      const res = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: payload.name,
          language,
          category: payload.category,
          components: [{ type: "BODY", text: payload.body }],
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        console.error("[TEMPLATES][CREATE] error:", data);
        return json({ error: data.error?.message || "Graph error" }, res.status);
      }

      await admin.from("whatsapp_templates").upsert(
        {
          user_id: payload.userId,
          template_id: data.id,
          name: payload.name,
          language,
          category: payload.category,
          status: data.status || "PENDING",
          body: payload.body,
          provider: "meta",
          metadata: data,
        },
        { onConflict: "template_id" },
      );

      return json({ template: data });
    }

    if (payload.action === "delete") {
      if (!payload.templateName) {
        return json({ error: "templateName required" }, 400);
      }
      const url = `https://graph.facebook.com/${GRAPH_VERSION}/${wabaId}/message_templates?name=${encodeURIComponent(
        payload.templateName,
      )}${payload.hsmId ? `&hsm_id=${payload.hsmId}` : ""}`;
      const res = await fetch(url, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) {
        console.error("[TEMPLATES][DELETE] error:", data);
        return json({ error: data.error?.message || "Graph error" }, res.status);
      }

      await admin
        .from("whatsapp_templates")
        .delete()
        .eq("user_id", payload.userId)
        .eq("name", payload.templateName);

      return json({ success: true });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (e) {
    console.error("[TEMPLATES] fatal:", e);
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
