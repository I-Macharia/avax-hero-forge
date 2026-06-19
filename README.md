# Team1 MiniHack Heroes 🏔️

A gamification platform for the **Avalanche Team1 Africa Mini Hack** cohort. Heroes earn on-chain soulbound NFT badges for attending sessions, completing quests, and climbing the leaderboard.

## Stack

- **Frontend:** TanStack Start · React 19 · Vite · Tailwind v4 · shadcn/ui · framer-motion
- **Backend:** Lovable Cloud (Postgres + Auth + RLS)
- **Blockchain:** viem on Avalanche Fuji (chainId 43113), soulbound ERC-721 (`MiniHackAchievement.sol`)
- **Auth:** Email/password + Google. Wallet linking via Core / MetaMask. Architecture ready to drop in Privy or Dynamic embedded wallets.

## Features

- 🏆 Live leaderboard with all-time / attendance / NFT filters
- 🎯 Quests with progress, mint-to-claim soulbound badges, confetti on success
- 📅 Attendance tracking with auto-points
- 🛡️ Admin panel gated by role (`admin` / `organizer`) **and** wallet allowlist for on-chain ops
- 📱 Mobile-first dark UI, Avalanche red/orange + purple branding
- ⚡ Real-time data refresh via TanStack Query polling

## Quick start

```bash
bun install
cp .env.example .env   # fill in VITE_CONTRACT_ADDRESS after deploy
bun dev
```

## Deploy the smart contract

See [`contracts/README.md`](./contracts/README.md). After deploy, paste the address into `.env` as `VITE_CONTRACT_ADDRESS` and list admin/organizer wallets in `VITE_ADMIN_WALLETS`.

## Admin setup

Roles are stored in `public.user_roles`. To make a user an admin:

```sql
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin' FROM auth.users WHERE email = 'you@example.com';
```

## Deploy

Auto-deploys on Lovable. Click **Publish** in the top-right.

## Extending for future cohorts

The schema is cohort-agnostic. To run a new cohort (Gaming, Agentic AI):
1. Insert a new set of `quests` and `sessions` rows.
2. Re-deploy the contract with a new symbol if you want a separate collection, or keep using the existing one and just add new `badge_token_id`s.
3. Replace the placeholder logos in `src/components/SiteHeader.tsx`.
