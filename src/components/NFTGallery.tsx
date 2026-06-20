import React, { useEffect, useState } from "react";
import { fetchAllNFTs } from "@/integrations/thirdweb/nftService";
import { BadgeCard } from "@/components/BadgeCard";

const CONTRACT_ADDRESS = (import.meta.env?.VITE_CONTRACT_ADDRESS as string) || process.env.REACT_APP_CONTRACT_ADDRESS || "";

export default function NFTGallery({ contractAddress, owner }: { contractAddress?: string; owner?: string }) {
  const [nfts, setNfts] = useState<any[] | null>(null);
  const addr = contractAddress ?? CONTRACT_ADDRESS;

  useEffect(() => {
  if (!addr) return;
  let mounted = true;
  fetchAllNFTs(addr, owner).then((res) => {
      if (mounted) setNfts(res || []);
    });
    return () => {
      mounted = false;
    };
  }, [addr]);

  if (!addr) return <div className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">Contract not configured</div>;
  if (nfts === null) return <div className="p-6 text-center text-muted-foreground">Loading NFTs…</div>;
  if (nfts.length === 0) return <div className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">No NFTs found</div>;

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {nfts.map((n: any, i: number) => {
        const meta = n?.metadata ?? n;
        const id = meta?.id ?? meta?.id?.toString?.() ?? i;
        return (
          <BadgeCard
            key={id}
            title={meta?.name ?? `Token ${id}`}
            subtitle={meta?.description ?? undefined}
            icon={meta?.icon ?? "sparkles"}
            earned
          />
        );
      })}
    </div>
  );
}
