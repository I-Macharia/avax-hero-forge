## Goal

Redesign the Quests and Leaderboard pages to match the uploaded mocks, switch minting to an admin-only flow, and integrate Tally as the source of truth for quest submissions.

## 1. Tally integration (webhook + on-demand sync)

**New tables / columns**
- `quests`: add `tally_form_id text`, `tally_form_url text`, `week int`, `track text` (Payments / Gaming / Agentic AI), `cover_image_url text`.
- New table `quest_submissions` — one row per Tally response (separate from `quest_completions` which represents an approved/awarded completion):
  - `id`, `quest_id`, `tally_submission_id` (unique), `tally_response_id`, `respondent_email`, `respondent_name`, `raw_payload jsonb`, `submitted_at`, `matched_user_id uuid` (nullable, FK to profiles when we can match by email/wallet), `status` enum (`pending` / `approved` / `rejected`), `created_at`.
- RLS: `authenticated` read-only on `quest_submissions`; service role + admins/organizers write. GRANTs as required.

**Webhook endpoint** — `src/routes/api/public/tally-webhook.ts`
- Verifies `tally-signature` HMAC against `TALLY_WEBHOOK_SECRET`.
- Parses event, upserts `quest_submissions` keyed by `tally_submission_id`.
- Tries to match `respondent_email` to a `profiles` row → sets `matched_user_id`.
- Auto-creates a `quest_completions` row (so points flow into the leaderboard) when matched and quest is `auto_approve = true`.

**On-demand sync** — `src/lib/tally.functions.ts` server fn (admin-only):
- Hits `https://api.tally.so/forms/{form_id}/submissions` with `TALLY_API_KEY`.
- Pages through, upserts the same way as the webhook.
- Surfaced as a "Resync from Tally" button on each admin quest card.

Secrets requested in a follow-up turn: `TALLY_WEBHOOK_SECRET`, `TALLY_API_KEY`.

## 2. Admin-only mint + transfer (Avalanche Fuji)

**Contract changes** (`contracts/MiniHackAchievement.sol`)
- Remove soulbound `_update` override → badges become transferable.
- Keep `MINTER_ROLE`; add `adminTransfer(from, to, tokenId)` callable by `DEFAULT_ADMIN_ROLE` (uses `_update` bypassing approvals) so admins can reassign a wrongly-sent badge.
- Add `batchMintTo(address[] tos, uint256 badgeId, string uri)` to mint the same badge to many users in one tx.
- Bump ABI in `src/lib/contract/abi.ts` and add a fresh test in `contracts/test/`.

**Server-side signer**
- New `src/lib/mint.server.ts` — builds a viem `walletClient` from `privateKeyToAccount(process.env.ADMIN_MINTER_PRIVATE_KEY)` on Fuji. Loaded only inside handlers.
- New server fns in `src/lib/mints.functions.ts`:
  - `adminMintBadge({ questId, userIds[] })` — re-checks caller has `admin` or `organizer` role via `has_role`, fetches each user's `wallet_address`, calls `batchMintTo`, waits for receipt, records each mint via `record_verified_mint` RPC.
  - `adminTransferBadge({ mintId, toAddress })` — admin-only; calls `adminTransfer` on-chain and updates `nft_mints.owner_address`.
- Both fns short-circuit with a clear "Signer not configured" error when `ADMIN_MINTER_PRIVATE_KEY` is missing.
- Delete the old client-side `recordVerifiedMint` flow from `src/routes/_authenticated/quests.tsx` (users no longer mint).

## 3. Quests page redesign (`src/routes/_authenticated/quests.tsx`)

Match the screenshot:
- Header: "See who's tackling quests and where the leaderboard stands." + subhead.
- Stats strip: Quests count, Total quest completions, Participants (from `get_public_stats`, extended to return per-track stats).
- Filter chips: All / Payments / Gaming / Agentic AI.
- 3-column quest card grid (1 col mobile). Each card shows:
  - Track + Week pill, points pill top-right, cover icon/illustration.
  - Title, description.
  - "N signed up" + horizontal avatar stack of matched respondents (from `quest_submissions.matched_user_id`).
  - Black "Submit quest" CTA → opens the Tally form URL in a new tab.
  - For locked future weeks: dashed border + "Unlocks in Cohort {n}".
- Tabs ("Quests" / "Leaderboard") in the top right link to the two routes.

## 4. Leaderboard page redesign (`src/routes/_authenticated/leaderboard.tsx`)

Match the second screenshot:
- Same header + stats strip + tab toggle.
- Search input ("Search by name or email…").
- Table: Rank | Builder (avatar + name + email) | Quests (dot pips, one per completed quest, colored per track) | Points | Last Activity (relative time).
- Top 3 rows get tinted backgrounds (gold/silver/bronze).
- Source: rewrite `leaderboard_view` to aggregate purely from `quest_completions` joined to `quests.points`, plus `max(completed_at)` for last activity. Drop attendance from the math.

## 5. Admin panel additions (`src/routes/_authenticated/admin.tsx`)

- "Tally submissions" tab: pending `quest_submissions` with Approve / Reject / Resync.
- "Mint" tab: pick a quest → pick users with completions but no mint → "Mint to selected wallets" (calls `adminMintBadge`). Toast with Snowtrace link.
- "Transfer" tab: paste mint id + new wallet → `adminTransferBadge`.

## 6. Assets

- Pull the small badge/track illustrations into `src/assets/quests/` (placeholder SVGs already exist; replace with generated icons matching the mock palette — orange, lime, blue, pink).

## Technical notes

- `quest_submissions` and the new tally functions are the only place we touch Tally; everything else reads from our DB.
- `record_verified_mint` RPC stays but adds an `owner_address` column so admin transfers update it.
- All `process.env` reads stay inside handler bodies.
- Migration ordering: schema changes + GRANTs + RLS first → then redeploy contract → then set `VITE_CONTRACT_ADDRESS` + `ADMIN_MINTER_PRIVATE_KEY`.
- Quietly fix the SSR hydration error on the quests page while rewriting it (likely caused by `Date`/random in render).

## Follow-ups you'll handle

1. Add secrets `TALLY_WEBHOOK_SECRET`, `TALLY_API_KEY`, `ADMIN_MINTER_PRIVATE_KEY` when prompted next turn.
2. Redeploy the updated `MiniHackAchievement` contract on Fuji, grant `MINTER_ROLE` to the signer address, update `VITE_CONTRACT_ADDRESS`.
3. In Tally, point each form's webhook at `https://project--7c53adf8-58f2-410e-8630-2545e74325a0-dev.lovable.app/api/public/tally-webhook` (or the published URL once live).
