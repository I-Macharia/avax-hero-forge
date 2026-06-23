// Server-only viem wallet client for admin-signed mints/transfers.
// Loaded via dynamic import from server functions so the private key never ships to the browser.
import { createPublicClient, createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { defineChain } from "viem";

const RPC_URL =
  process.env.AVALANCHE_RPC_URL ??
  process.env.VITE_AVALANCHE_RPC_URL ??
  "https://api.avax-test.network/ext/bc/C/rpc";

export const CHAIN_ID = Number(process.env.VITE_AVALANCHE_CHAIN_ID ?? 43113);

export const fujiServer = defineChain({
  id: CHAIN_ID,
  name: "Avalanche Fuji",
  nativeCurrency: { name: "AVAX", symbol: "AVAX", decimals: 18 },
  rpcUrls: { default: { http: [RPC_URL] } },
});

export function getServerPublicClient() {
  return createPublicClient({ chain: fujiServer, transport: http(RPC_URL) });
}

export function getAdminMinter() {
  const raw = process.env.ADMIN_MINTER_PRIVATE_KEY;
  if (!raw) {
    throw new Error(
      "Signer not configured — set ADMIN_MINTER_PRIVATE_KEY for the server-side minter.",
    );
  }
  const pk = (raw.startsWith("0x") ? raw : `0x${raw}`) as `0x${string}`;
  const account = privateKeyToAccount(pk);
  const wallet = createWalletClient({ account, chain: fujiServer, transport: http(RPC_URL) });
  return { account, wallet };
}

export function getContractAddress(): `0x${string}` {
  const addr =
    process.env.CONTRACT_ADDRESS ??
    process.env.VITE_CONTRACT_ADDRESS ??
    "0x0000000000000000000000000000000000000000";
  if (addr === "0x0000000000000000000000000000000000000000") {
    throw new Error("Contract not deployed yet — set VITE_CONTRACT_ADDRESS.");
  }
  return addr as `0x${string}`;
}
