import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/** Format phone to 55XXXXXXXXXXX */
function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  return digits.startsWith("55") ? digits : `55${digits}`;
}

/** Send WhatsApp message via Evolution API */
async function sendWhatsApp(
  instanceName: string,
  phone: string,
  text: string
): Promise<boolean> {
  const evolutionUrl = Deno.env.get("EVOLUTION_API_URL");
  const evolutionKey = Deno.env.get("EVOLUTION_API_KEY");
  if (!evolutionUrl || !evolutionKey) {
    console.warn("Evolution API not configured, skipping WhatsApp");
    return false;
  }

  try {
    const res = await fetch(
      `${evolutionUrl}/message/sendText/${instanceName}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: evolutionKey,
        },
        body: JSON.stringify({
          number: formatPhone(phone),
          text,
        }),
      }
    );
    if (!res.ok) {
      const errText = await res.text();
      console.error("WhatsApp send failed:", errText);
      return false;
    }
    await res.text(); // consume body
    return true;
  } catch (err) {
    console.error("WhatsApp send error:", err);
    return false;
  }
}

/** Wrap raw magic link in a safe app route to avoid link preview bots consuming OTP */
function buildSafeInviteLink(rawMagicLink: string): string {
  if (!rawMagicLink) return rawMagicLink;

  try {
    const rawUrl = new URL(rawMagicLink);
    const redirectTo = rawUrl.searchParams.get("redirect_to");
    if (!redirectTo) return rawMagicLink;

    const appUrl = new URL(redirectTo);
    appUrl.pathname = "/professional-login";
    appUrl.search = "";
    appUrl.searchParams.set("ml", rawMagicLink);

    return appUrl.toString();
  } catch {
    return rawMagicLink;
  }
}

/** Send invite link via WhatsApp and email */
async function sendInviteNotifications(
  adminClient: any,
  ownerUserId: string,
  profEmail: string,
  profPhone: string | null,
  profName: string,
  inviteLink: string
) {
  const results = { whatsapp: false, email: false };

  // 1. Send via WhatsApp if phone is available
  if (profPhone) {
    const { data: config } = await adminClient
      .from("pet_shop_configs")
      .select("evolution_instance_name, shop_name, whatsapp_status")
      .eq("user_id", ownerUserId)
      .maybeSingle();

    if (config?.evolution_instance_name && config.whatsapp_status === "connected") {
      const message = [
        `🔑 *Convite para acesso ao sistema*`,
        ``,
        `Olá ${profName}! Você foi convidado(a) para acessar a agenda de *${config.shop_name || "sua empresa"}*.`,
        ``,
        `Clique no link abaixo para ativar seu acesso:`,
        inviteLink,
        ``,
        `Esse link é válido por 24 horas.`,
      ].join("\n");

      results.whatsapp = await sendWhatsApp(
        config.evolution_instance_name,
        profPhone,
        message
      );
    }
  }

  // 2. Send magic link email using signInWithOtp (actually sends the email)
  try {
    const { error: otpErr } = await adminClient.auth.signInWithOtp({
      email: profEmail,
      options: {
        shouldCreateUser: false,
      },
    });
    if (otpErr) {
      console.warn("OTP email send failed:", otpErr.message);
    } else {
      results.email = true;
    }
  } catch (err) {
    console.warn("OTP email error:", err);
  }

  return results;
}

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

      let authUserId: string;

      if (existingUser) {
        // Reuse existing auth user (e.g. from a previous revoked access)
        authUserId = existingUser.id;

        // Check if another professional is already linked to this auth user
        const { data: linkedProf } = await adminClient
          .from("professionals")
          .select("id, user_id")
          .eq("auth_user_id", existingUser.id)
          .neq("id", professional_id)
          .maybeSingle();

        if (linkedProf) {
          // Security: do not allow taking over a professional from another owner
          if (linkedProf.user_id !== caller.id) {
            return new Response(
              JSON.stringify({ error: "Este email já está associado a outro profissional no sistema" }),
              { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }

          // Same owner: transfer access to the current professional
          const { error: detachErr } = await adminClient
            .from("professionals")
            .update({ auth_user_id: null })
            .eq("auth_user_id", existingUser.id)
            .eq("user_id", caller.id)
            .neq("id", professional_id);

          if (detachErr) {
            console.error("Error transferring professional access:", detachErr);
            return new Response(
              JSON.stringify({ error: "Erro ao transferir acesso entre profissionais" }),
              { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
        }
      } else {
        // Create new auth user
        const tempPassword = crypto.randomUUID() + "Aa1!";
        const { data: newUser, error: createErr } = await adminClient.auth.admin.createUser({
          email: prof.email,
          password: tempPassword,
          email_confirm: true,
          user_metadata: {
            is_professional: true,
            owner_id: caller.id,
            professional_name: prof.name,
          },
        });

        if (createErr) {
          console.error("Error creating auth user:", createErr);
          return new Response(
            JSON.stringify({ error: `Erro ao criar conta: ${createErr.message}` }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        authUserId = newUser.user.id;
      }

      // 2. Link auth_user_id to professional record
      const { error: updateErr } = await adminClient
        .from("professionals")
        .update({ auth_user_id: authUserId })
        .eq("id", professional_id);

      if (updateErr) {
        console.error("Error linking professional:", updateErr);
        return new Response(
          JSON.stringify({ error: "Erro ao vincular acesso ao profissional" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // 3. Generate magic link URL for WhatsApp
      const { data: linkData } = await adminClient.auth.admin.generateLink({
        type: "magiclink",
        email: prof.email,
      });
      const magicLinkUrl = linkData?.properties?.action_link || "";
      const safeInviteLink = buildSafeInviteLink(magicLinkUrl);

      // 4. Send notifications (WhatsApp + Email)
      const sendResults = await sendInviteNotifications(
        adminClient,
        caller.id,
        prof.email,
        prof.phone,
        prof.name,
        safeInviteLink
      );

      const channels: string[] = [];
      if (sendResults.whatsapp) channels.push("WhatsApp");
      if (sendResults.email) channels.push("email");

      const channelMsg = channels.length > 0
        ? `Convite enviado via ${channels.join(" e ")} para ${prof.email}`
        : `Acesso concedido, mas não foi possível enviar o convite automaticamente. Compartilhe o link manualmente.`;

      return new Response(
        JSON.stringify({
          success: true,
          message: channelMsg,
          auth_user_id: authUserId,
          magic_link: channels.length === 0 ? safeInviteLink : undefined,
          channels: sendResults,
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

      await adminClient
        .from("professionals")
        .update({ auth_user_id: null })
        .eq("id", professional_id);

      return new Response(
        JSON.stringify({ success: true, message: "Acesso revogado com sucesso" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ─── RESEND LINK ────────────────────────────────────────────
    if (action === "resend-link") {
      if (!professional_id) {
        return new Response(
          JSON.stringify({ error: "professional_id é obrigatório" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: prof } = await adminClient
        .from("professionals")
        .select("email, auth_user_id, name, phone, user_id")
        .eq("id", professional_id)
        .eq("user_id", caller.id)
        .maybeSingle();

      if (!prof?.auth_user_id || !prof.email) {
        return new Response(
          JSON.stringify({ error: "Profissional sem acesso configurado" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Generate new magic link
      const { data: linkData } = await adminClient.auth.admin.generateLink({
        type: "magiclink",
        email: prof.email,
      });
      const magicLinkUrl = linkData?.properties?.action_link || "";
      const safeInviteLink = buildSafeInviteLink(magicLinkUrl);

      // Send notifications (WhatsApp + Email)
      const sendResults = await sendInviteNotifications(
        adminClient,
        caller.id,
        prof.email,
        prof.phone,
        prof.name,
        safeInviteLink
      );

      const channels: string[] = [];
      if (sendResults.whatsapp) channels.push("WhatsApp");
      if (sendResults.email) channels.push("email");

      return new Response(
        JSON.stringify({
          success: true,
          message: channels.length > 0
            ? `Convite reenviado via ${channels.join(" e ")} para ${prof.email}`
            : `Não foi possível reenviar automaticamente. Compartilhe o link manualmente.`,
          magic_link: channels.length === 0 ? magicLinkUrl : undefined,
          channels: sendResults,
        }),
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
