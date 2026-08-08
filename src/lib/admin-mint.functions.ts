import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getAddress, isAddress, parseEventLogs } from "viem";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { miniHackAbi } from "@/lib/contract/abi";

async function assertOrganizer(supabase: any, userId: string) {
  const [{ data: isAdmin }, { data: isOrg }] = await Promise.all([
    supabase.rpc("has_role", { _user_id: userId, _role: "admin" }),
    supabase.rpc("has_role", { _user_id: userId, _role: "organizer" }),
  ]);
  if (!isAdmin && !isOrg) throw new Error("Forbidden");
  return { isAdmin: !!isAdmin };
}

// --- Mint a badge to a list of user wallets (admin-only, bulk / override path) ---
// Note: participants normally self-claim via src/lib/claim.functions.ts. This
// stays available for organizers to backfill mints (e.g. offline approvals)
// or to award the leaderboard badges (18/19/20) to top finishers.
const mintInput = z.object({
  questId: z.string().uuid(),
  userIds: z.array(z.string().uuid()).min(1).max(100),
});

const registerBadgeInput = z.object({
  questId: z.string().uuid(),
  isSoulbound: z.boolean().optional().default(true),
});

export const registerBadgeOnChain = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => registerBadgeInput.parse(data))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertOrganizer(supabase, userId);

    const { getAdminMinter, getServerPublicClient, getContractAddress } = await import(
      "@/lib/mint.server"
    );
    const contract = getContractAddress();
    const { account, wallet } = getAdminMinter();
    const publicClient = getServerPublicClient();

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: quest, error: qErr } = await supabaseAdmin
      .from("quests")
      .select("id, badge_token_id, metadata_uri, title")
      .eq("id", data.questId)
      .maybeSingle();
    if (qErr || !quest) throw new Error("Quest not found");
    if (quest.badge_token_id == null) throw new Error("Quest has no badge configured");
    if (!quest.metadata_uri) throw new Error("Quest has no metadata URI configured");

    const badgeId = BigInt(quest.badge_token_id);
    const alreadyRegistered = await publicClient.readContract({
      address: contract,
      abi: miniHackAbi,
      functionName: "isBadgeRegistered",
      args: [badgeId],
    });

    if (alreadyRegistered) {
      return {
        ok: true as const,
        alreadyRegistered: true as const,
        hash: null,
        badgeId: Number(badgeId),
        uri: quest.metadata_uri,
        isSoulbound: data.isSoulbound,
      };
    }

    const { request } = await publicClient.simulateContract({
      account,
      address: contract,
      abi: miniHackAbi,
      functionName: "registerBadge",
      args: [badgeId, quest.metadata_uri, data.isSoulbound],
    });
    const hash = await wallet.writeContract(request);
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    if (receipt.status !== "success") throw new Error("Badge registration reverted");

    return {
      ok: true as const,
      alreadyRegistered: false as const,
      hash,
      badgeId: Number(badgeId),
      uri: quest.metadata_uri,
      isSoulbound: data.isSoulbound,
    };
  });

export const adminMintBadge = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => mintInput.parse(data))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertOrganizer(supabase, userId);

    const { getAdminMinter, getServerPublicClient, getContractAddress, CHAIN_ID } =
      await import("@/lib/mint.server");
    const contract = getContractAddress();
    const { account, wallet } = getAdminMinter();
    const publicClient = getServerPublicClient();

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // load quest
    const { data: quest, error: qErr } = await supabaseAdmin
      .from("quests")
      .select("id, badge_token_id, metadata_uri, title")
      .eq("id", data.questId)
      .maybeSingle();
    if (qErr || !quest) throw new Error("Quest not found");
    if (quest.badge_token_id == null) throw new Error("Quest has no badge configured");

    // load target wallets, dedupe, skip already-minted users
    const { data: profiles } = await supabaseAdmin
      .from("profiles")
      .select("id, wallet_address")
      .in("id", data.userIds);

    const { data: existing } = await supabaseAdmin
      .from("nft_mints")
      .select("user_id")
      .eq("quest_id", data.questId)
      .in("user_id", data.userIds);
    const alreadyMinted = new Set((existing ?? []).map((r) => r.user_id));

    const targets = (profiles ?? [])
      .filter((p) => p.wallet_address && isAddress(p.wallet_address) && !alreadyMinted.has(p.id))
      .map((p) => ({ userId: p.id, address: getAddress(p.wallet_address!) }));

    if (targets.length === 0) {
      return { ok: true as const, hash: null, minted: 0, skipped: data.userIds.length };
    }

    // ensure quest_completions exist (so leaderboard counts) — best-effort
    await supabaseAdmin
      .from("quest_completions")
      .upsert(
        targets.map((t) => ({ user_id: t.userId, quest_id: data.questId, completed_by: userId })),
        { onConflict: "user_id,quest_id", ignoreDuplicates: true },
      );

    const badgeId = BigInt(quest.badge_token_id);
    const uri = quest.metadata_uri ?? "";

    // Simulate + send batch tx — badgeId only; URI comes from the on-chain
    // registry (registerBadge), matching the deployed contract's signature.
    const { request } = await publicClient.simulateContract({
      account,
      address: contract,
      abi: miniHackAbi,
      functionName: "batchMintTo",
      args: [targets.map((t) => t.address), badgeId],
    });
    const hash = await wallet.writeContract(request);
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    if (receipt.status !== "success") throw new Error("Mint transaction reverted");

    // Parse BadgeMinted events, record each
    const logs = parseEventLogs({
      abi: miniHackAbi,
      eventName: "BadgeMinted",
      logs: receipt.logs,
    });

    let recorded = 0;
    for (const log of logs) {
      const args = log.args as { to?: `0x${string}`; tokenId?: bigint; badgeId?: bigint };
      if (!args.to || !args.tokenId) continue;
      const toAddr = getAddress(args.to);
      const target = targets.find((t) => t.address === toAddr);
      if (!target) continue;
      const { error: rpcErr } = await supabaseAdmin.rpc("record_verified_mint", {
        _user_id: target.userId,
        _quest_id: data.questId,
        _tx_hash: hash,
        _contract_address: contract,
        _chain_id: CHAIN_ID,
        _token_id: Number(args.tokenId),
        _metadata_uri: uri,
        _owner_address: toAddr,
      });
      if (!rpcErr) recorded += 1;
    }

    return {
      ok: true as const,
      hash,
      minted: recorded,
      skipped: data.userIds.length - targets.length,
    };
  });

// --- Transfer a previously-minted badge to another wallet (admin-only) ---
// Only works for transferable (non-soulbound) badges on-chain — the contract
// itself enforces this via adminTransfer's soulbound bypass, which admins can
// use for leaderboard badges (18-20) but which quest badges (1-17) reject
// unless you intend a genuine correction.
const transferInput = z.object({
  mintId: z.string().uuid(),
  toAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
});

export const adminTransferBadge = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => transferInput.parse(data))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { isAdmin } = await assertOrganizer(supabase, userId);
    if (!isAdmin) throw new Error("Only admins can transfer badges");

    const { getAdminMinter, getServerPublicClient, getContractAddress } = await import(
      "@/lib/mint.server"
    );
    const contract = getContractAddress();
    const { account, wallet } = getAdminMinter();
    const publicClient = getServerPublicClient();

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: mint, error } = await supabaseAdmin
      .from("nft_mints")
      .select("id, token_id, owner_address, user_id")
      .eq("id", data.mintId)
      .maybeSingle();
    if (error || !mint || !mint.token_id) throw new Error("Mint not found");

    const from = mint.owner_address ? getAddress(mint.owner_address) : account.address;
    const to = getAddress(data.toAddress);

    const { request } = await publicClient.simulateContract({
      account,
      address: contract,
      abi: miniHackAbi,
      functionName: "adminTransfer",
      args: [from, to, BigInt(mint.token_id)],
    });
    const hash = await wallet.writeContract(request);
    await publicClient.waitForTransactionReceipt({ hash });

    await supabaseAdmin.from("nft_mints").update({ owner_address: to }).eq("id", data.mintId);
    return { ok: true as const, hash };
  });
