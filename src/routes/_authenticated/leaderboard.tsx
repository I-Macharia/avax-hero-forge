import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Trophy, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { shortAddress } from "@/lib/contract/config";

export const Route = createFileRoute("/_authenticated/leaderboard")({
  head: () => ({ meta: [{ title: "Leaderboard · MiniHack Heroes" }] }),
  component: LeaderboardPage,
});

type Filter = "total" | "attendance" | "nfts";

function LeaderboardPage() {
  const [filter, setFilter] = useState<Filter>("total");

  const { data } = useQuery({
    queryKey: ["leaderboard"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leaderboard_view")
        .select("*")
        .order("total_points", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data ?? [];
    },
    refetchInterval: 20_000,
  });

  const sorted = (data ?? []).slice().sort((a, b) => {
    if (filter === "attendance") return (b.attendance_points ?? 0) - (a.attendance_points ?? 0);
    if (filter === "nfts") return (b.nft_count ?? 0) - (a.nft_count ?? 0);
    return (b.total_points ?? 0) - (a.total_points ?? 0);
  });

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="text-3xl font-bold flex items-center gap-2">
        <Trophy className="h-7 w-7 text-primary" /> Leaderboard
      </h1>
      <p className="mt-2 text-muted-foreground">Top Heroes of the cohort.</p>

      <div className="mt-6 flex gap-2">
        {[
          { k: "total" as const, l: "All-time points" },
          { k: "attendance" as const, l: "Attendance" },
          { k: "nfts" as const, l: "NFTs" },
        ].map((b) => (
          <button
            key={b.k}
            onClick={() => setFilter(b.k)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium border ${
              filter === b.k
                ? "bg-primary text-primary-foreground border-primary"
                : "border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            {b.l}
          </button>
        ))}
      </div>

      <div className="mt-6 rounded-2xl border border-border bg-card/60 overflow-hidden">
        {sorted.length === 0 && (
          <div className="p-10 text-center text-muted-foreground">No Heroes yet — be the first!</div>
        )}
        {sorted.map((row, i) => (
          <div
            key={row.user_id}
            className={`flex items-center gap-4 px-5 py-3 border-b border-border last:border-0 ${
              i < 3 ? "bg-gradient-to-r from-primary/5 to-transparent" : ""
            }`}
          >
            <div
              className={`grid place-items-center h-9 w-9 rounded-full font-bold font-display text-sm ${
                i === 0
                  ? "bg-gradient-to-br from-primary to-accent text-white glow-ring"
                  : i < 3
                    ? "bg-muted text-foreground"
                    : "bg-muted/60 text-muted-foreground"
              }`}
            >
              {i + 1}
            </div>
            {row.avatar_url ? (
              <img src={row.avatar_url} alt="" className="h-10 w-10 rounded-full object-cover" />
            ) : (
              <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary/40 to-accent/40 grid place-items-center text-sm font-semibold">
                {(row.display_name ?? "?").charAt(0).toUpperCase()}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="font-semibold truncate">{row.display_name ?? "Anonymous Hero"}</p>
              <p className="text-xs text-muted-foreground truncate">
                {row.wallet_address ? shortAddress(row.wallet_address) : "—"}
              </p>
            </div>
            <div className="text-right">
              <div className="font-bold font-display gradient-text">
                {filter === "attendance"
                  ? row.attendance_points
                  : filter === "nfts"
                    ? row.nft_count
                    : row.total_points}
              </div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground flex items-center gap-1 justify-end">
                <Sparkles className="h-3 w-3" /> {row.nft_count ?? 0} NFTs
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
