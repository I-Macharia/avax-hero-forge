/**
 * register_badges.ts
 *
 * Reads badge_uris.json (output of upload_to_pinata.py) and calls
 * registerBadge() on the deployed MiniHackAchievement contract for each entry.
 *
 * FIXED: the previous version passed `account: PRIVATE_KEY as any` directly
 * to createWalletClient — viem requires an Account object, not a raw private
 * key string, so every call in this script would have thrown at runtime.
 * This version derives the account via privateKeyToAccount() as viem expects.
 *
 * Usage:
 *   npm install viem dotenv
 *   npx tsx scripts/register_badges.ts
 *
 * Required .env:
 *   PRIVATE_KEY=0x...            Admin wallet (holds DEFAULT_ADMIN_ROLE)
 *   VITE_CONTRACT_ADDRESS=0x...  Deployed MiniHackAchievement address
 */
import { createPublicClient, createWalletClient, http, parseAbi } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { avalancheFuji } from "viem/chains";
import { readFileSync } from "fs";
import * as dotenv from "dotenv";

dotenv.config();

const CONTRACT_ADDRESS = process.env.VITE_CONTRACT_ADDRESS as `0x${string}` | undefined;
const PRIVATE_KEY = process.env.PRIVATE_KEY as `0x${string}` | undefined;

if (!CONTRACT_ADDRESS || !PRIVATE_KEY) {
  throw new Error("Missing VITE_CONTRACT_ADDRESS or PRIVATE_KEY in .env");
}

const abi = parseAbi([
  "function registerBadge(uint256 badgeId, string uri, bool isSoulbound) external",
  "function badgeConfigs(uint256) view returns (string uri, bool isSoulbound, bool registered)",
]);

interface BadgeEntry {
  badgeId: number;
  name: string;
  metadataUri: string;
  isSoulbound: boolean;
}

async function main(): Promise<void> {
  const badgeUris: Record<string, BadgeEntry> = JSON.parse(
    readFileSync("badge_uris.json", "utf-8"),
  );

  const account = privateKeyToAccount(PRIVATE_KEY);

  const publicClient = createPublicClient({
    chain: avalancheFuji,
    transport: http("https://api.avax-test.network/ext/bc/C/rpc"),
  });
  const walletClient = createWalletClient({
    account,
    chain: avalancheFuji,
    transport: http("https://api.avax-test.network/ext/bc/C/rpc"),
  });

  console.log(`\nRegistering ${Object.keys(badgeUris).length} badge types on-chain...`);
  console.log(`Contract : ${CONTRACT_ADDRESS}`);
  console.log(`Admin    : ${account.address}\n`);

  for (const [, badge] of Object.entries(badgeUris).sort(([a], [b]) => Number(a) - Number(b))) {
    const { badgeId, name, metadataUri, isSoulbound } = badge;

    const config = await publicClient.readContract({
      address: CONTRACT_ADDRESS,
      abi,
      functionName: "badgeConfigs",
      args: [BigInt(badgeId)],
    });

    if (config[2]) {
      console.log(`[${String(badgeId).padStart(2, "0")}] Already registered — skipping: ${name}`);
      continue;
    }

    process.stdout.write(`[${String(badgeId).padStart(2, "0")}] Registering: ${name} ... `);
    const hash = await walletClient.writeContract({
      address: CONTRACT_ADDRESS,
      abi,
      functionName: "registerBadge",
      args: [BigInt(badgeId), metadataUri, isSoulbound],
    });
    await publicClient.waitForTransactionReceipt({ hash });
    console.log(`\u2713 tx: ${hash}`);
  }

  console.log("\n\u2705 All badges registered!");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
