import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { Shield, UserCheck, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/useSession";
import { listAdminUsers } from "@/lib/admin.functions";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({ meta: [{ title: "Admin · MiniHack Heroes" }] }),
  component: AdminPage,
});

function AdminPage() {
  const { user } = useSession();
  const qc = useQueryClient();
  const [selectedSession, setSelectedSession] = useState<string>("");
  const [selectedQuest, setSelectedQuest] = useState<string>("");
  const fetchAdminUsers = useServerFn(listAdminUsers);

  const { data: sessions } = useQuery({
    queryKey: ["admin-sessions"],
    queryFn: async () => (await supabase.from("sessions").select("*").order("starts_at")).data ?? [],
  });
  const { data: quests } = useQuery({
    queryKey: ["admin-quests"],
    queryFn: async () => (await supabase.from("quests").select("*").order("points")).data ?? [],
  });
  const { data: users, error: usersError } = useQuery({
    queryKey: ["admin-users"],
    queryFn: () => fetchAdminUsers(),
    retry: false,
  });

  const markAttendance = useMutation({
    mutationFn: async (userId: string) => {
      if (!selectedSession) throw new Error("Pick a session first");
      const { error } = await supabase.from("attendance").insert({
        user_id: userId,
        session_id: selectedSession,
        marked_by: user!.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Attendance marked");
      qc.invalidateQueries();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  const awardQuest = useMutation({
    mutationFn: async (userId: string) => {
      if (!selectedQuest) throw new Error("Pick a quest first");
      const { error } = await supabase.from("quest_completions").insert({
        user_id: userId,
        quest_id: selectedQuest,
        completed_by: user!.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Quest awarded");
      qc.invalidateQueries();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 space-y-8">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Shield className="h-7 w-7 text-accent" /> Admin Panel
        </h1>
        <p className="text-muted-foreground mt-1">Manage attendance and quests for the cohort.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card/70 p-5">
          <label className="text-xs uppercase font-semibold text-muted-foreground">Active session</label>
          <select
            value={selectedSession}
            onChange={(e) => setSelectedSession(e.target.value)}
            className="mt-2 w-full rounded-lg bg-input/50 border border-border px-3 py-2"
          >
            <option value="">— pick session —</option>
            {sessions?.map((s) => (
              <option key={s.id} value={s.id}>{s.title}</option>
            ))}
          </select>
        </div>
        <div className="rounded-2xl border border-border bg-card/70 p-5">
          <label className="text-xs uppercase font-semibold text-muted-foreground">Active quest</label>
          <select
            value={selectedQuest}
            onChange={(e) => setSelectedQuest(e.target.value)}
            className="mt-2 w-full rounded-lg bg-input/50 border border-border px-3 py-2"
          >
            <option value="">— pick quest —</option>
            {quests?.map((q) => (
              <option key={q.id} value={q.id}>{q.title} (+{q.points})</option>
            ))}
          </select>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card/70 overflow-hidden">
        <div className="px-5 py-3 border-b border-border flex items-center gap-2">
          <UserCheck className="h-4 w-4" />
          <span className="font-semibold">Participants ({users?.length ?? 0})</span>
        </div>
        <div className="divide-y divide-border max-h-[60vh] overflow-auto">
          {users?.map((u) => (
            <div key={u.id} className="flex items-center gap-3 px-5 py-3">
              <div className="h-9 w-9 rounded-full bg-muted grid place-items-center text-sm font-semibold">
                {(u.display_name ?? "?").charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{u.display_name}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {u.wallet_address ?? "no wallet"}
                </p>
              </div>
              <button
                onClick={() => markAttendance.mutate(u.id)}
                disabled={!selectedSession || markAttendance.isPending}
                className="rounded-md border border-border px-3 py-1.5 text-xs font-medium hover:border-primary/60 disabled:opacity-40 flex items-center gap-1"
              >
                <Check className="h-3 w-3" /> Attended
              </button>
              <button
                onClick={() => awardQuest.mutate(u.id)}
                disabled={!selectedQuest || awardQuest.isPending}
                className="rounded-md bg-gradient-to-r from-primary to-accent px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-40"
              >
                Award quest
              </button>
            </div>
          ))}
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        Tip: batch on-chain minting can be triggered from your own admin wallet by listing eligible
        users above and calling the contract's <code>mintTo</code> from a script — see{" "}
        <code>contracts/README.md</code>. Wallets whose addresses are in{" "}
        <code>VITE_ADMIN_WALLETS</code> are pre-authorized as minters on the contract.
      </p>
    </div>
  );
}
