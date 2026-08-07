import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Trophy, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { BadgeCard } from "@/components/BadgeCard";
import NFTGallery from "@/components/NFTGallery";

export function DashboardContent() {
  const { data, isLoading } = useQuery({
    queryKey: ["public-dashboard"],
    queryFn: async () => {
      const [questsRes, mintsRes] = await Promise.all([
        supabase.from("quests").select("*").eq("active", true).order("week").order("points"),
        supabase.from("nft_mints").select("quest_id").order("minted_at", { ascending: false }),
      ]);

      const quests = questsRes.data ?? [];
      const mints = mintsRes.data ?? [];
      const mintedByQuest = new Map<number, number>();

      mints.forEach((mint: any) => {
        if (typeof mint.quest_id === "number") {
          mintedByQuest.set(mint.quest_id, (mintedByQuest.get(mint.quest_id) ?? 0) + 1);
        }
      });

      return {
        quests,
        mints,
        mintedByQuest,
      };
    },
  });

  if (isLoading || !data) return <div className="p-8 text-center text-muted-foreground">Loading…</div>;

  const totalMinted = data.mints.length;
  const registeredCount = data.quests.length;

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 space-y-8">
      <div>
        <p className="text-sm text-muted-foreground">Public view</p>
        <h1 className="text-3xl font-bold">MiniHack trophy room 👁️</h1>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <ProgressCard
          icon={<Trophy />}
          label="Registered badges"
          value={registeredCount.toString()}
          pct={100}
        />
        <ProgressCard
          icon={<Sparkles />}
          label="Badges minted"
          value={totalMinted.toString()}
          pct={registeredCount ? Math.min(100, Math.round((totalMinted / registeredCount) * 100)) : 0}
        />
      </div>

      <section className="space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Trophy room
            </h2>
            <p className="text-sm text-muted-foreground">
              Every registered quest badge in the MiniHack collection. Earned trophies glow while locked ones stay dim.
            </p>
          </div>
          <div className="rounded-full border border-border px-3 py-1 text-sm text-muted-foreground">
            Registered {data.quests.length}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.quests.map((quest: any) => {
            const mintedCount = data.mintedByQuest.get(quest.id) ?? 0;
            const earned = mintedCount > 0;

            return (
              <div key={quest.id} className="relative">
                <BadgeCard
                  title={quest.title}
                  subtitle={quest.description ?? "Quest badge"}
                  icon={quest.icon ?? "sparkles"}
                  imageUrl={quest.cover_image_url}
                  earned={earned}
                  claimState={earned ? "claimed" : "locked"}
                />
                {mintedCount > 0 && (
                  <div className="absolute left-3 top-3 rounded-full bg-primary/15 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-primary">
                    Minted {mintedCount}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-6 rounded-2xl border border-border/60 bg-card/40 p-4">
          <h3 className="mb-3 text-sm font-medium">On-chain view</h3>
          <React.Suspense fallback={<div className="text-muted-foreground">Loading gallery…</div>}>
            <NFTGallery />
          </React.Suspense>
        </div>
      </section>
    </div>
  );
}

function ProgressCard({ icon, label, value, pct }: { icon: React.ReactNode; label: string; value: string; pct: number }) {
  return (
    <div className="rounded-2xl border border-border bg-card/70 p-5">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground flex items-center gap-2">{icon} {label}</span>
        <span className="text-xs text-muted-foreground">{pct}%</span>
      </div>
      <div className="mt-3 text-3xl font-bold font-display">{value}</div>
      <div className="mt-3 h-2 rounded-full bg-muted overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-primary to-accent"
          style={{ width: `${Math.min(100, pct)}%` }}
        />
      </div>
    </div>
  );
}
