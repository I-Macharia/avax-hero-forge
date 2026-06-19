// Avalanche Fuji testnet config (switch by changing env vars).
// To deploy your own MiniHackAchievement contract, see /contracts/README.md.
import { defineChain } from "viem";

export const CONTRACT_ADDRESS =
  (import.meta.env.VITE_CONTRACT_ADDRESS as `0x${string}`) ??
  "0x0000000000000000000000000000000000000000";

export const CHAIN_ID = Number(import.meta.env.VITE_AVALANCHE_CHAIN_ID ?? 43113);
export const RPC_URL =
  (import.meta.env.VITE_AVALANCHE_RPC_URL as string) ??
  "https://api.avax-test.network/ext/bc/C/rpc";
export const EXPLORER_URL =
  (import.meta.env.VITE_EXPLORER_URL as string) ?? "https://testnet.snowtrace.io";

export const ADMIN_WALLETS = ((import.meta.env.VITE_ADMIN_WALLETS as string) ?? "")
  .split(",")
  .map((a) => a.trim().toLowerCase())
  .filter(Boolean);

export const avalancheFuji = defineChain({
  id: 43113,
  name: "Avalanche Fuji",
  nativeCurrency: { name: "AVAX", symbol: "AVAX", decimals: 18 },
  rpcUrls: { default: { http: [RPC_URL] } },
  blockExplorers: { default: { name: "Snowtrace", url: EXPLORER_URL } },
  testnet: true,
});

export function shortAddress(a?: string | null) {
  if (!a) return "";
  return `${a.slice(0, 6)}…${a.slice(-4)}`;
}

export function txUrl(hash: string) {
  return `${EXPLORER_URL}/tx/${hash}`;
}
