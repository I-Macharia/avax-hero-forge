## Goal

Apply the goals visible at the end of that ChatGPT thread to this project: rename the app to **Avax Hero Forge** and do a focused quality pass — stronger typing, React render perf, accessibility, meaningful docs, more reusable components, and a codebase that survives future cohorts without rewrites. No new features.

## 1. Rebrand → Avax Hero Forge

- `src/routes/__root.tsx`: update `head()` title/description/og:title/og:description and any hard-coded "MiniHack Heroes" strings.
- `src/routes/auth.tsx`, `src/components/SiteHeader.tsx`, `src/components/SiteFooter.tsx`, `src/routes/index.tsx`, dashboard/profile/quests/leaderboard/admin route heads: replace user-facing "MiniHack Heroes" with "Avax Hero Forge".
- `README.md`, `.env.example`, `contracts/README.md`: same rename, plus a one-liner explaining the project vision.
- Contract stays `MiniHackAchievement` on-chain (already deployed shape); only display name changes.
- Keep the gradient/logo mark; only wordmark text changes.

## 2. Strengthen typing

- Remove `any`/loose casts in `src/lib/tally.functions.ts` (`TallyFieldLike`), `src/lib/admin-mint.functions.ts`, `src/routes/api/public/tally-webhook.ts` — replace with discriminated unions for Tally field values and Zod parses at boundaries.
- Type `useRoles` return as `app_role[]` (from generated `Database` enum) instead of `string[]`.
- Tighten server-fn `inputValidator` schemas so callers get inferred argument types instead of `unknown`.
- Turn on `noUncheckedIndexedAccess` in `tsconfig.json` if it isn't already, and fix the fallout inside touched files only (don't sweep the whole repo in one pass).

## 3. React render perf

- Quests / Leaderboard / Admin pages: memoize derived lists (filter/sort/search) with `useMemo`, extract row components and wrap with `memo` so search typing doesn't re-render every row.
- Replace inline object/array props in hot lists (`style={{}}`, `onClick={() => ...}`) with stable handlers via `useCallback` where they cross a `memo` boundary.
- Ensure TanStack Query calls use `queryOptions` + `useSuspenseQuery` in loaders (per project conventions) instead of `useQuery` + `isLoading` spinners on the initial render.

## 4. Accessibility

- Auth form: add `<label htmlFor>` for every input, `aria-invalid` on errors, `aria-live="polite"` region for toast fallback text.
- Site header nav: `<nav aria-label="Primary">`, current route gets `aria-current="page"`.
- Icon-only buttons (mint, transfer, resync) get `aria-label`.
- Leaderboard table: real `<table>`/`<thead>`/`<th scope="col">` semantics + `<caption class="sr-only">`.
- Track pip dots get `role="img" aria-label="Payments quest complete"` etc.
- Confirm color contrast on track pill colors against the dark bg; adjust tokens in `src/styles.css` only if a pill fails WCAG AA.

## 5. Documentation that helps future cohorts

- Rewrite `README.md`: project vision, architecture diagram (routes / server fns / contract / Tally), local dev, env vars, "how to run a new cohort" checklist (set week/track on quests, register badges, grant MINTER_ROLE, point Tally webhooks).
- `contracts/README.md`: deploy + `MINTER_ROLE` grant recipe, upgrade notes, badge registry conventions.
- `AGENTS.md`: keep concise conventions for the next AI/dev contributor (server-fn placement, RLS invariants, no client-side minting).
- Add short JSDoc to every exported server function (`admin-mint.functions.ts`, `admin.functions.ts`, `tally.functions.ts`) describing auth guard, side effects, and failure modes.

## 6. Reusable components

Extract from the current pages into `src/components/`:
- `StatsStrip` — the shared header stats used on Quests + Leaderboard.
- `TrackPill` and `WeekPill` — currently inline in quest cards.
- `AvatarStack` — respondent avatars on quest cards.
- `TabToggle` — the Quests/Leaderboard toggle.
- `EmptyState` — used by admin tabs (no submissions, no completions).
- `AsyncButton` — button + pending state + toast wiring used across admin mint/transfer/resync.

Refactor the three pages to consume them; no visual change intended.

## 7. Cleanup / consistency

- Delete stubs that no longer do anything (`src/lib/mints.functions.ts` is a comment-only file — remove and delete its imports).
- Consolidate contract config (`src/lib/contract/config.ts`, `abi.ts`, `client.ts`) so the address and chain id are read from one place.
- Verify every `public` table touched still has explicit `GRANT`s and RLS enabled — no schema changes, just an audit note in `.lovable/plan.md`.

## Out of scope

- No new features, no new tables, no contract redeploy, no Tally re-integration work.
- No color/typography redesign — this is a code-quality pass, not a visual redesign.

## Technical notes

- All work is frontend + docs + typing; no migrations, no new secrets.
- After the rename, do a repo grep for "MiniHack Heroes" to catch any missed string; leave on-chain identifiers untouched.
- Verify with `tsgo` after the typing pass and a quick Playwright smoke of `/`, `/auth`, `/quests`, `/leaderboard` to confirm no regressions.
