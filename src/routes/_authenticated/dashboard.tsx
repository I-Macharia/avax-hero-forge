import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Trophy, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { BadgeCard } from "@/components/BadgeCard";
import NFTGallery from "@/components/NFTGallery";
import { publicClient } from "@/lib/contract/client";
import { miniHackAbi } from "@/lib/contract/abi";
import { CONTRACT_ADDRESS } from "@/lib/contract/config";

type BadgePreview = {
  registered: boolean;
  name: string | null;
  description: string | null;
  imageUrl: string | null;
  soulbound: boolean | null;
};

async function fetchBadgeMetadata(uri?: string | null) {
  if (!uri) return null;
  try {
    const url = uri.startsWith("ipfs://") ? `https://ipfs.io/ipfs/${uri.slice("ipfs://".length)}` : uri;
    const response = await fetch(url);
    if (!response.ok) return null;
    const payload = await response.json();
    return {
      name: typeof payload?.name === "string" ? payload.name : null,
      description: typeof payload?.description === "string" ? payload.description : null,
      image: typeof payload?.image === "string" ? payload.image : null,
    } as { name: string | null; description: string | null; image: string | null };
  } catch {
    return null;
  }
}

async function resolveBadgePreview(quest: any): Promise<BadgePreview> {
  if (!CONTRACT_ADDRESS || CONTRACT_ADDRESS === "0x0000000000000000000000000000000000000000") {
    return {
      registered: false,
      name: "Badge registration pending",
      description: "The contract is not deployed yet, so the badge preview is unavailable.",
      imageUrl: quest.cover_image_url ?? null,
      soulbound: null,
    };
  }

  if (typeof quest.badge_token_id !== "number") {
    return {
      registered: false,
      name: "Badge registration pending",
      description: "This quest is live, but no on-chain badge has been configured yet.",
      imageUrl: quest.cover_image_url ?? null,
      soulbound: null,
    };
  }

  try {
    const registered = await publicClient.readContract({
      address: CONTRACT_ADDRESS as `0x${string}`,
      abi: miniHackAbi,
      functionName: "isBadgeRegistered",
      args: [BigInt(quest.badge_token_id)],
    });

    if (!registered) {
      return {
        registered: false,
        name: "Badge registration pending",
        description: "This badge has not been registered on-chain yet, so the reward preview is still being prepared.",
        imageUrl: quest.cover_image_url ?? null,
        soulbound: null,
      };
    }

    const [uri, isSoulbound] = (await publicClient.readContract({
      address: CONTRACT_ADDRESS as `0x${string}`,
      abi: miniHackAbi,
      functionName: "getBadgeConfig",
      args: [BigInt(quest.badge_token_id)],
    })) as [string, boolean];

    const metadata = await fetchBadgeMetadata(uri);
    return {
      registered: true,
      name: metadata?.name ?? `Badge #${quest.badge_token_id}`,
      description: metadata?.description ?? "Registered on-chain reward for this quest.",
      imageUrl: metadata?.image ?? quest.cover_image_url ?? null,
      soulbound: isSoulbound,
    };
  } catch {
    return {
      registered: false,
      name: "Badge registration pending",
      description: "The badge registry could not be read right now, so the preview is unavailable.",
      imageUrl: quest.cover_image_url ?? null,
      soulbound: null,
    };
  }
}

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
      const badgePreviews = await Promise.all(quests.map((quest: any) => resolveBadgePreview(quest)));

      mints.forEach((mint: any) => {
        if (typeof mint.quest_id === "number") {
          mintedByQuest.set(mint.quest_id, (mintedByQuest.get(mint.quest_id) ?? 0) + 1);
        }
      });

      return {
        quests,
        mints,
        mintedByQuest,
        badgePreviews,
      };
    },
  });

  if (isLoading || !data) return <div className="p-8 text-center text-muted-foreground">Loading…</div>;

  const totalMinted = data.mints.length;
  const registeredCount = data.badgePreviews.filter((preview: BadgePreview) => preview.registered).length;

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
            Registered {registeredCount}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.quests.map((quest: any, index: number) => {
            const mintedCount = data.mintedByQuest.get(quest.id) ?? 0;
            const earned = mintedCount > 0;
            const preview = data.badgePreviews[index] ?? {
              registered: false,
              name: "Badge registration pending",
              description: "The reward preview is still being prepared.",
              imageUrl: quest.cover_image_url ?? null,
              soulbound: null,
            };

            return (
              <div key={quest.id} className="relative">
                <BadgeCard
                  title={quest.title}
                  subtitle={quest.description ?? "Quest badge"}
                  icon={quest.icon ?? "sparkles"}
                  imageUrl={preview.imageUrl ?? quest.cover_image_url}
                  earned={earned}
                  claimState={earned ? "claimed" : "locked"}
                  rewardName={preview.name}
                  rewardDescription={preview.description}
                  rewardStatus={preview.registered ? "registered" : "pending"}
                  rewardType={preview.soulbound === true ? "soulbound" : preview.soulbound === false ? "transferable" : null}
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
