import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "./useSession";

export function useRoles() {
  const { user } = useSession();
  return useQuery({
    queryKey: ["roles", user?.id],
    enabled: !!user,
    queryFn: async () => {
      if (!user) return [] as string[];
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);
      return (data ?? []).map((r) => r.role as string);
    },
  });
}

export function useIsOrganizer() {
  const { data } = useRoles();
  return (data ?? []).some((r) => r === "admin" || r === "organizer");
}
