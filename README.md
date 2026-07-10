# Avax Hero Forge

Gamified quest & badge platform for Avalanche cohorts. Participants complete quests (tracked via Tally forms), organizers approve completions, and admins mint on-chain ERC-721 achievement badges on Avalanche Fuji.

## Vision

A showcase project for the Avalanche ecosystem: a small, sharp, production-quality stack that any future cohort can spin up in an afternoon. From here on the focus is shipping polished features one at a time — better typing, faster renders, real accessibility, honest docs, and reusable UI primitives so the codebase survives many cohorts without rewrites.

## Architecture

```
┌────────────┐   Tally webhook   ┌──────────────────────────┐
│  Tally.so  │──────────────────▶│ /api/public/tally-webhook│
└────────────┘                   └────────────┬─────────────┘
                                              │ upsert
                                              ▼
┌───────────────┐   server fns    ┌───────────────────────────┐
│ React UI      │◀───────────────▶│ Lovable Cloud (Postgres)  │
│ TanStack Start│                 │  quests / submissions /   │
│               │                 │  completions / nft_mints  │
└──────┬────────┘                 └────────────┬──────────────┘
       │ admin mint fn                          │ record_verified_mint
       ▼                                        ▼
┌───────────────────────────────────────────────────────────┐
│ MiniHackAchievement (ERC-721) — Avalanche Fuji            │
└───────────────────────────────────────────────────────────┘
```

- **Routing / SSR**: TanStack Start v1 (Vite 7, React 19). Routes in `src/routes/`.
- **Backend**: Lovable Cloud (Postgres + Auth). RLS on every public table.
- **Server logic**: `createServerFn` in `src/lib/*.functions.ts`.
- **Public HTTP** (Tally webhook): `src/routes/api/public/tally-webhook.ts`.
- **Contract**: `contracts/MiniHackAchievement.sol` — admin-mintable, per-badge soulbound flag, `adminTransfer` escape hatch.

## Local dev

```bash
bun install
bun run dev   # http://localhost:8080
```

## Environment variables

Client-side (`VITE_*`, safe to ship):

- `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` — auto-managed by Lovable Cloud.
- `VITE_CONTRACT_ADDRESS` — deployed `MiniHackAchievement` on Fuji.
- `VITE_AVALANCHE_CHAIN_ID` — defaults to `43113` (Fuji).

Server-only secrets (add via the Secrets manager):

- `ADMIN_MINTER_PRIVATE_KEY` — funded Fuji wallet with `MINTER_ROLE`. Signs all mints/transfers.
- `TALLY_WEBHOOK_SECRET` — HMAC secret from each Tally form's webhook config.
- `TALLY_API_KEY` — for admin "Resync from Tally" pulls.

## Running a new cohort

1. **Seed quests** in `public.quests`, one row per quest: set `track`, `week`, `points`, `tally_form_id`, `tally_form_url`.
2. **Deploy** `MiniHackAchievement.sol` to Fuji (`forge script script/Deploy.s.sol`) and set `VITE_CONTRACT_ADDRESS`.
3. **Register badges** on-chain: `contract.registerBadge(badgeId, tokenUri, isSoulbound)` for each quest badge. Script: `scripts/register_badges.ts`.
4. **Grant `MINTER_ROLE`** to the server's admin wallet: `contract.grantRole(MINTER_ROLE, adminAddress)`.
5. **Set secrets**: `ADMIN_MINTER_PRIVATE_KEY`, `TALLY_WEBHOOK_SECRET`, `TALLY_API_KEY`.
6. **Wire Tally webhooks**: point each form at `https://<published-url>/api/public/tally-webhook` and paste `TALLY_WEBHOOK_SECRET` as the signing secret.
7. **Assign roles**: promote organizers via `public.user_roles` (only existing `admin`s can insert).
8. **Publish** the app.

## Security invariants

- Users **never** mint. All mint/transfer paths go through admin-only server functions in `src/lib/admin-mint.functions.ts` that re-check `has_role` before touching the chain.
- Every `public` table has explicit RLS + `GRANT`s. `user_roles` writes are admin-only; roles are never stored on `profiles`.
- Public read policies on submission/mint tables never expose PII (email, wallet_address of non-self).
- Webhook signature is verified with a constant-time compare before any DB write.

## Contract

See `contracts/README.md` for the deploy + role-grant recipe and badge registry conventions.
