import React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Wallet, Copy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/useSession";
import { useRoles } from "@/hooks/useRoles";
import { getWalletClient, getInjectedProvider } from "@/lib/contract/client";
import { shortAddress, txUrl, CONTRACT_ADDRESS } from "@/lib/contract/config";
import NFTGallery from "@/components/NFTGallery";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({ meta: [{ title: "Profile · MiniHack Heroes" }] }),
  component: ProfilePage,
});

function ProfilePage() {
  const { user } = useSession();
  const { data: roles } = useRoles();
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");

  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*").eq("id", user!.id).single();
      return data;
    },
  });

  useEffect(() => {
    if (profile) {
      setName(profile.display_name ?? "");
      setBio(profile.bio ?? "");
    }
  }, [profile]);

  const { data: mints } = useQuery({
    queryKey: ["my-mints", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("nft_mints")
        .select("*, quests(title, icon)")
        .eq("user_id", user!.id)
        .order("minted_at", { ascending: false });
      return data ?? [];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("profiles")
        .update({ display_name: name, bio })
        .eq("id", user!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Profile saved");
      qc.invalidateQueries({ queryKey: ["profile"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Save failed"),
  });

  async function connectWallet() {
    try {
      const { account } = await getWalletClient();
      const { error } = await supabase
        .from("profiles")
        .update({ wallet_address: account })
        .eq("id", user!.id);
      if (error) throw error;
      toast.success("Wallet linked");
      qc.invalidateQueries({ queryKey: ["profile"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Connect failed");
    }
  }

  if (!user || !profile) return <div className="p-8 text-center text-muted-foreground">Loading…</div>;

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 space-y-8">
      <div className="flex items-center gap-4">
        <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-primary to-accent grid place-items-center text-3xl font-bold text-white glow-ring">
          {(profile.display_name ?? "?").charAt(0).toUpperCase()}
        </div>
        <div>
          <h1 className="text-2xl font-bold">{profile.display_name}</h1>
          <p className="text-sm text-muted-foreground">{user.email}</p>
          <div className="mt-1 flex gap-1">
            {(roles ?? []).map((r) => (
              <span key={r} className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-accent/20 text-accent">
                {r}
              </span>
            ))}
          </div>
        </div>
      </div>

      <section className="rounded-2xl border border-border bg-card/70 p-6 space-y-4">
        <h2 className="font-semibold flex items-center gap-2"><Wallet className="h-4 w-4" /> Wallet</h2>
        {profile.wallet_address ? (
          <div className="flex items-center justify-between rounded-lg border border-border bg-background/40 px-3 py-2">
            <code className="text-sm">{shortAddress(profile.wallet_address)}</code>
            <button
              onClick={() => {
                navigator.clipboard.writeText(profile.wallet_address!);
                toast.success("Copied");
              }}
              className="text-muted-foreground hover:text-foreground"
            >
              <Copy className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No wallet linked yet.</p>
        )}
        <button
          onClick={connectWallet}
          disabled={!getInjectedProvider()}
          className="rounded-lg border border-border px-4 py-2 text-sm font-medium hover:border-primary/60 disabled:opacity-50"
        >
          {profile.wallet_address ? "Re-link wallet" : "Connect wallet"}
        </button>
        {!getInjectedProvider() && (
          <p className="text-xs text-muted-foreground">
            Install Core or MetaMask to link your wallet. Embedded-wallet support coming soon.
          </p>
        )}
      </section>

      <section className="rounded-2xl border border-border bg-card/70 p-6 space-y-3">
        <h2 className="font-semibold">Profile</h2>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Display name"
          className="w-full rounded-lg bg-input/50 border border-border px-3 py-2"
        />
        <textarea
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          placeholder="Short bio…"
          rows={3}
          className="w-full rounded-lg bg-input/50 border border-border px-3 py-2"
        />
        <button
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending}
          className="rounded-lg bg-gradient-to-r from-primary to-accent px-4 py-2 text-sm font-semibold text-white glow-ring"
        >
          {saveMutation.isPending ? "Saving…" : "Save"}
        </button>
      </section>

      <section>
        <h2 className="font-semibold mb-3">NFT collection ({mints?.length ?? 0})</h2>
        {!mints || mints.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            No badges yet. Head to Quests to earn your first.
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {mints.map((m) => (
              <a
                key={m.id}
                href={txUrl(m.tx_hash)}
                target="_blank"
                rel="noreferrer"
                className="rounded-xl border border-border bg-card/60 p-4 hover:border-primary/60"
              >
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                <p className="font-semibold">{(m as any).quests?.title ?? `Badge #${m.token_id}`}</p>
                <p className="text-xs text-muted-foreground mt-1">Token #{m.token_id ?? "?"}</p>
                <p className="text-xs text-muted-foreground">{shortAddress(m.contract_address)}</p>
              </a>
            ))}
          </div>
        )}
        {/* Localized on-chain gallery: prefer wallet address if linked, otherwise show global contract */}
        <div className="mt-4">
          <h3 className="text-sm font-medium mb-2">On-chain assets</h3>
          <React.Suspense fallback={<div className="text-muted-foreground">Loading on-chain assets…</div>}>
            {/* Show on-chain assets owned by the user if wallet linked, otherwise show global contract assets */}
            <NFTGallery contractAddress={CONTRACT_ADDRESS} owner={profile.wallet_address ?? undefined} />
          </React.Suspense>
        </div>
        {CONTRACT_ADDRESS === "0x0000000000000000000000000000000000000000" && (
          <p className="mt-3 text-xs text-muted-foreground">
            Contract not deployed yet. See <code>contracts/README.md</code>.
          </p>
        )}
      </section>
    </div>
  );
}
