# MiniHackAchievement contract

Soulbound ERC-721 used to award on-chain badges to MiniHack participants.

## Deploy to Avalanche Fuji

This repo is already a working Foundry project (`foundry.toml`, `remappings.txt`,
`contracts/test/`, dependencies vendored under `.deps/npm`) — no separate
Hardhat project is needed. `script/Deploy.s.sol` deploys the contract and
grants the deployer address `DEFAULT_ADMIN_ROLE`, `MINTER_ROLE`,
`ORGANIZER_ROLE`, and `RELAYER_ROLE` (see the constructor).

```bash
export DEPLOYER_PRIVATE_KEY=0x...     # fund via https://faucet.avax.network/

forge script script/Deploy.s.sol:Deploy \
  --rpc-url https://api.avax-test.network/ext/bc/C/rpc \
  --private-key "$DEPLOYER_PRIVATE_KEY" \
  --broadcast
```

Run `forge test` first if you want to exercise `contracts/test/MiniHackAchievement.t.sol`.

## After deploy

1. Copy the deployed address to `.env` as `VITE_CONTRACT_ADDRESS` (and
   `CONTRACT_ADDRESS` on the server side, if you set that separately).

2. **Grant roles to the server's relayer wallet** — the wallet behind
   `ADMIN_MINTER_PRIVATE_KEY` (see `src/lib/mint.server.ts`). This is the one
   wallet that backs *both* `src/lib/claim.functions.ts` (self-serve claims)
   and `src/lib/admin-mint.functions.ts` (organizer bulk mint/transfer), so it
   needs all of the roles those flows touch — not just `MINTER_ROLE`:

   - `ORGANIZER_ROLE` — to call `attestEligibility` before a participant claims.
   - `RELAYER_ROLE` — to call `claimBadgeFor` on the participant's behalf (sponsored gas).
   - `MINTER_ROLE` — to call `batchMintTo`/`mintTo` for admin backfills and the
     leaderboard badges (18/19/20).
   - `DEFAULT_ADMIN_ROLE` — only if this same wallet will also call `adminTransfer`
     from the admin panel's "Transfer" tab; otherwise keep that role on a
     separate, more tightly held admin key.

   If `ADMIN_MINTER_PRIVATE_KEY` is a *different* wallet than the deployer
   (recommended — keep the deployer/admin key offline), grant explicitly:

   ```js
   const RELAYER = "0xYourServerRelayerWallet";
   await contract.grantRole(await contract.ORGANIZER_ROLE(), RELAYER);
   await contract.grantRole(await contract.RELAYER_ROLE(), RELAYER);
   await contract.grantRole(await contract.MINTER_ROLE(), RELAYER);
   ```

   If `ADMIN_MINTER_PRIVATE_KEY` *is* the deployer wallet, it already has
   every role from the constructor and this step can be skipped.

3. Register each badge type on-chain before anyone can be attested/minted
   against it — `registerBadge` reverts on an unregistered `badgeId`, and so
   does every claim:

   ```bash
   pip install requests python-dotenv --break-system-packages
   PINATA_JWT=<your_jwt> python scripts/upload_to_pinata.py   # -> badge_uris.json

   PRIVATE_KEY=0x... VITE_CONTRACT_ADDRESS=0x... npx tsx scripts/register_badges.ts
   ```

   `upload_to_pinata.py` pins each badge image + ERC-721 metadata JSON to IPFS
   and writes `badge_uris.json`; `register_badges.ts` reads that file and calls
   `registerBadge(badgeId, uri, isSoulbound)` for each entry, skipping any
   `badgeId` that's already registered (checked via `isBadgeRegistered`).

4. Set `metadata_uri` on each corresponding row in the `quests` table to the
   `ipfs://` URI written to `badge_uris.json` (`nft_mints.metadata_uri` is
   populated from this at claim time). Note this is separate from
   `cover_image_url`, which is the local `/public/badges/*.png` path the
   website itself renders — the on-chain metadata URI is only what a wallet
   or block explorer resolves when showing the token off-site.

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

`scripts/upload_to_pinata.py` generates this automatically per badge — see
`BADGE_REGISTRY` in that file for the exact name/description/soulbound values
used for badges 1–20.

