import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/leaderboard")({
  head: () => ({ meta: [{ title: "Leaderboard · MiniHack Heroes" }] }),
  component: LeaderboardPage,
});

function relativeTime(iso: string | null | undefined) {
  if (!iso) return "—";
  const ms = Date.now() - new Date(iso).getTime();
  const m = Math.round(ms / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  return `${d}d ago`;
}

function trackColor(track: string | null | undefined) {
  if (track === "Gaming") return "bg-lime-400";
  if (track === "Agentic AI") return "bg-blue-400";
  return "bg-orange-400"; // Payments / default
}

function LeaderboardPage() {
  const [search, setSearch] = useState("");

  const { data } = useQuery({
    queryKey: ["leaderboard"],
    queryFn: async () => {
      const [boardRes, statsRes, completionsRes] = await Promise.all([
        supabase
          .from("leaderboard_view")
          .select("*")
          .order("total_points", { ascending: false })
          .limit(200),
        supabase.rpc("get_public_stats"),
        supabase
          .from("quest_completions")
          .select("user_id, quest:quests(track)")
          .limit(2000),
      ]);
      const stats = (statsRes.data ?? {}) as {
        participants?: number; completions?: number; quests?: number;
      };
      // Build per-user track pips from completions
      const pips = new Map<string, string[]>();
      for (const c of completionsRes.data ?? []) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const t = (c as any).quest?.track ?? "Payments";
        const arr = pips.get(c.user_id) ?? [];
        arr.push(t);
        pips.set(c.user_id, arr);
      }
      return {
        board: boardRes.data ?? [],
        stats: {
          participants: stats.participants ?? 0,
          completions: stats.completions ?? 0,
          quests: stats.quests ?? 0,
        },
        pips,
      };
    },
    refetchInterval: 20_000,
  });

  const filtered = useMemo(() => {
    const board = data?.board ?? [];
    if (!search.trim()) return board;
    const q = search.toLowerCase();
    return board.filter(
      (r) =>
        (r.display_name ?? "").toLowerCase().includes(q) ||
        (r.wallet_address ?? "").toLowerCase().includes(q),
    );
  }, [data, search]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
            Build · Ship · Earn
          </p>
          <h1 className="mt-2 text-3xl sm:text-4xl font-bold leading-tight max-w-2xl">
            See who&apos;s tackling quests and where the leaderboard stands.
          </h1>
          <p className="mt-3 text-muted-foreground max-w-2xl">
            Real-time submissions from Tally, aggregated across every Mini Hack quest.
            Complete a quest, climb the board.
          </p>
        </div>
        <div className="inline-flex rounded-full border border-border bg-card/60 p-1">
          <a href="/quests" className="px-4 py-1.5 rounded-full text-sm font-medium text-muted-foreground">
            Quests
          </a>
          <a href="/leaderboard" className="px-4 py-1.5 rounded-full text-sm font-medium bg-primary text-primary-foreground">
            Leaderboard
          </a>
        </div>
      </header>

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <Stat label="Quests" value={data?.stats.quests ?? 0} color="text-foreground" />
        <Stat label="Total quest completions" value={data?.stats.completions ?? 0} color="text-emerald-400" />
        <Stat label="Participants" value={data?.stats.participants ?? 0} color="text-primary" />
      </div>

      <div className="mt-6 relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or email…"
          className="w-full rounded-2xl border border-border bg-card/60 pl-10 pr-4 py-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:border-primary"
        />
      </div>

      <div className="mt-6 rounded-2xl border border-border bg-card/60 overflow-hidden">
        <div className="hidden sm:grid grid-cols-[60px_1fr_1.2fr_80px_110px] gap-3 px-5 py-3 text-[11px] uppercase tracking-wider text-muted-foreground border-b border-border">
          <span>Rank</span>
          <span>Builder</span>
          <span>Quests</span>
          <span className="text-right">Points</span>
          <span className="text-right">Last activity</span>
        </div>
        {filtered.length === 0 && (
          <div className="p-10 text-center text-muted-foreground">No Heroes yet.</div>
        )}
        {filtered.map((row, i) => {
          const tracks = data?.pips.get(row.user_id ?? "") ?? [];
          const rankTint =
            i === 0 ? "bg-amber-500/10" : i === 1 ? "bg-slate-400/10" : i === 2 ? "bg-orange-500/10" : "";
          return (
            <div
              key={row.user_id}
              className={`grid sm:grid-cols-[60px_1fr_1.2fr_80px_110px] gap-3 items-center px-5 py-3 border-b border-border last:border-0 ${rankTint}`}
            >
              <span className="text-xs font-semibold text-muted-foreground">#{i + 1}</span>
              <div className="flex items-center gap-3 min-w-0">
                {row.avatar_url ? (
                  <img src={row.avatar_url} alt="" className="h-8 w-8 rounded-full object-cover" />
                ) : (
                  <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary/40 to-accent/40 grid place-items-center text-xs font-semibold">
                    {(row.display_name ?? "?").charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{row.display_name ?? "Anonymous"}</p>
                  <p className="text-[11px] text-muted-foreground truncate">
                    {row.wallet_address ? `${row.wallet_address.slice(0, 6)}…${row.wallet_address.slice(-4)}` : "no wallet"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1 flex-wrap">
                {tracks.length === 0 ? (
                  <span className="text-xs text-muted-foreground">—</span>
                ) : (
                  tracks.map((t, idx) => (
                    <span key={idx} className={`h-2 w-2 rounded-full ${trackColor(t)}`} />
                  ))
                )}
                <span className="ml-1 text-xs text-muted-foreground">{tracks.length}</span>
              </div>
              <span className="text-sm sm:text-right font-bold text-primary">{row.total_points ?? 0}</span>
              <span className="text-xs text-muted-foreground sm:text-right">
                {relativeTime(row.last_activity)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card/60 p-5">
      <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={`mt-2 text-4xl font-bold font-display ${color}`}>{value.toLocaleString()}</p>
    </div>
  );
}
