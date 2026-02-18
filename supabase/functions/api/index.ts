
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

interface User {
  id: string;
  email: string;
  display_name: string;
  role: string;
  is_active: boolean;
}

async function validateSession(supabase: ReturnType<typeof createClient>, token: string): Promise<User | null> {
  if (!token) return null;
  const { data: session } = await supabase
    .from("sessions")
    .select("user_id")
    .eq("token", token)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();
  if (!session) return null;
  const { data: user } = await supabase
    .from("users")
    .select("id, email, display_name, role, is_active")
    .eq("id", session.user_id)
    .eq("is_active", true)
    .maybeSingle();
  return user || null;
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
    const { action, token, ...body } = await req.json();
    const ip = req.headers.get("x-forwarded-for") || "unknown";

    const user = await validateSession(supabase, token);
    if (!user) return jsonRes({ error: "Unauthorized" }, 401);

    const audit = async (actionName: string, details: Record<string, unknown> = {}, entityType?: string, entityId?: string) => {
      await supabase.from("audit_logs").insert({
        user_id: user.id,
        action: actionName,
        details,
        ip_address: ip,
        entity_type: entityType || null,
        entity_id: entityId || null,
      });
    };

    switch (action) {
      // ========== MENU OPERATIONS ==========
      case "get_menus": {
        let query = supabase.from("menus").select("id, name, status, created_at, updated_at, owner_id");
        if (user.role !== "admin") query = query.eq("owner_id", user.id);
        const { data, error } = await query.order("created_at", { ascending: false });
        if (error) return jsonRes({ error: error.message }, 500);
        return jsonRes({ menus: data });
      }

      case "create_menu": {
        if (user.role !== "menu_dev") return jsonRes({ error: "Only menu devs can create menus" }, 403);
        const { name } = body;
        if (!name || typeof name !== "string" || name.trim().length < 2) {
          return jsonRes({ error: "Valid menu name required (min 2 chars)" }, 400);
        }
        const defaultCode = "-- FiveM Lua Menu: " + name.trim() + "\n-- Start coding here\n\nCreateThread(function()\n  while true do\n    Wait(0)\n    -- Your menu logic\n  end\nend)\n";
        const { data, error } = await supabase.from("menus").insert({
          name: name.trim(),
          owner_id: user.id,
          dev_code: defaultCode,
        }).select().single();
        if (error) return jsonRes({ error: error.message }, 500);
        await audit("create_menu", { name: name.trim() }, "menu", data.id);
        return jsonRes({ menu: data });
      }

      case "get_menu": {
        const { menu_id } = body;
        if (!menu_id) return jsonRes({ error: "menu_id required" }, 400);
        let query = supabase.from("menus").select("*").eq("id", menu_id);
        if (user.role !== "admin") query = query.eq("owner_id", user.id);
        const { data, error } = await query.maybeSingle();
        if (error || !data) return jsonRes({ error: "Menu not found" }, 404);
        return jsonRes({ menu: data });
      }

      case "update_code": {
        const { menu_id, code } = body;
        if (!menu_id) return jsonRes({ error: "menu_id required" }, 400);
        const { data: menu } = await supabase.from("menus").select("owner_id, status").eq("id", menu_id).maybeSingle();
        if (!menu) return jsonRes({ error: "Menu not found" }, 404);
        if (menu.owner_id !== user.id && user.role !== "admin") return jsonRes({ error: "Forbidden" }, 403);
        const { error } = await supabase.from("menus").update({ dev_code: code }).eq("id", menu_id);
        if (error) return jsonRes({ error: error.message }, 500);
        await audit("update_code", { menu_id }, "menu", menu_id);
        return jsonRes({ success: true });
      }

      case "push_to_dev": {
        const { menu_id, code } = body;
        const { data: menu } = await supabase.from("menus").select("owner_id, status").eq("id", menu_id).maybeSingle();
        if (!menu || (menu.owner_id !== user.id && user.role !== "admin")) return jsonRes({ error: "Forbidden" }, 403);
        const { error } = await supabase.from("menus").update({ dev_code: code }).eq("id", menu_id);
        if (error) return jsonRes({ error: error.message }, 500);
        await audit("push_to_dev", { menu_id }, "menu", menu_id);
        return jsonRes({ success: true });
      }

      case "push_to_build": {
        const { menu_id, code } = body;
        const { data: menu } = await supabase.from("menus").select("owner_id, status").eq("id", menu_id).maybeSingle();
        if (!menu || (menu.owner_id !== user.id && user.role !== "admin")) return jsonRes({ error: "Forbidden" }, 403);
        const { error } = await supabase.from("menus").update({ build_code: code }).eq("id", menu_id);
        if (error) return jsonRes({ error: error.message }, 500);
        await audit("push_to_build", { menu_id }, "menu", menu_id);
        return jsonRes({ success: true });
      }

      case "upload_menu": {
        const { menu_id, code, target } = body;
        const { data: menu } = await supabase.from("menus").select("owner_id, status").eq("id", menu_id).maybeSingle();
        if (!menu || (menu.owner_id !== user.id && user.role !== "admin")) return jsonRes({ error: "Forbidden" }, 403);
        const field = target === "build" ? { build_code: code } : { dev_code: code };
        const { error } = await supabase.from("menus").update(field).eq("id", menu_id);
        if (error) return jsonRes({ error: error.message }, 500);
        await audit("upload_menu", { menu_id, target }, "menu", menu_id);
        return jsonRes({ success: true });
      }

      // ========== MENU USERS ==========
      case "get_menu_users": {
        const { menu_id } = body;
        const { data: menu } = await supabase.from("menus").select("owner_id").eq("id", menu_id).maybeSingle();
        if (!menu || (menu.owner_id !== user.id && user.role !== "admin")) return jsonRes({ error: "Forbidden" }, 403);
        const { data, error } = await supabase.from("menu_users").select("*").eq("menu_id", menu_id).order("created_at", { ascending: false });
        if (error) return jsonRes({ error: error.message }, 500);
        return jsonRes({ users: data });
      }

      case "blacklist_user": {
        const { menu_user_id, reason, menu_id } = body;
        if (menu_id) {
          const { data: menu } = await supabase.from("menus").select("owner_id").eq("id", menu_id).maybeSingle();
          if (!menu || (menu.owner_id !== user.id && user.role !== "admin")) return jsonRes({ error: "Forbidden" }, 403);
        }
        const { error } = await supabase.from("menu_users").update({
          is_blacklisted: true,
          blacklist_reason: reason || "No reason provided",
        }).eq("id", menu_user_id);
        if (error) return jsonRes({ error: error.message }, 500);
        await audit("blacklist_user", { menu_user_id, reason }, "menu_user", menu_user_id);
        return jsonRes({ success: true });
      }

      case "unblacklist_user": {
        const { menu_user_id, menu_id } = body;
        if (menu_id) {
          const { data: menu } = await supabase.from("menus").select("owner_id").eq("id", menu_id).maybeSingle();
          if (!menu || (menu.owner_id !== user.id && user.role !== "admin")) return jsonRes({ error: "Forbidden" }, 403);
        }
        const { error } = await supabase.from("menu_users").update({
          is_blacklisted: false,
          blacklist_reason: null,
        }).eq("id", menu_user_id);
        if (error) return jsonRes({ error: error.message }, 500);
        await audit("unblacklist_user", { menu_user_id }, "menu_user", menu_user_id);
        return jsonRes({ success: true });
      }

      // ========== STATUS & MANAGEMENT ==========
      case "get_menu_stats": {
        const { menu_id } = body;
        const { data: menu } = await supabase.from("menus").select("owner_id, status, name, created_at, updated_at").eq("id", menu_id).maybeSingle();
        if (!menu || (menu.owner_id !== user.id && user.role !== "admin")) return jsonRes({ error: "Forbidden" }, 403);
        const { count: totalUsers } = await supabase.from("menu_users").select("*", { count: "exact", head: true }).eq("menu_id", menu_id);
        const { count: blacklisted } = await supabase.from("menu_users").select("*", { count: "exact", head: true }).eq("menu_id", menu_id).eq("is_blacklisted", true);
        const { count: debugCount } = await supabase.from("debug_logs").select("*", { count: "exact", head: true }).eq("menu_id", menu_id);
        return jsonRes({
          name: menu.name,
          status: menu.status,
          created_at: menu.created_at,
          updated_at: menu.updated_at,
          total_users: totalUsers || 0,
          blacklisted_users: blacklisted || 0,
          debug_logs: debugCount || 0,
        });
      }

      case "update_menu_status": {
        const { menu_id, status } = body;
        const { data: menu } = await supabase.from("menus").select("owner_id, status").eq("id", menu_id).maybeSingle();
        if (!menu) return jsonRes({ error: "Menu not found" }, 404);
        if (user.role !== "admin" && menu.owner_id !== user.id) return jsonRes({ error: "Forbidden" }, 403);
        if (user.role !== "admin" && !["maintenance", "paused", "active"].includes(status)) {
          return jsonRes({ error: "Invalid status transition" }, 400);
        }
        const { error } = await supabase.from("menus").update({ status }).eq("id", menu_id);
        if (error) return jsonRes({ error: error.message }, 500);
        await audit("update_menu_status", { menu_id, from: menu.status, to: status }, "menu", menu_id);
        return jsonRes({ success: true });
      }

      case "request_deletion": {
        const { menu_id, reason } = body;
        if (!reason) return jsonRes({ error: "Reason required" }, 400);
        const { data: menu } = await supabase.from("menus").select("owner_id").eq("id", menu_id).maybeSingle();
        if (!menu || menu.owner_id !== user.id) return jsonRes({ error: "Forbidden" }, 403);
        const { data, error } = await supabase.from("menu_deletion_requests").insert({
          menu_id,
          requester_id: user.id,
          reason,
        }).select().single();
        if (error) return jsonRes({ error: error.message }, 500);
        await supabase.from("menus").update({ status: "deletion_requested" }).eq("id", menu_id);
        await audit("request_deletion", { menu_id, reason }, "menu", menu_id);
        return jsonRes({ request: data });
      }

      case "get_api_info": {
        const { menu_id } = body;
        const { data: menu } = await supabase.from("menus").select("api_key_dev, api_key_build, payment_api_key, name, status").eq("id", menu_id).maybeSingle();
        if (!menu) return jsonRes({ error: "Menu not found" }, 404);
        return jsonRes({ api: menu });
      }

      case "get_debug_logs": {
        const { menu_id } = body;
        const { data: menu } = await supabase.from("menus").select("owner_id").eq("id", menu_id).maybeSingle();
        if (!menu || (menu.owner_id !== user.id && user.role !== "admin")) return jsonRes({ error: "Forbidden" }, 403);
        const { data, error } = await supabase.from("debug_logs").select("*").eq("menu_id", menu_id).order("created_at", { ascending: false }).limit(100);
        if (error) return jsonRes({ error: error.message }, 500);
        return jsonRes({ logs: data });
      }

      // ========== TICKETS ==========
      case "create_ticket": {
        const { subject, description, menu_id: ticketMenuId } = body;
        if (!subject || !description) return jsonRes({ error: "Subject and description required" }, 400);
        const { data, error } = await supabase.from("tickets").insert({
          creator_id: user.id,
          menu_id: ticketMenuId || null,
          subject,
          description,
        }).select().single();
        if (error) return jsonRes({ error: error.message }, 500);
        await audit("create_ticket", { subject }, "ticket", data.id);
        return jsonRes({ ticket: data });
      }

      case "get_tickets": {
        let query = supabase.from("tickets").select("*");
        if (user.role !== "admin") query = query.eq("creator_id", user.id);
        const { data, error } = await query.order("created_at", { ascending: false });
        if (error) return jsonRes({ error: error.message }, 500);
        return jsonRes({ tickets: data });
      }

      case "get_ticket_messages": {
        const { ticket_id } = body;
        const { data: ticket } = await supabase.from("tickets").select("creator_id").eq("id", ticket_id).maybeSingle();
        if (!ticket || (ticket.creator_id !== user.id && user.role !== "admin")) return jsonRes({ error: "Forbidden" }, 403);
        const { data, error } = await supabase.from("ticket_messages").select("*").eq("ticket_id", ticket_id).order("created_at", { ascending: true });
        if (error) return jsonRes({ error: error.message }, 500);
        // Get sender info
        const senderIds = [...new Set((data || []).map((m: { sender_id: string }) => m.sender_id))];
        const { data: senders } = await supabase.from("users").select("id, display_name, role").in("id", senderIds);
        const senderMap = Object.fromEntries((senders || []).map((s: { id: string; display_name: string; role: string }) => [s.id, s]));
        const messages = (data || []).map((m: Record<string, unknown>) => ({ ...m, sender: senderMap[m.sender_id as string] || null }));
        return jsonRes({ messages, ticket });
      }

      case "send_ticket_message": {
        const { ticket_id, message } = body;
        if (!message) return jsonRes({ error: "Message required" }, 400);
        const { data: ticket } = await supabase.from("tickets").select("creator_id, status").eq("id", ticket_id).maybeSingle();
        if (!ticket || (ticket.creator_id !== user.id && user.role !== "admin")) return jsonRes({ error: "Forbidden" }, 403);
        const { data, error } = await supabase.from("ticket_messages").insert({
          ticket_id,
          sender_id: user.id,
          message,
        }).select().single();
        if (error) return jsonRes({ error: error.message }, 500);
        if (user.role === "admin" && ticket.status === "open") {
          await supabase.from("tickets").update({ status: "in_progress", assigned_admin_id: user.id }).eq("id", ticket_id);
        }
        return jsonRes({ message: { ...data, sender: { id: user.id, display_name: user.display_name, role: user.role } } });
      }

      case "update_ticket_status": {
        const { ticket_id, status } = body;
        if (user.role !== "admin") return jsonRes({ error: "Admin only" }, 403);
        const { error } = await supabase.from("tickets").update({ status }).eq("id", ticket_id);
        if (error) return jsonRes({ error: error.message }, 500);
        await audit("update_ticket_status", { ticket_id, status }, "ticket", ticket_id);
        return jsonRes({ success: true });
      }

      // ========== ADMIN ==========
      case "admin_get_all_menus": {
        if (user.role !== "admin") return jsonRes({ error: "Admin only" }, 403);
        const { data, error } = await supabase.from("menus").select("*").order("created_at", { ascending: false });
        if (error) return jsonRes({ error: error.message }, 500);
        // Get owner info
        const ownerIds = [...new Set((data || []).map((m: { owner_id: string }) => m.owner_id))];
        const { data: owners } = await supabase.from("users").select("id, email, display_name").in("id", ownerIds);
        const ownerMap = Object.fromEntries((owners || []).map((o: { id: string }) => [o.id, o]));
        const menus = (data || []).map((m: Record<string, unknown>) => ({ ...m, owner: ownerMap[m.owner_id as string] || null }));
        return jsonRes({ menus });
      }

      case "admin_approve_menu": {
        if (user.role !== "admin") return jsonRes({ error: "Admin only" }, 403);
        const { menu_id } = body;
        const { error } = await supabase.from("menus").update({ status: "active" }).eq("id", menu_id);
        if (error) return jsonRes({ error: error.message }, 500);
        await audit("admin_approve_menu", { menu_id }, "menu", menu_id);
        return jsonRes({ success: true });
      }

      case "admin_reject_menu": {
        if (user.role !== "admin") return jsonRes({ error: "Admin only" }, 403);
        const { menu_id } = body;
        const { error } = await supabase.from("menus").update({ status: "rejected" }).eq("id", menu_id);
        if (error) return jsonRes({ error: error.message }, 500);
        await audit("admin_reject_menu", { menu_id }, "menu", menu_id);
        return jsonRes({ success: true });
      }

      case "admin_terminate_menu": {
        if (user.role !== "admin") return jsonRes({ error: "Admin only" }, 403);
        const { menu_id } = body;
        const { error } = await supabase.from("menus").update({ status: "terminated" }).eq("id", menu_id);
        if (error) return jsonRes({ error: error.message }, 500);
        await audit("admin_terminate_menu", { menu_id }, "menu", menu_id);
        return jsonRes({ success: true });
      }

      case "admin_get_all_users": {
        if (user.role !== "admin") return jsonRes({ error: "Admin only" }, 403);
        const { data, error } = await supabase.from("users").select("id, email, display_name, role, is_active, created_at").order("created_at", { ascending: false });
        if (error) return jsonRes({ error: error.message }, 500);
        return jsonRes({ users: data });
      }

      case "admin_create_user": {
        if (user.role !== "admin") return jsonRes({ error: "Admin only" }, 403);
        const { email, password, display_name, role } = body;
        if (!email || !password || !display_name) return jsonRes({ error: "All fields required" }, 400);
        const { data: newId, error } = await supabase.rpc("create_user_with_password", {
          p_email: email,
          p_password: password,
          p_display_name: display_name,
          p_role: role || "menu_dev",
        });
        if (error) return jsonRes({ error: error.message }, 500);
        await audit("admin_create_user", { email, role: role || "menu_dev" }, "user", newId);
        return jsonRes({ user_id: newId });
      }

      case "admin_toggle_user": {
        if (user.role !== "admin") return jsonRes({ error: "Admin only" }, 403);
        const { user_id, is_active } = body;
        if (user_id === user.id) return jsonRes({ error: "Cannot toggle your own account" }, 400);
        const { error } = await supabase.from("users").update({ is_active }).eq("id", user_id);
        if (error) return jsonRes({ error: error.message }, 500);
        if (!is_active) {
          await supabase.from("sessions").delete().eq("user_id", user_id);
        }
        await audit("admin_toggle_user", { user_id, is_active }, "user", user_id);
        return jsonRes({ success: true });
      }

      case "admin_get_audit_logs": {
        if (user.role !== "admin") return jsonRes({ error: "Admin only" }, 403);
        const { limit: lim = 100, offset = 0 } = body;
        const { data, error } = await supabase.from("audit_logs").select("*").order("created_at", { ascending: false }).range(offset, offset + lim - 1);
        if (error) return jsonRes({ error: error.message }, 500);
        const userIds = [...new Set((data || []).filter((l: { user_id: string | null }) => l.user_id).map((l: { user_id: string }) => l.user_id))];
        const { data: users } = await supabase.from("users").select("id, email, display_name").in("id", userIds);
        const userMap = Object.fromEntries((users || []).map((u: { id: string }) => [u.id, u]));
        const logs = (data || []).map((l: Record<string, unknown>) => ({ ...l, user: l.user_id ? userMap[l.user_id as string] : null }));
        return jsonRes({ logs });
      }

      case "admin_get_deletion_requests": {
        if (user.role !== "admin") return jsonRes({ error: "Admin only" }, 403);
        const { data, error } = await supabase.from("menu_deletion_requests").select("*").order("created_at", { ascending: false });
        if (error) return jsonRes({ error: error.message }, 500);
        const menuIds = [...new Set((data || []).map((r: { menu_id: string }) => r.menu_id))];
        const requesterIds = [...new Set((data || []).map((r: { requester_id: string }) => r.requester_id))];
        const { data: menus } = await supabase.from("menus").select("id, name").in("id", menuIds);
        const { data: requesters } = await supabase.from("users").select("id, email, display_name").in("id", requesterIds);
        const menuMap = Object.fromEntries((menus || []).map((m: { id: string }) => [m.id, m]));
        const reqMap = Object.fromEntries((requesters || []).map((r: { id: string }) => [r.id, r]));
        const requests = (data || []).map((r: Record<string, unknown>) => ({
          ...r,
          menu: menuMap[r.menu_id as string] || null,
          requester: reqMap[r.requester_id as string] || null,
        }));
        return jsonRes({ requests });
      }

      case "admin_handle_deletion": {
        if (user.role !== "admin") return jsonRes({ error: "Admin only" }, 403);
        const { request_id, decision, response, transfer_to_email } = body;
        const { data: delReq } = await supabase.from("menu_deletion_requests").select("menu_id").eq("id", request_id).maybeSingle();
        if (!delReq) return jsonRes({ error: "Request not found" }, 404);
        const updates: Record<string, unknown> = { status: decision, admin_response: response, admin_id: user.id };
        if (decision === "transferred" && transfer_to_email) {
          updates.transfer_to_email = transfer_to_email;
          const { data: target } = await supabase.from("users").select("id").ilike("email", transfer_to_email).maybeSingle();
          if (target) {
            await supabase.from("menus").update({ owner_id: target.id, status: "active" }).eq("id", delReq.menu_id);
          } else {
            return jsonRes({ error: "Transfer target user not found" }, 404);
          }
        } else if (decision === "approved") {
          await supabase.from("menus").update({ status: "terminated" }).eq("id", delReq.menu_id);
        } else {
          await supabase.from("menus").update({ status: "active" }).eq("id", delReq.menu_id);
        }
        const { error } = await supabase.from("menu_deletion_requests").update(updates).eq("id", request_id);
        if (error) return jsonRes({ error: error.message }, 500);
        await audit("admin_handle_deletion", { request_id, decision }, "menu", delReq.menu_id);
        return jsonRes({ success: true });
      }

      case "admin_view_code": {
        if (user.role !== "admin") return jsonRes({ error: "Admin only" }, 403);
        const { menu_id, build_type } = body;
        const { data: menu } = await supabase.from("menus").select("dev_code, build_code, name").eq("id", menu_id).maybeSingle();
        if (!menu) return jsonRes({ error: "Menu not found" }, 404);
        return jsonRes({ code: build_type === "build" ? menu.build_code : menu.dev_code, name: menu.name });
      }

      case "admin_edit_code": {
        if (user.role !== "admin") return jsonRes({ error: "Admin only" }, 403);
        const { menu_id, code, build_type } = body;
        const field = build_type === "build" ? { build_code: code } : { dev_code: code };
        const { error } = await supabase.from("menus").update(field).eq("id", menu_id);
        if (error) return jsonRes({ error: error.message }, 500);
        await audit("admin_edit_code", { menu_id, build_type }, "menu", menu_id);
        return jsonRes({ success: true });
      }

      case "admin_manage_menu_users": {
        if (user.role !== "admin") return jsonRes({ error: "Admin only" }, 403);
        const { menu_id } = body;
        const { data, error } = await supabase.from("menu_users").select("*").eq("menu_id", menu_id).order("created_at", { ascending: false });
        if (error) return jsonRes({ error: error.message }, 500);
        return jsonRes({ users: data });
      }

      default:
        return jsonRes({ error: "Unknown action: " + action }, 400);
    }
  } catch (err) {
    console.error("API error:", err);
    return jsonRes({ error: "Internal server error" }, 500);
  }
});
