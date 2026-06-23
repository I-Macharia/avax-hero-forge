import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import confetti from "canvas-confetti";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/useSession";
import { BadgeCard } from "@/components/BadgeCard";
import { getWalletClient, publicClient } from "@/lib/contract/client";
import { miniHackAbi } from "@/lib/contract/abi";
import { CONTRACT_ADDRESS, txUrl } from "@/lib/contract/config";
import { recordVerifiedMint } from "@/lib/mints.functions";

export const Route = createFileRoute("/_authenticated/quests")({
  head: () => ({ meta: [{ title: "Quests · MiniHack Heroes" }] }),
  component: QuestsPage,
});

function QuestsPage() {
  const { user } = useSession();
  const qc = useQueryClient();
  const submitVerifiedMint = useServerFn(recordVerifiedMint);

  const { data, isLoading } = useQuery({
    queryKey: ["quests", user?.id],
    queryFn: async () => {
      const [quests, completions, mints] = await Promise.all([
        supabase.from("quests").select("*").eq("active", true).order("points"),
        user
          ? supabase.from("quest_completions").select("*").eq("user_id", user.id)
          : Promise.resolve({ data: [] }),
        user
          ? supabase.from("nft_mints").select("quest_id").eq("user_id", user.id)
          : Promise.resolve({ data: [] }),
      ]);
      return {
        quests: quests.data ?? [],
        completions: completions.data ?? [],
        mintedQuestIds: new Set((mints.data ?? []).map((m) => m.quest_id)),
      };
    },
  });

  const mintMutation = useMutation({
    mutationFn: async (quest: { id: string; badge_token_id: number | null; metadata_uri: string | null }) => {
      if (!user) throw new Error("Sign in first");
      if (CONTRACT_ADDRESS === "0x0000000000000000000000000000000000000000") {
        throw new Error("Contract not deployed yet — set VITE_CONTRACT_ADDRESS.");
      }
      const { account, client } = await getWalletClient();
      const badgeId = BigInt(quest.badge_token_id ?? 0);
      const uri = quest.metadata_uri ?? `ipfs://placeholder/${quest.id}.json`;

      const { request } = await publicClient.simulateContract({
        account,
        address: CONTRACT_ADDRESS,
        abi: miniHackAbi,
        functionName: "mintTo",
        args: [account, badgeId, uri],
      });
      const hash = await client.writeContract(request);
      toast.message("Tx submitted", { description: hash, action: { label: "View", onClick: () => window.open(txUrl(hash)) } });

      await publicClient.waitForTransactionReceipt({ hash });
      // Server verifies the on-chain tx and records the mint via service role.
      await submitVerifiedMint({ data: { questId: quest.id, txHash: hash } });
      return { hash };
    },
    onSuccess: ({ hash }) => {
      confetti({ particleCount: 160, spread: 80, origin: { y: 0.6 } });
      toast.success("Badge minted!", {
        description: "On-chain forever.",
        action: { label: "Snowtrace", onClick: () => window.open(txUrl(hash)) },
      });
      qc.invalidateQueries({ queryKey: ["quests"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      qc.invalidateQueries({ queryKey: ["live-stats"] });
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Mint failed"),
  });

  if (isLoading || !data) return <div className="p-8 text-center text-muted-foreground">Loading quests…</div>;

  const completedIds = new Set(data.completions.map((c) => c.quest_id));

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <h1 className="text-3xl font-bold">Quests &amp; Achievements</h1>
      <p className="mt-2 text-muted-foreground">
        Complete a quest to unlock its badge. Mint to claim it on-chain forever.
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {data.quests.map((q) => {
          const completed = completedIds.has(q.id);
          const minted = data.mintedQuestIds.has(q.id);
          return (
            <div key={q.id} className="space-y-3">
              <BadgeCard
                title={q.title}
                subtitle={q.description ?? undefined}
                icon={q.icon ?? "sparkles"}
                earned={completed}
                progress={completed ? 100 : 0}
              />
              <div className="flex items-center justify-between gap-2 px-1">
                <span className="text-xs text-muted-foreground">{q.points} pts</span>
                {minted ? (
                  <span className="text-xs font-medium text-success">✓ Minted</span>
                ) : completed ? (
                  <button
                    onClick={() => mintMutation.mutate(q)}
                    disabled={mintMutation.isPending}
                    className="rounded-lg bg-gradient-to-r from-primary to-accent px-3 py-1.5 text-xs font-semibold text-white glow-ring disabled:opacity-50"
                  >
                    {mintMutation.isPending ? "Minting…" : "Mint badge"}
                  </button>
                ) : (
                  <span className="text-xs text-muted-foreground">Locked</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
