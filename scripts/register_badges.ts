/**
 * register_badges.ts
 *
 * Reads badge_uris.json (output of upload_to_pinata.py) and calls
 * registerBadge() on the deployed MiniHackAchievement contract for each entry.
 *
 * Usage:
 *   npx tsx scripts/register_badges.ts
 *
 * Required .env:
 *   PRIVATE_KEY=0x...            Admin wallet (holds DEFAULT_ADMIN_ROLE)
 *   VITE_CONTRACT_ADDRESS=0x...  Deployed MiniHackAchievement address
 */
/// <reference types="node" />
import { createPublicClient, createWalletClient, http, parseAbi } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { avalancheFuji } from "viem/chains";
import { existsSync, readFileSync } from "fs";
import { resolve } from "path";

function loadEnvFile(): void {
  const envPath = resolve(process.cwd(), ".env");
  if (!existsSync(envPath)) {
    return;
  }

  for (const rawLine of readFileSync(envPath, "utf-8").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) {
      continue;
    }

    let normalizedLine = line;
    if (normalizedLine.startsWith("export ")) {
      normalizedLine = normalizedLine.slice(7).trim();
    }

    let key = "";
    let value = "";
    const equalsIndex = normalizedLine.indexOf("=");
    if (equalsIndex >= 0) {
      key = normalizedLine.slice(0, equalsIndex);
      value = normalizedLine.slice(equalsIndex + 1);
    } else {
      const colonIndex = normalizedLine.indexOf(":");
      if (colonIndex < 0) {
        continue;
      }
      key = normalizedLine.slice(0, colonIndex);
      value = normalizedLine.slice(colonIndex + 1);
    }

    key = key.trim();
    value = value.trim().replace(/^['\"]|['\"]$/g, "");
    if (!key) {
      continue;
    }

    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

loadEnvFile();

const CONTRACT_ADDRESS = (process.env.VITE_CONTRACT_ADDRESS || process.env.CONTRACT_ADDRESS) as `0x${string}` | undefined;
const PRIVATE_KEY = (process.env.PRIVATE_KEY || process.env.DEPLOYER_PRIVATE_KEY) as `0x${string}` | undefined;

if (!CONTRACT_ADDRESS || !PRIVATE_KEY) {
  throw new Error("Missing VITE_CONTRACT_ADDRESS or PRIVATE_KEY in .env");
}

const abi = parseAbi([
  "function registerBadge(uint256 badgeId, string uri, bool isSoulbound) external",
  "function isBadgeRegistered(uint256 badgeId) view returns (bool)",
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

  const account = privateKeyToAccount(PRIVATE_KEY as `0x${string}`);

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

    const alreadyRegistered = await publicClient.readContract({
      address: CONTRACT_ADDRESS as `0x${string}`,
      abi,
      functionName: "isBadgeRegistered",
      args: [BigInt(badgeId)],
    });

    if (alreadyRegistered) {
      console.log(`[${String(badgeId).padStart(2, "0")}] Already registered — skipping: ${name}`);
      continue;
    }

    process.stdout.write(`[${String(badgeId).padStart(2, "0")}] Registering: ${name} ... `);
    const hash = await walletClient.writeContract({
      address: CONTRACT_ADDRESS as `0x${string}`,
      abi,
      functionName: "registerBadge",
      args: [BigInt(badgeId), metadataUri, isSoulbound],
      gas: 500_000n,
    });
    await publicClient.waitForTransactionReceipt({ hash });
    console.log(`✓ tx: ${hash}`);
  }

  console.log("\n✅ All badges registered!");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
