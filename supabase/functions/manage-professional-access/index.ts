import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify caller identity
    const anonClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const {
      data: { user: caller },
      error: userErr,
    } = await anonClient.auth.getUser();

    if (userErr || !caller) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { action, professional_id } = await req.json();

    // ─── GRANT ACCESS ───────────────────────────────────────────
    if (action === "grant-access") {
      if (!professional_id) {
        return new Response(
          JSON.stringify({ error: "professional_id é obrigatório" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Fetch professional (must belong to caller)
      const { data: prof, error: profErr } = await adminClient
        .from("professionals")
        .select("*")
        .eq("id", professional_id)
        .eq("user_id", caller.id)
        .eq("status", "active")
        .maybeSingle();

      if (profErr || !prof) {
        return new Response(
          JSON.stringify({ error: "Profissional não encontrado" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (!prof.email) {
        return new Response(
          JSON.stringify({ error: "O profissional precisa ter um email cadastrado para receber acesso" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (prof.auth_user_id) {
        return new Response(
          JSON.stringify({ error: "Este profissional já possui acesso ao sistema" }),
          { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Check if email already has an auth account
      const { data: existingUsers } = await adminClient.auth.admin.listUsers();
      const existingUser = existingUsers?.users?.find(
        (u) => u.email === prof.email
      );

      if (existingUser) {
        return new Response(
          JSON.stringify({ error: "Este email já está associado a outra conta no sistema" }),
          { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Create user via invite — this SENDS the invite email automatically
      const { data: inviteData, error: inviteErr } = await adminClient.auth.admin.inviteUserByEmail(
        prof.email,
        {
          data: {
            is_professional: true,
            owner_id: caller.id,
            professional_name: prof.name,
          },
        }
      );

      if (inviteErr) {
        console.error("Error inviting user:", inviteErr);
        return new Response(
          JSON.stringify({ error: `Erro ao criar conta: ${inviteErr.message}` }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Link auth_user_id to professional record
      const { error: updateErr } = await adminClient
        .from("professionals")
        .update({ auth_user_id: inviteData.user.id })
        .eq("id", professional_id);

      if (updateErr) {
        // Rollback: delete the created auth user
        await adminClient.auth.admin.deleteUser(inviteData.user.id);
        console.error("Error linking professional:", updateErr);
        return new Response(
          JSON.stringify({ error: "Erro ao vincular acesso ao profissional" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: `Acesso concedido! Um convite foi enviado para ${prof.email}`,
          auth_user_id: inviteData.user.id,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ─── REVOKE ACCESS ──────────────────────────────────────────
    if (action === "revoke-access") {
      if (!professional_id) {
        return new Response(
          JSON.stringify({ error: "professional_id é obrigatório" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: prof, error: profErr } = await adminClient
        .from("professionals")
        .select("auth_user_id")
        .eq("id", professional_id)
        .eq("user_id", caller.id)
        .maybeSingle();

      if (profErr || !prof) {
        return new Response(
          JSON.stringify({ error: "Profissional não encontrado" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (!prof.auth_user_id) {
        return new Response(
          JSON.stringify({ error: "Este profissional não possui acesso ao sistema" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Delete auth user
      const { error: deleteErr } = await adminClient.auth.admin.deleteUser(
        prof.auth_user_id
      );

      if (deleteErr) {
        console.error("Error deleting auth user:", deleteErr);
        return new Response(
          JSON.stringify({ error: `Erro ao revogar acesso: ${deleteErr.message}` }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Clear link
      await adminClient
        .from("professionals")
        .update({ auth_user_id: null })
        .eq("id", professional_id);

      return new Response(
        JSON.stringify({ success: true, message: "Acesso revogado com sucesso" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ─── RESEND MAGIC LINK ──────────────────────────────────────
    if (action === "resend-link") {
      if (!professional_id) {
        return new Response(
          JSON.stringify({ error: "professional_id é obrigatório" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: prof } = await adminClient
        .from("professionals")
        .select("email, auth_user_id, name, user_id")
        .eq("id", professional_id)
        .eq("user_id", caller.id)
        .maybeSingle();

      if (!prof?.auth_user_id || !prof.email) {
        return new Response(
          JSON.stringify({ error: "Profissional sem acesso configurado" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Delete existing auth user and re-invite to trigger a new email
      const { error: deleteErr } = await adminClient.auth.admin.deleteUser(prof.auth_user_id);
      if (deleteErr) {
        console.error("Error deleting user for re-invite:", deleteErr);
        return new Response(
          JSON.stringify({ error: `Erro ao reenviar: ${deleteErr.message}` }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: inviteData, error: inviteErr } = await adminClient.auth.admin.inviteUserByEmail(
        prof.email,
        {
          data: {
            is_professional: true,
            owner_id: caller.id,
            professional_name: prof.name,
          },
        }
      );

      if (inviteErr) {
        console.error("Error re-inviting user:", inviteErr);
        // Clear the stale auth_user_id
        await adminClient.from("professionals").update({ auth_user_id: null }).eq("id", professional_id);
        return new Response(
          JSON.stringify({ error: `Erro ao reenviar convite: ${inviteErr.message}` }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Update with new auth_user_id
      await adminClient
        .from("professionals")
        .update({ auth_user_id: inviteData.user.id })
        .eq("id", professional_id);

      return new Response(
        JSON.stringify({ success: true, message: `Convite reenviado para ${prof.email}` }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify({ error: "Ação inválida" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Unexpected error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
