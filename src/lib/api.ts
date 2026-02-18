import { supabase } from "@/integrations/supabase/client";

export async function apiCall<T = Record<string, unknown>>(
  action: string,
  body: Record<string, unknown> = {}
): Promise<T> {
  const token = localStorage.getItem("session_token");
  if (!token) throw new Error("Not authenticated");

  const { data, error } = await supabase.functions.invoke("api", {
    body: { action, token, ...body },
  });

  if (error) throw new Error("Request failed");
  if (data?.error) throw new Error(data.error);
  return data as T;
}
