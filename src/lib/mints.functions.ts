import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createPublicClient, http, parseEventLogs, getAddress, isAddress, type Hex } from "viem";
import { defineChain } from "viem";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { miniHackAbi } from "@/lib/contract/abi";

const inputSchema = z.object({
  questId: z.string().uuid(),
  txHash: z.string().regex(/^0x[0-9a-fA-F]{64}$/),
});

export const recordVerifiedMint = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => inputSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { questId, txHash } = data;
    const { supabase, userId } = context;

    const contractAddress = process.env.VITE_CONTRACT_ADDRESS ?? process.env.CONTRACT_ADDRESS;
    const rpcUrl =
      process.env.VITE_AVALANCHE_RPC_URL ??
      process.env.AVALANCHE_RPC_URL ??
      "https://api.avax-test.network/ext/bc/C/rpc";
    const chainId = Number(process.env.VITE_AVALANCHE_CHAIN_ID ?? 43113);

    if (!contractAddress || !isAddress(contractAddress) || contractAddress === "0x0000000000000000000000000000000000000000") {
      throw new Error("Contract not configured");
    }
    const contract = getAddress(contractAddress);

    // Confirm the user actually completed this quest (RLS scopes to own user)
    const { data: completion, error: ccErr } = await supabase
      .from("quest_completions")
      .select("id")
      .eq("user_id", userId)
      .eq("quest_id", questId)
      .maybeSingle();
    if (ccErr) throw new Error("Failed to verify quest completion");
    if (!completion) throw new Error("Quest not completed");

    // Reject duplicate mints
    const { data: existing } = await supabase
      .from("nft_mints")
      .select("id")
      .eq("user_id", userId)
      .eq("quest_id", questId)
      .maybeSingle();
    if (existing) throw new Error("Already minted");

    // Load quest + user's wallet address for on-chain verification
    const { data: quest } = await supabase
      .from("quests")
      .select("id, badge_token_id, metadata_uri")
      .eq("id", questId)
      .maybeSingle();
    if (!quest) throw new Error("Quest not found");

    const { data: profile } = await supabase
      .from("profiles")
      .select("wallet_address")
      .eq("id", userId)
      .maybeSingle();
    if (!profile?.wallet_address || !isAddress(profile.wallet_address)) {
      throw new Error("Wallet address not linked to profile");
    }
    const userWallet = getAddress(profile.wallet_address);

    // Verify the on-chain transaction
    const chain = defineChain({
      id: chainId,
      name: "Avalanche Fuji",
      nativeCurrency: { name: "AVAX", symbol: "AVAX", decimals: 18 },
      rpcUrls: { default: { http: [rpcUrl] } },
    });
    const publicClient = createPublicClient({ chain, transport: http(rpcUrl) });

    let receipt;
    try {
      receipt = await publicClient.getTransactionReceipt({ hash: txHash as Hex });
    } catch {
      throw new Error("Transaction not found on-chain");
    }
    if (receipt.status !== "success") throw new Error("Transaction reverted");
    if (!receipt.to || getAddress(receipt.to) !== contract) {
      throw new Error("Transaction target does not match badge contract");
    }

    const logs = parseEventLogs({ abi: miniHackAbi, eventName: "BadgeMinted", logs: receipt.logs });
    const match = logs.find((l) => {
      const args = l.args as { to?: string; badgeId?: bigint; tokenId?: bigint };
      if (!args.to || getAddress(args.to) !== userWallet) return false;
      if (quest.badge_token_id != null && args.badgeId !== BigInt(quest.badge_token_id)) return false;
      return true;
    });
    if (!match) throw new Error("Mint event not found in transaction");
    const tokenId = Number((match.args as { tokenId?: bigint }).tokenId ?? 0);

    // Insert via service role through verified RPC (re-checks quest completion in DB)
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: inserted, error } = await supabaseAdmin.rpc("record_verified_mint", {
      _user_id: userId,
      _quest_id: questId,
      _tx_hash: txHash,
      _contract_address: contract,
      _chain_id: chainId,
      _token_id: tokenId,
      _metadata_uri: quest.metadata_uri ?? "",
    });
    if (error) throw new Error("Failed to record mint");
    return { ok: true as const, mint: inserted, tokenId };
  });
