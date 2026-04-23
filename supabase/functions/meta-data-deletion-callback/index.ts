// Meta Data Deletion Request Callback
// Recebe POST signed_request da Meta, valida HMAC-SHA256 com APP_SECRET,
// registra a solicitação e retorna { url, confirmation_code }
// Docs: https://developers.facebook.com/docs/development/create-an-app/app-dashboard/data-deletion-callback/

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const META_APP_SECRET = Deno.env.get("META_APP_SECRET")!;

const STATUS_BASE_URL = "https://www.magiczap.io/data-deletion-status";

function base64UrlDecode(input: string): Uint8Array {
  const pad = input.length % 4;
  const padded = input + "=".repeat(pad ? 4 - pad : 0);
  const b64 = padded.replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function hmacSha256(secret: string, payload: string): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  return new Uint8Array(sig);
}

function constantTimeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

async function parseSignedRequest(signedRequest: string): Promise<Record<string, unknown> | null> {
  const parts = signedRequest.split(".");
  if (parts.length !== 2) return null;
  const [encodedSig, payload] = parts;

  const sig = base64UrlDecode(encodedSig);
  const expected = await hmacSha256(META_APP_SECRET, payload);
  if (!constantTimeEqual(sig, expected)) {
    console.error("[meta-data-deletion] Invalid signature");
    return null;
  }

  try {
    const decoded = new TextDecoder().decode(base64UrlDecode(payload));
    return JSON.parse(decoded);
  } catch (e) {
    console.error("[meta-data-deletion] Failed to decode payload", e);
    return null;
  }
}

function generateConfirmationCode(): string {
  const bytes = new Uint8Array(12);
  crypto.getRandomValues(bytes);
  return "MZ-" + bytesToHex(bytes).toUpperCase();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // GET = Health check / Meta validation ping
  if (req.method === "GET") {
    return new Response(
      JSON.stringify({ status: "ok", endpoint: "meta-data-deletion-callback" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    // Meta envia como application/x-www-form-urlencoded com campo "signed_request"
    let signedRequest: string | null = null;
    const contentType = req.headers.get("content-type") || "";

    if (contentType.includes("application/x-www-form-urlencoded")) {
      const formData = await req.formData();
      signedRequest = formData.get("signed_request") as string | null;
    } else if (contentType.includes("application/json")) {
      const body = await req.json();
      signedRequest = body.signed_request ?? null;
    } else {
      // fallback: tenta como form
      try {
        const formData = await req.formData();
        signedRequest = formData.get("signed_request") as string | null;
      } catch {
        signedRequest = null;
      }
    }

    if (!signedRequest) {
      console.error("[meta-data-deletion] Missing signed_request");
      return new Response(JSON.stringify({ error: "Missing signed_request" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await parseSignedRequest(signedRequest);
    if (!data) {
      return new Response(JSON.stringify({ error: "Invalid signature" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const metaUserId = String(data.user_id ?? "unknown");
    const confirmationCode = generateConfirmationCode();

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { error: insertError } = await supabase
      .from("meta_data_deletion_requests")
      .insert({
        confirmation_code: confirmationCode,
        meta_user_id: metaUserId,
        status: "received",
        notes: `Recebido via callback Meta. Algorithm: ${data.algorithm ?? "?"}`,
      });

    if (insertError) {
      console.error("[meta-data-deletion] DB insert error", insertError);
      return new Response(JSON.stringify({ error: "Internal error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("[meta-data-deletion] Request registered", { metaUserId, confirmationCode });

    return new Response(
      JSON.stringify({
        url: `${STATUS_BASE_URL}?code=${confirmationCode}`,
        confirmation_code: confirmationCode,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("[meta-data-deletion] Unhandled error", e);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
