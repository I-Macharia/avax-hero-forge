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

// --- Mint a badge to a list of user wallets (admin-only) ---
const mintInput = z.object({
  questId: z.string().uuid(),
  userIds: z.array(z.string().uuid()).min(1).max(100),
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

    const badgeId = BigInt(quest.badge_token_id ?? 0);
    const uri = quest.metadata_uri ?? `ipfs://placeholder/${quest.id}.json`;

    // Simulate + send batch tx
    const { request } = await publicClient.simulateContract({
      account,
      address: contract,
      abi: miniHackAbi,
      functionName: "batchMintTo",
      args: [targets.map((t) => t.address), badgeId, uri],
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
