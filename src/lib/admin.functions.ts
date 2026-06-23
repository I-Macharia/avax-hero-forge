import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const listAdminUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    // Re-check role server-side
    const [{ data: isAdmin }, { data: isOrg }] = await Promise.all([
      supabase.rpc("has_role", { _user_id: userId, _role: "admin" }),
      supabase.rpc("has_role", { _user_id: userId, _role: "organizer" }),
    ]);
    if (!isAdmin && !isOrg) {
      throw new Error("Forbidden");
    }

    // Use service-role admin client to bypass RLS for listing (already authorized above)
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("profiles")
      .select("id, display_name, wallet_address, avatar_url, created_at")
      .order("created_at", { ascending: false });
    if (error) throw new Error("Failed to load users");
    return data ?? [];
  });
