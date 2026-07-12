// ABI for MiniHackAchievement (registry-based badge minting, soulbound quest badges).
// Source: /contracts/MiniHackAchievement.sol — regenerate after any contract change.
//
// IMPORTANT: mintTo/batchMintTo take NO uri argument — the contract pulls each
// badge's URI from the on-chain registry (see registerBadge / badgeConfigs).
// A previous version of this ABI incorrectly included a uri param on these
// functions, which would have caused every mint tx to revert or fail to encode.
export const miniHackAbi = [
  {
    type: "function",
    name: "mintTo",
    stateMutability: "nonpayable",
    inputs: [
      { name: "to", type: "address" },
      { name: "badgeId", type: "uint256" },
    ],
    outputs: [{ name: "tokenId", type: "uint256" }],
  },
  {
    type: "function",
    name: "batchMintTo",
    stateMutability: "nonpayable",
    inputs: [
      { name: "tos", type: "address[]" },
      { name: "badgeId", type: "uint256" },
    ],
    outputs: [{ name: "tokenIds", type: "uint256[]" }],
  },
  {
    type: "function",
    name: "registerBadge",
    stateMutability: "nonpayable",
    inputs: [
      { name: "badgeId", type: "uint256" },
      { name: "uri", type: "string" },
      { name: "isSoulbound", type: "bool" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "badgeConfigs",
    stateMutability: "view",
    inputs: [{ name: "", type: "uint256" }],
    outputs: [
      { name: "uri", type: "string" },
      { name: "isSoulbound", type: "bool" },
      { name: "registered", type: "bool" },
    ],
  },
  {
    type: "function",
    name: "isSoulbound",
    stateMutability: "view",
    inputs: [{ name: "badgeId", type: "uint256" }],
    outputs: [{ type: "bool" }],
  },
  {
    type: "function",
    name: "adminTransfer",
    stateMutability: "nonpayable",
    inputs: [
      { name: "from", type: "address" },
      { name: "to", type: "address" },
      { name: "tokenId", type: "uint256" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "getBadgeId",
    stateMutability: "view",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [{ name: "owner", type: "address" }],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    name: "ownerOf",
    stateMutability: "view",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [{ type: "address" }],
  },
  {
    type: "function",
    name: "tokenURI",
    stateMutability: "view",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [{ type: "string" }],
  },
  {
    type: "function",
    name: "totalSupply",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "event",
    name: "BadgeMinted",
    inputs: [
      { indexed: true, name: "to", type: "address" },
      { indexed: true, name: "tokenId", type: "uint256" },
      { indexed: true, name: "badgeId", type: "uint256" },
    ],
  },
  {
    type: "event",
    name: "BadgeRegistered",
    inputs: [
      { indexed: true, name: "badgeId", type: "uint256" },
      { indexed: false, name: "uri", type: "string" },
      { indexed: false, name: "isSoulbound", type: "bool" },
    ],
  },
] as const;
