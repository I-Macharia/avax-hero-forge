# MiniHackAchievement contract

Soulbound ERC-721 used to award on-chain badges to MiniHack participants.

## Deploy to Avalanche Fuji

```bash
# 1. Init a Hardhat or Foundry project alongside this file
mkdir contract-deploy && cd contract-deploy
npm init -y
npm i --save-dev hardhat @nomicfoundation/hardhat-toolbox @openzeppelin/contracts dotenv
npx hardhat init   # choose "Create a TypeScript project"

# 2. Copy contracts/MiniHackAchievement.sol into ./contracts/

# 3. hardhat.config.ts
import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "dotenv/config";
const config: HardhatUserConfig = {
  solidity: "0.8.24",
  networks: {
    fuji: {
      url: "https://api.avax-test.network/ext/bc/C/rpc",
      chainId: 43113,
      accounts: [process.env.DEPLOYER_PRIVATE_KEY!],
    },
  },
};
export default config;

# 4. scripts/deploy.ts
import { ethers } from "hardhat";
async function main() {
  const [deployer] = await ethers.getSigners();
  const C = await ethers.getContractFactory("MiniHackAchievement");
  const c = await C.deploy(deployer.address);
  await c.waitForDeployment();
  console.log("Deployed:", await c.getAddress());
}
main();

# 5. Deploy
export DEPLOYER_PRIVATE_KEY=0x...     # fund via https://faucet.avax.network/
npx hardhat run scripts/deploy.ts --network fuji
```

## After deploy

1. Copy the deployed address to `.env` as `VITE_CONTRACT_ADDRESS`.
2. Grant `MINTER_ROLE` to any additional organizer wallet you list in
   `VITE_ADMIN_WALLETS`:
   ```js
   await contract.grantRole(await contract.MINTER_ROLE(), "0xOrganizer");
   ```
3. Pin each badge's metadata JSON to IPFS (e.g. Pinata or web3.storage) and
   set the `metadata_uri` on the corresponding row in the `quests` table.

## Metadata JSON shape (per badge)

```json
{
  "name": "Full Attendance Hero",
  "description": "Awarded for attending every Team1 MiniHack session.",
  "image": "ipfs://<image-cid>",
  "attributes": [
    { "trait_type": "Cohort", "value": "Africa MiniHack 2026" },
    { "trait_type": "Type", "value": "Attendance" }
  ]
}
```
