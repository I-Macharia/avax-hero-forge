import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { BadgeCard } from "@/components/BadgeCard";

type Props = {
  /** Optional wallet address filter (owner of the badge). */
  owner?: string;
  /** Optional contract address filter — matches nft_mints.contract_address. */
  contractAddress?: string;
};

/**
 * Reads minted badges straight from the app database (`nft_mints`) so we never
 * depend on a third-party chain-indexing SDK in the client bundle.
 */
export default function NFTGallery({ owner, contractAddress }: Props) {
  const { data: nfts, isLoading } = useQuery({
    queryKey: ["nft-mints", owner ?? "all", contractAddress ?? "all"],
    queryFn: async () => {
      let q = supabase
        .from("nft_mints")
        .select("id, token_id, metadata_uri, contract_address, owner_address, quest_id, quests(title, description)")
        .order("id", { ascending: false });
      if (owner) q = q.eq("owner_address", owner);
      if (contractAddress) q = q.eq("contract_address", contractAddress);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });

  if (isLoading) {
    return <div className="p-6 text-center text-muted-foreground">Loading badges…</div>;
  }
  if (!nfts || nfts.length === 0) {
    return (
      <div className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
        No badges minted yet
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {nfts.map((n) => {
        const quest = Array.isArray(n.quests) ? n.quests[0] : n.quests;
        return (
          <BadgeCard
            key={n.id}
            title={quest?.title ?? `Badge #${n.token_id ?? n.id}`}
            subtitle={quest?.description ?? undefined}
            icon="sparkles"
            earned
          />
        );
      })}
    </div>
  );
}
