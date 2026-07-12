import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState, useMemo } from "react";
import {
  Sparkles, Rocket, Wrench, Gamepad2, Brain, Trophy, Wallet, Cpu, Lock, Loader2, CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/useSession";
import { claimBadge } from "@/lib/claim.functions";
import { resolveArtworkUrl } from "@/components/BadgeCard";

// Duplicate route file preserved for reference. The authenticated route is defined
// in src/routes/_authenticated/quests.tsx and provides the actual /quests path.
const Route = createFileRoute("/quests")({
  head: () => ({ meta: [{ title: "Quests · MiniHack Heroes" }] }),
  component: QuestsPage,
});

type TrackKey = "All" | "Payments" | "Gaming" | "Agentic AI";

const TRACK_META: Record<
  Exclude<TrackKey, "All">,
  { tint: string; chip: string; icon: React.ComponentType<{ className?: string }> }
> = {
  Payments: { tint: "bg-orange-500/15 text-orange-400", chip: "bg-orange-500/10 text-orange-300", icon: Wallet },
  Gaming: { tint: "bg-lime-500/15 text-lime-400", chip: "bg-lime-500/10 text-lime-300", icon: Gamepad2 },
  "Agentic AI": { tint: "bg-blue-500/15 text-blue-400", chip: "bg-blue-500/10 text-blue-300", icon: Brain },
};

function trackOf(s: string | null | undefined): Exclude<TrackKey, "All"> {
  if (s === "Gaming" || s === "Agentic AI" || s === "Payments") return s;
  return "Payments";
}

function iconFor(name: string | null | undefined) {
  switch (name) {
    case "trophy": return Trophy;
    case "rocket": return Rocket;
    case "wrench": return Wrench;
    case "cpu": return Cpu;
    case "brain": return Brain;
    case "wallet": return Wallet;
    case "gamepad": return Gamepad2;
    default: return Sparkles;
  }
}

function QuestsPage() {
  const [filter, setFilter] = useState<TrackKey>("All");
  const { user } = useSession();
  const qc = useQueryClient();
  const callClaim = useServerFn(claimBadge);

  const { data, isLoading } = useQuery({
    queryKey: ["quests-page", user?.id],
    queryFn: async () => {
      const [questsRes, signupsRes, statsRes, completionsRes, mintsRes] = await Promise.all([
        supabase.from("quests").select("*").eq("active", true).order("week").order("points"),
        supabase.rpc("get_quest_signups"),
        supabase.rpc("get_public_stats"),
        user
          ? supabase.from("quest_completions").select("quest_id").eq("user_id", user.id)
          : Promise.resolve({ data: [] as { quest_id: string }[] }),
        user
          ? supabase.from("nft_mints").select("quest_id, tx_hash, token_id").eq("user_id", user.id)
          : Promise.resolve({ data: [] as { quest_id: string | null; tx_hash: string; token_id: number | null }[] }),
      ]);
      const stats = (statsRes.data ?? {}) as {
        participants?: number; completions?: number; quests?: number;
      };
      const signups = new Map<string, number>(
        (signupsRes.data ?? []).map((r: { quest_id: string; signups: number }) => [r.quest_id, Number(r.signups)]),
      );
      const completedQuestIds = new Set((completionsRes.data ?? []).map((c) => c.quest_id));
      const mintedByQuestId = new Map(
        (mintsRes.data ?? [])
          .filter((m) => m.quest_id)
          .map((m) => [m.quest_id as string, { txHash: m.tx_hash, tokenId: m.token_id }]),
      );
      return {
        quests: questsRes.data ?? [],
        signups,
        completedQuestIds,
        mintedByQuestId,
        stats: {
          participants: stats.participants ?? 0,
          completions: stats.completions ?? 0,
          quests: stats.quests ?? 0,
        },
      };
    },
  });

  const claimMutation = useMutation({
    mutationFn: (questId: string) => callClaim({ data: { questId } }),
    onSuccess: (res, questId) => {
      if (res.alreadyClaimed) {
        toast.info("Already claimed", { description: "This badge was already minted to your wallet." });
      } else {
        toast.success("Badge claimed!", { description: `Token #${res.tokenId} minted to your wallet.` });
      }
      qc.invalidateQueries({ queryKey: ["quests-page"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Claim failed"),
  });

  const filtered = useMemo(() => {
    if (!data) return [];
    if (filter === "All") return data.quests;
    return data.quests.filter((q) => trackOf(q.track) === filter);
  }, [data, filter]);

  if (isLoading || !data) {
    return <div className="p-8 text-center text-muted-foreground">Loading quests…</div>;
  }

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
            Complete a quest, claim your badge, climb the board.
          </p>
        </div>
        <TabSwitcher current="quests" />
      </header>

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <Stat label="Quests" value={data.stats.quests} color="text-foreground" />
        <Stat label="Total quest completions" value={data.stats.completions} color="text-emerald-400" />
        <Stat label="Participants" value={data.stats.participants} color="text-primary" />
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        {(["All", "Payments", "Gaming", "Agentic AI"] as TrackKey[]).map((t) => (
          <button
            key={t}
            onClick={() => setFilter(t)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium border transition ${
              filter === t
                ? "bg-primary text-primary-foreground border-primary"
                : "border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((q) => (
          <QuestCard
            key={q.id}
            quest={q}
            signups={data.signups.get(q.id) ?? 0}
            completed={data.completedQuestIds.has(q.id)}
            minted={data.mintedByQuestId.get(q.id) ?? null}
            claiming={claimMutation.isPending && claimMutation.variables === q.id}
            onClaim={() => claimMutation.mutate(q.id)}
          />
        ))}
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

function TabSwitcher({ current }: { current: "quests" | "leaderboard" }) {
  return (
    <div className="inline-flex rounded-full border border-border bg-card/60 p-1">
      <a
        href="/quests"
        className={`px-4 py-1.5 rounded-full text-sm font-medium ${
          current === "quests" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
        }`}
      >
        Quests
      </a>
      <a
        href="/leaderboard"
        className={`px-4 py-1.5 rounded-full text-sm font-medium ${
          current === "leaderboard" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
        }`}
      >
        Leaderboard
      </a>
    </div>
  );
}

type QuestRow = {
  id: string;
  title: string;
  description: string | null;
  points: number;
  icon: string | null;
  track: string | null;
  week: number | null;
  tally_form_url: string | null;
  locked: boolean | null;
  unlock_cohort: number | null;
  cover_image_url: string | null;
};

function QuestCard({
  quest,
  signups,
  completed,
  minted,
  claiming,
  onClaim,
}: {
  quest: QuestRow;
  signups: number;
  completed: boolean;
  minted: { txHash: string; tokenId: number | null } | null;
  claiming: boolean;
  onClaim: () => void;
}) {
  const track = trackOf(quest.track);
  const meta = TRACK_META[track];
  const Icon = iconFor(quest.icon);
  const locked = !!quest.locked;
  const artwork = resolveArtworkUrl(quest.cover_image_url);

  return (
    <div
      className={`relative rounded-2xl border bg-card/60 overflow-hidden flex flex-col ${
        locked ? "border-dashed border-border/60" : "border-border"
      }`}
    >
      {artwork ? (
        <div className="aspect-square w-full overflow-hidden bg-muted">
          <img
            src={artwork}
            alt={quest.title}
            loading="lazy"
            className={`h-full w-full object-cover ${locked ? "grayscale opacity-50" : ""}`}
          />
        </div>
      ) : null}

      <div className="p-5 flex flex-col gap-4 flex-1">
        <div className="flex items-start justify-between gap-2">
          <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider ${meta.chip}`}>
            {track} · Week {quest.week ?? 1}
          </span>
          <span className="rounded-full bg-muted/60 px-2.5 py-1 text-[10px] font-semibold text-muted-foreground">
            {quest.points} pts
          </span>
        </div>

        {!artwork && (
          <div className={`grid place-items-center h-14 w-14 rounded-xl ${meta.tint}`}>
            <Icon className="h-7 w-7" />
          </div>
        )}

        <div>
          <h3 className="text-base font-semibold leading-snug">{quest.title}</h3>
          {quest.description && (
            <p className="mt-1.5 text-sm text-muted-foreground line-clamp-3">{quest.description}</p>
          )}
        </div>

        <div className="mt-auto">
          {locked ? (
            <div className="rounded-lg border border-dashed border-border/60 px-3 py-2 text-xs text-muted-foreground flex items-center gap-2">
              <Lock className="h-3.5 w-3.5" />
              Unlocks in Cohort {quest.unlock_cohort ?? "?"}
            </div>
          ) : minted ? (
            <div className="flex items-center justify-center gap-2 rounded-xl bg-success/10 text-success px-4 py-2.5 text-sm font-semibold">
              <CheckCircle2 className="h-4 w-4" /> Claimed
              {minted.tokenId != null && <span className="text-xs opacity-70">#{minted.tokenId}</span>}
            </div>
          ) : completed ? (
            <button
              onClick={onClaim}
              disabled={claiming}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-foreground text-background px-4 py-2.5 text-sm font-semibold hover:opacity-90 disabled:opacity-60 transition"
            >
              {claiming ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Minting…
                </>
              ) : (
                "Claim badge"
              )}
            </button>
          ) : (
            <>
              <p className="text-xs text-muted-foreground mb-2">
                <span className="font-semibold text-foreground">{signups}</span> signed up
              </p>
              <a
                href={quest.tally_form_url ?? "#"}
                target="_blank"
                rel="noopener noreferrer"
                className={`block w-full text-center rounded-xl bg-foreground text-background px-4 py-2.5 text-sm font-semibold ${
                  quest.tally_form_url ? "hover:opacity-90" : "opacity-40 pointer-events-none"
                }`}
              >
                {quest.tally_form_url ? "Submit quest" : "Coming soon"}
              </a>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
