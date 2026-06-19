
# Team1 MiniHack Heroes — Build Plan

A mobile-friendly gamification dApp for the Avalanche Team1 Africa Mini Hack cohort. Participants earn ERC-721 (soulbound) badges for attendance and quests; organizers manage everything from an admin panel.

## Stack

- **Frontend:** TanStack Start (React 19 + Vite 7) + Tailwind v4 + shadcn/ui, dark mode default, Avalanche red/orange (#E84142) + purple accent palette.
- **Backend:** Lovable Cloud (Supabase under the hood) — auth, Postgres, RLS, server functions.
- **Auth (phase 1):** Supabase email/password + Google OAuth. Wallet address stored on profile (mock-generated on signup, editable later). Architected so Privy/Dynamic can drop in later behind a `WalletProvider` interface.
- **Blockchain:** viem + wagmi configured for Avalanche Fuji (chainId 43113). Read-only contract calls work without a connected EVM wallet; mint button shows "Connect external wallet" fallback (Core/MetaMask via injected connector) until the embedded-wallet provider is chosen.
- **Smart contract:** I generate `contracts/MiniHackAchievement.sol` (soulbound ERC-721, OpenZeppelin v5, `mintTo(address,uint256 badgeId,string uri)`, `onlyOwner` + role-based minters). Includes Hardhat deploy script + Fuji deployment instructions in `contracts/README.md`. Address + ABI wired through env (`VITE_CONTRACT_ADDRESS`) and `src/lib/contract/abi.ts`.

## Pages / Routes

```
/                       Landing — hero, live stats, "Join the MiniHack" CTA
/auth                   Sign in / sign up (email + Google)
/_authenticated/dashboard      Progress bars, owned NFT gallery, claim buttons
/_authenticated/quests         All quests/badges with progress
/_authenticated/leaderboard    Top users, filters (all-time / week / attendance)
/_authenticated/profile        Wallet, NFTs, edit display name/avatar
/_authenticated/admin          Admin-only (gated by has_role + wallet allowlist)
```

## Database (Lovable Cloud)

- `profiles` (id → auth.users, display_name, avatar_url, wallet_address, created_at)
- `app_role` enum: `admin`, `organizer`, `participant`
- `user_roles` (user_id, role) + `has_role()` security-definer RPC
- `sessions` (id, title, starts_at, points default 10)
- `attendance` (user_id, session_id, marked_by, marked_at) — unique pair
- `quests` (id, slug, title, description, points, badge_token_id, icon, active)
- `quest_completions` (user_id, quest_id, completed_by, completed_at, tx_hash nullable)
- `nft_mints` (user_id, quest_id, token_id, tx_hash, contract_address, minted_at)
- View `leaderboard_view` aggregating points + nft counts

RLS: participants read their own rows + public reads on quests/sessions/leaderboard; admins/organizers write via `has_role()`.

## Admin gating (both)

- DB role `admin`/`organizer` controls who sees `/admin` and who can call admin server fns (`requireSupabaseAuth` + `has_role` check).
- `VITE_ADMIN_WALLETS` env allowlist additionally gates the "Batch mint NFTs" button which signs the on-chain tx from the organizer's connected wallet.
- Seed first admin via migration using a placeholder email I'll prompt you for after the plan is approved (or set manually in Cloud → Users).

## Gamification

- Points: attendance 10 pts, quest completion variable (per row), streak bonus computed in `leaderboard_view`.
- Soulbound badges: contract overrides `_update` to block transfers.
- Confetti (`canvas-confetti`) on successful mint; sonner toasts for tx status with Snowtrace links.
- Realtime: Supabase realtime subscription on `nft_mints` + `attendance` to update dashboard/leaderboard live.

## Design

- Dark-first, futuristic Web3. Display font **Space Grotesk**, body **Inter** (via @fontsource).
- Tokens in `src/styles.css`: `--avalanche-red`, `--avalanche-purple`, gradient utilities, glow shadows.
- Hero with animated gradient mesh + framer-motion fade-ins. Badge cards with hover tilt.
- Placeholder logos at `src/assets/team1-logo.svg` and `avaxafrica-logo.svg` (simple generated SVGs).

## Smart contract integration

- `src/lib/contract/abi.ts` — ABI (also re-exported from `contracts/artifacts` after deploy).
- `src/lib/contract/client.ts` — viem `publicClient` for Fuji + helper to get wallet client from injected provider.
- `src/hooks/useMintBadge.ts` — wagmi `useWriteContract` wrapper, returns tx state.
- Metadata loaded from IPFS gateway (`https://ipfs.io/ipfs/<cid>`) via `tokenURI`.
- TODO comments at every contract-address site for easy swap when real deployment happens.

## Env (.env.example)

```
VITE_AVALANCHE_RPC_URL=https://api.avax-test.network/ext/bc/C/rpc
VITE_AVALANCHE_CHAIN_ID=43113
VITE_CONTRACT_ADDRESS=0x0000000000000000000000000000000000000000
VITE_EXPLORER_URL=https://testnet.snowtrace.io
VITE_ADMIN_WALLETS=0xabc...,0xdef...
# Supabase keys auto-injected by Lovable Cloud
```

## Build order

1. Enable Lovable Cloud; create schema migration (tables, enum, RPCs, RLS, grants, leaderboard view, seed quests).
2. Design tokens in `styles.css`, install fonts, generate logos, set up dark-mode default.
3. Auth: `/auth` page with email + Google, root `onAuthStateChange`, `_authenticated` gate (managed).
4. Landing page with live stats server fn.
5. Dashboard, Quests, Leaderboard, Profile pages with TanStack Query loaders.
6. Admin panel: attendance marking, quest awarding, batch mint UI.
7. wagmi/viem setup + Fuji config + mint hook + confetti + toasts.
8. `contracts/` folder with Solidity, Hardhat config, deploy script, README.
9. `.env.example`, README with deploy-to-Vercel notes and extensibility section for future cohorts.

## Out of scope (phase 1)

- Real embedded wallet (Privy/Dynamic) — wired as interface, swap later.
- Custom Avalanche L1 — env-switchable but Fuji is default.
- Actual IPFS pinning (you provide CIDs; placeholder metadata included).

After approval I'll start at step 1 (enable Cloud + migration).
