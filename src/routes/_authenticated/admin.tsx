import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { Shield, Send, RefreshCw, Coins, ArrowRightLeft, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { listAdminUsers } from "@/lib/admin.functions";
import { adminMintBadge, adminTransferBadge } from "@/lib/admin-mint.functions";
import { resyncTallyQuest } from "@/lib/tally.functions";
import { txUrl } from "@/lib/contract/config";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({ meta: [{ title: "Admin · MiniHack Heroes" }] }),
  component: AdminPage,
});

type Tab = "mint" | "submissions" | "transfer";

function AdminPage() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>("mint");

  const fetchAdminUsers = useServerFn(listAdminUsers);
  const callMint = useServerFn(adminMintBadge);
  const callTransfer = useServerFn(adminTransferBadge);
  const callResync = useServerFn(resyncTallyQuest);

  const { data: quests } = useQuery({
    queryKey: ["admin-quests"],
    queryFn: async () =>
      (await supabase.from("quests").select("*").order("week").order("points")).data ?? [],
  });
  const { data: users, error: usersError } = useQuery({
    queryKey: ["admin-users"],
    queryFn: () => fetchAdminUsers(),
    retry: false,
  });
  const { data: submissions } = useQuery({
    queryKey: ["admin-submissions"],
    queryFn: async () =>
      (
        await supabase
          .from("quest_submissions")
          .select("*, quest:quests(title, track)")
          .order("submitted_at", { ascending: false })
          .limit(200)
      ).data ?? [],
  });
  const { data: mints } = useQuery({
    queryKey: ["admin-mints"],
    queryFn: async () =>
      (
        await supabase
          .from("nft_mints")
          .select("id, token_id, owner_address, tx_hash, user_id, quest:quests(title)")
          .order("minted_at", { ascending: false })
          .limit(100)
      ).data ?? [],
  });

  const [selectedQuest, setSelectedQuest] = useState<string>("");
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [transferMintId, setTransferMintId] = useState("");
  const [transferTo, setTransferTo] = useState("");

  const mintMutation = useMutation({
    mutationFn: async () => {
      if (!selectedQuest) throw new Error("Pick a quest");
      if (selectedUsers.size === 0) throw new Error("Pick at least one user");
      return callMint({ data: { questId: selectedQuest, userIds: Array.from(selectedUsers) } });
    },
    onSuccess: (res) => {
      toast.success(`Minted ${res.minted} badge(s)`, {
        description: res.skipped ? `Skipped ${res.skipped} (no wallet or already minted)` : undefined,
        action: res.hash ? { label: "View tx", onClick: () => window.open(txUrl(res.hash!)) } : undefined,
      });
      setSelectedUsers(new Set());
      qc.invalidateQueries();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Mint failed"),
  });

  const transferMutation = useMutation({
    mutationFn: async () => {
      if (!transferMintId || !transferTo) throw new Error("Need mint id + destination");
      return callTransfer({ data: { mintId: transferMintId, toAddress: transferTo } });
    },
    onSuccess: (res) => {
      toast.success("Transferred", {
        action: { label: "View tx", onClick: () => window.open(txUrl(res.hash)) },
      });
      setTransferMintId("");
      setTransferTo("");
      qc.invalidateQueries();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Transfer failed"),
  });

  const resyncMutation = useMutation({
    mutationFn: async (questId: string) => callResync({ data: { questId } }),
    onSuccess: (r) => {
      toast.success(`Resynced ${r.total} submission(s)`);
      qc.invalidateQueries({ queryKey: ["admin-submissions"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Resync failed"),
  });

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 space-y-8">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Shield className="h-7 w-7 text-accent" /> Admin Panel
        </h1>
        <p className="text-muted-foreground mt-1">Mint, transfer, and approve quest submissions.</p>
      </div>

      <div className="inline-flex rounded-full border border-border bg-card/60 p-1">
        {([
          { k: "mint" as const, l: "Mint badges", icon: Coins },
          { k: "submissions" as const, l: "Tally submissions", icon: Send },
          { k: "transfer" as const, l: "Transfer", icon: ArrowRightLeft },
        ]).map(({ k, l, icon: Icon }) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium flex items-center gap-1.5 ${
              tab === k ? "bg-primary text-primary-foreground" : "text-muted-foreground"
            }`}
          >
            <Icon className="h-3.5 w-3.5" /> {l}
          </button>
        ))}
      </div>

      {usersError && (
        <div className="rounded-2xl border border-destructive/40 bg-destructive/10 p-5 text-sm text-destructive">
          You don&apos;t have permission to view participants. Ask an admin for access.
        </div>
      )}

      {tab === "mint" && (
        <section className="rounded-2xl border border-border bg-card/70 p-5 space-y-4">
          <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
            <select
              value={selectedQuest}
              onChange={(e) => setSelectedQuest(e.target.value)}
              className="rounded-lg bg-input/50 border border-border px-3 py-2"
            >
              <option value="">— pick a quest to mint —</option>
              {quests?.map((q) => (
                <option key={q.id} value={q.id}>
                  Week {q.week} · {q.track} · {q.title} (+{q.points} pts)
                </option>
              ))}
            </select>
            <button
              onClick={() => mintMutation.mutate()}
              disabled={mintMutation.isPending || !selectedQuest || selectedUsers.size === 0}
              className="rounded-lg bg-gradient-to-r from-primary to-accent px-5 py-2 text-sm font-semibold text-white disabled:opacity-40 flex items-center gap-2"
            >
              <Coins className="h-4 w-4" />
              {mintMutation.isPending ? "Minting…" : `Mint to ${selectedUsers.size} wallet(s)`}
            </button>
          </div>

          <div className="rounded-xl border border-border overflow-hidden">
            <div className="px-4 py-2 bg-muted/30 text-xs uppercase tracking-wider text-muted-foreground flex items-center justify-between">
              <span>Participants ({users?.length ?? 0})</span>
              <button
                className="text-[11px] underline"
                onClick={() => {
                  if (!users) return;
                  if (selectedUsers.size === users.length) setSelectedUsers(new Set());
                  else setSelectedUsers(new Set(users.map((u) => u.id)));
                }}
              >
                {users && selectedUsers.size === users.length ? "Clear" : "Select all"}
              </button>
            </div>
            <div className="divide-y divide-border max-h-[50vh] overflow-auto">
              {users?.map((u) => {
                const checked = selectedUsers.has(u.id);
                return (
                  <label
                    key={u.id}
                    className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/20 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => {
                        const next = new Set(selectedUsers);
                        if (checked) next.delete(u.id);
                        else next.add(u.id);
                        setSelectedUsers(next);
                      }}
                      className="h-4 w-4 accent-primary"
                    />
                    <div className="h-8 w-8 rounded-full bg-muted grid place-items-center text-xs font-semibold">
                      {(u.display_name ?? "?").charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{u.display_name ?? "—"}</p>
                      <p className="text-[11px] text-muted-foreground truncate">
                        {u.wallet_address ?? "no wallet linked"}
                      </p>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {tab === "submissions" && (
        <section className="rounded-2xl border border-border bg-card/70 overflow-hidden">
          <div className="px-5 py-3 border-b border-border flex flex-wrap items-center gap-3 justify-between">
            <h2 className="font-semibold">Tally submissions ({submissions?.length ?? 0})</h2>
            <div className="flex items-center gap-2">
              <select
                value={selectedQuest}
                onChange={(e) => setSelectedQuest(e.target.value)}
                className="rounded-lg bg-input/50 border border-border px-2 py-1 text-xs"
              >
                <option value="">Pick a quest to resync</option>
                {quests?.map((q) => (
                  <option key={q.id} value={q.id}>
                    {q.title}
                  </option>
                ))}
              </select>
              <button
                onClick={() => selectedQuest && resyncMutation.mutate(selectedQuest)}
                disabled={!selectedQuest || resyncMutation.isPending}
                className="rounded-md border border-border px-3 py-1.5 text-xs font-medium hover:border-primary/60 disabled:opacity-40 flex items-center gap-1"
              >
                <RefreshCw className={`h-3 w-3 ${resyncMutation.isPending ? "animate-spin" : ""}`} />
                Resync
              </button>
            </div>
          </div>
          <div className="divide-y divide-border max-h-[60vh] overflow-auto">
            {submissions?.length === 0 && (
              <div className="p-10 text-center text-muted-foreground">
                No submissions yet. Configure a Tally form on each quest and point its webhook at
                <br />
                <code className="text-xs">/api/public/tally-webhook</code>.
              </div>
            )}
            {submissions?.map((s) => (
              <div key={s.id} className="px-5 py-3 flex flex-wrap items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {s.respondent_name ?? s.respondent_email ?? "Anonymous"}
                    {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                    <span className="ml-2 text-xs text-muted-foreground">→ {(s as any).quest?.title}</span>
                  </p>
                  <p className="text-[11px] text-muted-foreground truncate">
                    {s.respondent_email ?? "—"} · {s.respondent_wallet ?? "no wallet"}
                  </p>
                </div>
                <span
                  className={`text-[10px] uppercase tracking-wider rounded-full px-2 py-0.5 ${
                    s.matched_user_id
                      ? "bg-success/15 text-success"
                      : "bg-muted/40 text-muted-foreground"
                  }`}
                >
                  {s.matched_user_id ? "Matched" : "Unmatched"}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {tab === "transfer" && (
        <section className="rounded-2xl border border-border bg-card/70 p-5 space-y-4">
          <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
            <select
              value={transferMintId}
              onChange={(e) => setTransferMintId(e.target.value)}
              className="rounded-lg bg-input/50 border border-border px-3 py-2 text-sm"
            >
              <option value="">— pick a mint —</option>
              {mints?.map((m) => (
                <option key={m.id} value={m.id}>
                  {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                  #{m.token_id} · {(m as any).quest?.title} · {m.owner_address?.slice(0, 8)}…
                </option>
              ))}
            </select>
            <input
              value={transferTo}
              onChange={(e) => setTransferTo(e.target.value)}
              placeholder="Destination 0x address"
              className="rounded-lg bg-input/50 border border-border px-3 py-2 text-sm font-mono"
            />
            <button
              onClick={() => transferMutation.mutate()}
              disabled={transferMutation.isPending || !transferMintId || !transferTo}
              className="rounded-lg bg-gradient-to-r from-primary to-accent px-5 py-2 text-sm font-semibold text-white disabled:opacity-40 flex items-center gap-2"
            >
              <ArrowRightLeft className="h-4 w-4" />
              {transferMutation.isPending ? "Sending…" : "Transfer"}
            </button>
          </div>

          <div className="rounded-xl border border-border overflow-hidden">
            <div className="px-4 py-2 bg-muted/30 text-xs uppercase tracking-wider text-muted-foreground">
              Recent mints
            </div>
            <div className="divide-y divide-border max-h-[50vh] overflow-auto">
              {mints?.map((m) => (
                <div key={m.id} className="px-4 py-2.5 flex items-center gap-3 text-sm">
                  <span className="font-mono text-xs text-muted-foreground">#{m.token_id}</span>
                  {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                  <span className="flex-1 truncate">{(m as any).quest?.title ?? "—"}</span>
                  <span className="text-xs text-muted-foreground font-mono truncate max-w-[180px]">
                    {m.owner_address ?? "?"}
                  </span>
                  <a
                    href={txUrl(m.tx_hash)}
                    target="_blank"
                    rel="noreferrer"
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
