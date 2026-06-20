// This module proxies NFT queries to the server-side Thirdweb SDK endpoint (/api/nfts)
export async function fetchAllNFTs(contractAddress: string, owner?: string) {
  const params = new URLSearchParams();
  if (contractAddress) params.set("contract", contractAddress);
  if (owner) params.set("owner", owner);

  try {
    const res = await fetch(`/api/nfts?${params.toString()}`);
    if (!res.ok) return [];
    const json = await res.json();
    return json?.nfts ?? [];
  } catch (e) {
    console.error("fetchAllNFTs proxy error", e);
    return [];
  }
}
