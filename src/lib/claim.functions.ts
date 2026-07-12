// Self-serve badge claim: a participant who has completed a quest can claim
// their badge directly. The server's admin-minter wallet pays gas and signs
// the mint (server-sponsored), so participants never need AVAX or a
// browser wallet extension to claim.
//
// Eligibility is enforced twice:
//   1. Here, before we ever touch the chain (fast fail, no wasted gas).
//   2. Inside record_verified_mint (SECURITY DEFINER SQL function), which
//      re-checks quest_completions as a defense-in-depth backstop.
//
// Idempotent: if the user already claimed this quest's badge, we return the
// existing mint record instead of minting a duplicate (also enforced at the
// DB level by a unique (user_id, quest_id) constraint on nft_mints).
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getAddress, isAddress, parseEventLogs } from "viem";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { miniHackAbi } from "@/lib/contract/abi";

const claimInput = z.object({
  questId: z.string().uuid(),
});

export const claimBadge = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => claimInput.parse(data))
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // 1. Load the quest and its on-chain badge type.
    const { data: quest, error: qErr } = await supabaseAdmin
      .from("quests")
      .select("id, title, badge_token_id, metadata_uri")
      .eq("id", data.questId)
      .maybeSingle();
    if (qErr || !quest) throw new Error("Quest not found");
    if (quest.badge_token_id == null) {
      throw new Error("This quest doesn't have a badge configured yet");
    }

    // 2. Verify eligibility — a quest_completions row must exist for this user.
    const { data: completion } = await supabaseAdmin
      .from("quest_completions")
      .select("id")
      .eq("user_id", userId)
      .eq("quest_id", data.questId)
      .maybeSingle();
    if (!completion) {
      throw new Error("Not eligible yet — complete this quest first");
    }

    // 3. Already claimed? Return the existing record instead of re-minting.
    const { data: existingMint } = await supabaseAdmin
      .from("nft_mints")
      .select("id, tx_hash, token_id")
      .eq("user_id", userId)
      .eq("quest_id", data.questId)
      .maybeSingle();
    if (existingMint) {
      return {
        ok: true as const,
        alreadyClaimed: true,
        hash: existingMint.tx_hash,
        tokenId: existingMint.token_id,
      };
    }

    // 4. Need a destination wallet on file.
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("wallet_address")
      .eq("id", userId)
      .maybeSingle();
    if (!profile?.wallet_address || !isAddress(profile.wallet_address)) {
      throw new Error("Add a wallet address to your profile before claiming");
    }
    const to = getAddress(profile.wallet_address);

    // 5. Mint via the server-sponsored admin minter.
    const { getAdminMinter, getServerPublicClient, getContractAddress, CHAIN_ID } =
      await import("@/lib/mint.server");
    const contract = getContractAddress();
    const { account, wallet } = getAdminMinter();
    const publicClient = getServerPublicClient();
    const badgeId = BigInt(quest.badge_token_id);

    const { request } = await publicClient.simulateContract({
      account,
      address: contract,
      abi: miniHackAbi,
      functionName: "mintTo",
      args: [to, badgeId],
    });
    const hash = await wallet.writeContract(request);
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    if (receipt.status !== "success") throw new Error("Mint transaction reverted");

    const logs = parseEventLogs({
      abi: miniHackAbi,
      eventName: "BadgeMinted",
      logs: receipt.logs,
    });
    const tokenId = logs[0] ? Number((logs[0].args as { tokenId?: bigint }).tokenId ?? 0) : null;

    // 6. Record the mint (RPC re-verifies eligibility server-side).
    const { error: rpcErr } = await supabaseAdmin.rpc("record_verified_mint", {
      _user_id: userId,
      _quest_id: data.questId,
      _tx_hash: hash,
      _contract_address: contract,
      _chain_id: CHAIN_ID,
      _token_id: tokenId ?? 0,
      _metadata_uri: quest.metadata_uri ?? "",
      _owner_address: to,
    });
    if (rpcErr) {
      // The mint succeeded on-chain even though the DB write failed — surface
      // both facts so an admin can reconcile via the tx hash if needed.
      throw new Error(
        `Badge minted on-chain (tx ${hash}) but failed to record: ${rpcErr.message}`,
      );
    }

    return { ok: true as const, alreadyClaimed: false, hash, tokenId };
  });
