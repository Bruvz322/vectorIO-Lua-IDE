
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function jsonRes(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function generateToken(): string {
  const bytes = new Uint8Array(48);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map(b => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    const { action, ...body } = await req.json();
    const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";

    switch (action) {
      case "login": {
        const { email, password, fingerprint } = body;
        if (!email || !password) return jsonRes({ error: "Email and password required" }, 400);

        const { data: valid } = await supabase.rpc("verify_password", {
          p_email: email,
          p_password: password,
        });

        if (!valid) return jsonRes({ error: "Invalid credentials" }, 401);

        const { data: user } = await supabase
          .from("users")
          .select("id, email, display_name, role, is_active")
          .ilike("email", email)
          .maybeSingle();

        if (!user) return jsonRes({ error: "Invalid credentials" }, 401);
        if (!user.is_active) return jsonRes({ error: "Account is disabled" }, 403);

        await supabase.rpc("clean_expired_sessions");

        const token = generateToken();
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

        const { error: sessionErr } = await supabase.from("sessions").insert({
          user_id: user.id,
          token,
          ip_address: ip,
          browser_fingerprint: fingerprint || null,
          expires_at: expiresAt,
        });

        if (sessionErr) {
          console.error("Session creation error:", sessionErr);
          return jsonRes({ error: "Failed to create session" }, 500);
        }

        await supabase.from("audit_logs").insert({
          user_id: user.id,
          action: "login",
          details: { method: "email" },
          ip_address: ip,
          browser_fingerprint: fingerprint || null,
        });

        return jsonRes({
          token,
          user: { id: user.id, email: user.email, display_name: user.display_name, role: user.role },
        });
      }

      case "validate": {
        const { token } = body;
        if (!token) return jsonRes({ error: "Token required" }, 400);

        const { data: session } = await supabase
          .from("sessions")
          .select("user_id")
          .eq("token", token)
          .gt("expires_at", new Date().toISOString())
          .maybeSingle();

        if (!session) return jsonRes({ error: "Invalid session" }, 401);

        const { data: user } = await supabase
          .from("users")
          .select("id, email, display_name, role, is_active")
          .eq("id", session.user_id)
          .maybeSingle();

        if (!user || !user.is_active) return jsonRes({ error: "Account disabled" }, 403);

        return jsonRes({
          user: { id: user.id, email: user.email, display_name: user.display_name, role: user.role },
        });
      }

      case "logout": {
        const { token } = body;
        if (token) {
          const { data: session } = await supabase
            .from("sessions")
            .select("user_id")
            .eq("token", token)
            .maybeSingle();

          if (session) {
            await supabase.from("audit_logs").insert({
              user_id: session.user_id,
              action: "logout",
              ip_address: ip,
            });
          }
          await supabase.from("sessions").delete().eq("token", token);
        }
        return jsonRes({ success: true });
      }

      default:
        return jsonRes({ error: "Unknown action" }, 400);
    }
  } catch (err) {
    console.error("Auth error:", err);
    return jsonRes({ error: "Internal server error" }, 500);
  }
});
