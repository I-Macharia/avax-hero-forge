import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { useSession } from "./useSession";

export type AppRole = Database["public"]["Enums"]["app_role"];

export function useRoles() {
  const { user } = useSession();
  return useQuery({
    queryKey: ["roles", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<AppRole[]> => {
      if (!user) return [];
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);
      return (data ?? []).map((r) => r.role);
    },
  });
}

export function useIsOrganizer() {
  const { data } = useRoles();
  return (data ?? []).some((r) => r === "admin" || r === "organizer");
}
