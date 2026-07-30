-- The "lock down public reads" migration (20260623183909) went further than
-- intended: it was meant to hide `profiles.wallet_address` from anonymous
-- visitors, but it also revoked SELECT on `profiles` entirely (breaking the
-- profiles JOIN inside leaderboard_view for anon), and it locked
-- `quest_completions` / `nft_mints` down to "owner only", even though both
-- the public `/leaderboard` page and the badge galleries (NFTGallery,
-- dashboard's "on-chain view", the leaderboard's "Recent minted badges")
-- are explicitly meant to show *everyone's* completions and mints, not just
-- the signed-in caller's own rows.
--
-- Net effect before this fix: an anonymous visitor to /leaderboard saw an
-- empty board (profiles unreadable), and a logged-in participant only ever
-- saw their own badges in any "public" gallery — quest artwork the app
-- explicitly wants visible to everyone was silently hidden by RLS.
--
-- This migration restores public readability for the genuinely public,
-- non-sensitive data (quest completions, NFT mint records — the mint's
-- owner_address/tx_hash are already public on-chain via the explorer link
-- shown next to every badge) while keeping the original privacy intent:
-- wallet_address is still never selectable by anon directly off `profiles`,
-- and leaderboard_view no longer exposes it at all.

-- 1. Quest completions: restore public read (needed for the leaderboard's
--    per-user track pips, computed across ALL users, not just the caller).
DROP POLICY IF EXISTS "Users see own completions" ON public.quest_completions;
CREATE POLICY "Quest completions public read" ON public.quest_completions
  FOR SELECT USING (true);
GRANT SELECT ON public.quest_completions TO anon, authenticated;

-- 2. NFT mints: restore public read (needed for NFTGallery's global view,
--    the dashboard's "on-chain view", and the leaderboard's "Recent minted
--    badges" — all of which intentionally query mints with no user filter).
DROP POLICY IF EXISTS "Users see own mints" ON public.nft_mints;
CREATE POLICY "Mints public read" ON public.nft_mints
  FOR SELECT USING (true);
GRANT SELECT ON public.nft_mints TO anon, authenticated;

-- 3. leaderboard_view: switch back to SECURITY DEFINER so it can read
--    `profiles` regardless of the caller's row-level access (needed for
--    anon), but explicitly drop wallet_address from its output — the one
--    piece of data the original migration was actually trying to protect.
DROP VIEW IF EXISTS public.leaderboard_view;
CREATE VIEW public.leaderboard_view
WITH (security_invoker = false)
AS
SELECT
  p.id AS user_id,
  p.display_name,
  p.avatar_url,
  COALESCE(qc.quest_points, 0) AS total_points,
  COALESCE(qc.quest_count, 0) AS quest_count,
  COALESCE(nm.nft_count, 0) AS nft_count,
  qc.last_activity
FROM public.profiles p
LEFT JOIN (
  SELECT c.user_id,
         SUM(q.points) AS quest_points,
         COUNT(*) AS quest_count,
         MAX(c.completed_at) AS last_activity
  FROM public.quest_completions c
  JOIN public.quests q ON q.id = c.quest_id
  GROUP BY c.user_id
) qc ON qc.user_id = p.id
LEFT JOIN (
  SELECT user_id, COUNT(*) AS nft_count FROM public.nft_mints GROUP BY user_id
) nm ON nm.user_id = p.id;
GRANT SELECT ON public.leaderboard_view TO anon, authenticated;

-- profiles itself stays authenticated-only (unchanged) — anon still cannot
-- read wallet_address, display_name, etc. directly off the table; the view
-- above is the only public surface, and it no longer carries wallet_address.
