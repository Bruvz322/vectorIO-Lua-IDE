
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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    const body = await req.json();
    const { action, ...params } = body;
    const authHeader = req.headers.get("authorization");
    const bearerToken = authHeader?.replace("Bearer ", "");
    const ip = req.headers.get("x-forwarded-for") || "unknown";

    if (!bearerToken) return jsonRes({ error: "Authorization required" }, 401);

    switch (action) {
      case "get_code": {
        const { build_type } = params;
        const bt = build_type === "build" ? "build" : "dev";
        const keyCol = bt === "dev" ? "api_key_dev" : "api_key_build";
        const { data: menu } = await supabase.from("menus")
          .select("id, dev_code, build_code, status")
          .eq(keyCol, bearerToken)
          .maybeSingle();
        if (!menu) return jsonRes({ error: "Invalid API key" }, 401);
        if (["terminated", "paused", "pending_approval", "rejected"].includes(menu.status)) {
          return jsonRes({ error: "Menu is " + menu.status }, 403);
        }
        if (menu.status === "maintenance") {
          return jsonRes({ error: "Menu is under maintenance" }, 503);
        }
        const code = bt === "build" ? menu.build_code : menu.dev_code;
        return jsonRes({ code });
      }

      case "create_user": {
        const { email, hwid } = params;
        if (!email) return jsonRes({ error: "Email required" }, 400);
        const { data: menu } = await supabase.from("menus").select("id, status").eq("payment_api_key", bearerToken).maybeSingle();
        if (!menu) return jsonRes({ error: "Invalid API key" }, 401);
        const { data, error } = await supabase.from("menu_users").insert({
          menu_id: menu.id,
          email,
          hwid: hwid || null,
        }).select().single();
        if (error) {
          if (error.code === "23505") return jsonRes({ error: "User already exists for this menu" }, 409);
          return jsonRes({ error: error.message }, 500);
        }
        return jsonRes({ success: true, user: data });
      }

      case "blacklist_user": {
        const { email, reason } = params;
        if (!email) return jsonRes({ error: "Email required" }, 400);
        const { data: menu } = await supabase.from("menus").select("id").eq("payment_api_key", bearerToken).maybeSingle();
        if (!menu) return jsonRes({ error: "Invalid API key" }, 401);
        const { data: updated, error } = await supabase.from("menu_users")
          .update({ is_blacklisted: true, blacklist_reason: reason || "Blacklisted via API" })
          .eq("menu_id", menu.id).eq("email", email).select().maybeSingle();
        if (error) return jsonRes({ error: error.message }, 500);
        if (!updated) return jsonRes({ error: "User not found" }, 404);
        return jsonRes({ success: true });
      }

      case "check_blacklist": {
        const { email } = params;
        if (!email) return jsonRes({ error: "Email required" }, 400);
        const { data: menu } = await supabase.from("menus").select("id").eq("payment_api_key", bearerToken).maybeSingle();
        if (!menu) return jsonRes({ error: "Invalid API key" }, 401);
        const { data: menuUser } = await supabase.from("menu_users")
          .select("is_blacklisted, blacklist_reason")
          .eq("menu_id", menu.id).eq("email", email).maybeSingle();
        if (!menuUser) return jsonRes({ error: "User not found" }, 404);
        return jsonRes({ blacklisted: menuUser.is_blacklisted, reason: menuUser.blacklist_reason });
      }

      case "check_user": {
        const { email } = params;
        if (!email) return jsonRes({ error: "Email required" }, 400);
        const { data: menu } = await supabase.from("menus").select("id").eq("payment_api_key", bearerToken).maybeSingle();
        if (!menu) return jsonRes({ error: "Invalid API key" }, 401);
        const { data: menuUser } = await supabase.from("menu_users")
          .select("email, created_at, is_blacklisted, hwid")
          .eq("menu_id", menu.id).eq("email", email).maybeSingle();
        if (!menuUser) return jsonRes({ error: "User not found" }, 404);
        return jsonRes({ user: menuUser });
      }

      case "debug_log": {
        const { details, email } = params;
        if (!details) return jsonRes({ error: "Details required" }, 400);
        const { data: menu } = await supabase.from("menus").select("id").eq("payment_api_key", bearerToken).maybeSingle();
        if (!menu) return jsonRes({ error: "Invalid API key" }, 401);
        let menuUserId = null;
        if (email) {
          const { data: mu } = await supabase.from("menu_users").select("id").eq("menu_id", menu.id).eq("email", email).maybeSingle();
          menuUserId = mu?.id || null;
        }
        const { error } = await supabase.from("debug_logs").insert({
          menu_id: menu.id,
          menu_user_id: menuUserId,
          details,
          ip_address: ip,
        });
        if (error) return jsonRes({ error: error.message }, 500);
        return jsonRes({ success: true });
      }

      default:
        return jsonRes({ error: "Unknown action" }, 400);
    }
  } catch (err) {
    console.error("External API error:", err);
    return jsonRes({ error: "Internal server error" }, 500);
  }
});
