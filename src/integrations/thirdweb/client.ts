// Dynamically load Thirdweb SDK and ethers at runtime. This avoids bundling
// server-only dependencies into the client build and fixes editor/runtime
// import resolution when running in the browser.
export async function getThirdweb() {
	// Read RPC URL from environment with sensible default to localhost.
	const serverRpc = process.env.THIRDWEB_RPC_URL || process.env.THIRDWEB_RPC || undefined;
	const clientRpc = ((import.meta as any).env?.VITE_THIRDWEB_RPC_URL as string) || process.env.REACT_APP_THIRDWEB_RPC_URL;
	const RPC = typeof window === "undefined" ? serverRpc ?? clientRpc ?? "http://127.0.0.1:8545" : clientRpc ?? serverRpc ?? "http://127.0.0.1:8545";

	// Dynamic imports so bundlers won't include these modules in client bundles.
	const [ethersModule, thirdwebModule] = await Promise.all([import("ethers"), import("@thirdweb-dev/sdk")]);
	const ethers = (ethersModule as any).ethers ?? (ethersModule as any).default ?? ethersModule;
	const ThirdwebSDK = (thirdwebModule as any).ThirdwebSDK ?? (thirdwebModule as any).default ?? thirdwebModule;
	const provider = new ((ethers as any).providers?.JsonRpcProvider ?? (ethers as any).JsonRpcProvider)(RPC);
	return new (ThirdwebSDK as any)(provider as any);
}