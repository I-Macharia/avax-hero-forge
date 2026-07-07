import { createPublicClient, createWalletClient, http, parseAbi } from 'viem';
import { avalancheFuji } from 'viem/chains';
import * as dotenv from 'dotenv';

dotenv.config();

const CONTRACT_ADDRESS = process.env.VITE_CONTRACT_ADDRESS as `0x${string}`;
const PRIVATE_KEY = process.env.PRIVATE_KEY as `0x${string}`;

if (!CONTRACT_ADDRESS || !PRIVATE_KEY) {
  throw new Error('Missing VITE_CONTRACT_ADDRESS or PRIVATE_KEY in .env');
}

const abi = parseAbi([
  'function registerBadge(uint256 badgeId, string uri, bool isSoulbound) external',
  'function badgeConfigs(uint256) view returns (string uri, bool isSoulbound, bool registered)'
]);

const publicClient = createPublicClient({
  chain: avalancheFuji,
  transport: http('https://api.avax-test.network/ext/bc/C/rpc'),
});

const walletClient = createWalletClient({
  chain: avalancheFuji,
  transport: http('https://api.avax-test.network/ext/bc/C/rpc'),
  account: PRIVATE_KEY as any, // adjust for viem account
});

async function main() {
  const badges: any[] = await import('./badge_uris.json').then(m => m.default || m);

  for (const badge of badges) {
    const { badgeId, metadataUri, isSoulbound } = badge;

    const config = await publicClient.readContract({
      address: CONTRACT_ADDRESS,
      abi,
      functionName: 'badgeConfigs',
      args: [BigInt(badgeId)],
    });

    if (config[2]) {
      console.log(`Badge ${badgeId} already registered, skipping.`);
      continue;
    }

    const hash = await walletClient.writeContract({
      address: CONTRACT_ADDRESS,
      abi,
      functionName: 'registerBadge',
      args: [BigInt(badgeId), metadataUri, isSoulbound],
    });

    console.log(`Registered badge ${badgeId}: ${hash}`);
    await publicClient.waitForTransactionReceipt({ hash });
  }

  console.log('✅ All badges registered!');
}

main().catch(console.error);
