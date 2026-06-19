import { createPublicClient, createWalletClient, custom, http } from "viem";
import { avalancheFuji, RPC_URL } from "./config";

export const publicClient = createPublicClient({
  chain: avalancheFuji,
  transport: http(RPC_URL),
});

export function getInjectedProvider() {
  if (typeof window === "undefined") return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (window as any).ethereum ?? null;
}

export async function getWalletClient() {
  const eth = getInjectedProvider();
  if (!eth) throw new Error("No wallet detected. Install Core or MetaMask.");
  const [account] = (await eth.request({ method: "eth_requestAccounts" })) as `0x${string}`[];
  // try to switch to Fuji
  try {
    await eth.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: `0x${avalancheFuji.id.toString(16)}` }],
    });
  } catch {
    // user might need to add the chain — best-effort
    try {
      await eth.request({
        method: "wallet_addEthereumChain",
        params: [
          {
            chainId: `0x${avalancheFuji.id.toString(16)}`,
            chainName: avalancheFuji.name,
            nativeCurrency: avalancheFuji.nativeCurrency,
            rpcUrls: [RPC_URL],
            blockExplorerUrls: [avalancheFuji.blockExplorers.default.url],
          },
        ],
      });
    } catch {
      /* ignore */
    }
  }
  return {
    account,
    client: createWalletClient({ chain: avalancheFuji, transport: custom(eth) }),
  };
}
