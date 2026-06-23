
-- 1. Extend quests with Tally/track/week fields
ALTER TABLE public.quests
  ADD COLUMN IF NOT EXISTS track TEXT NOT NULL DEFAULT 'Payments',
  ADD COLUMN IF NOT EXISTS week INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS tally_form_id TEXT,
  ADD COLUMN IF NOT EXISTS tally_form_url TEXT,
  ADD COLUMN IF NOT EXISTS cover_image_url TEXT,
  ADD COLUMN IF NOT EXISTS auto_approve BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS locked BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS unlock_cohort INTEGER;

-- 2. Quest submissions (raw Tally events)
DO $$ BEGIN
  CREATE TYPE public.submission_status AS ENUM ('pending', 'approved', 'rejected');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.quest_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quest_id UUID NOT NULL REFERENCES public.quests(id) ON DELETE CASCADE,
  tally_submission_id TEXT UNIQUE NOT NULL,
  tally_response_id TEXT,
  respondent_email TEXT,
  respondent_name TEXT,
  respondent_wallet TEXT,
  matched_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  status public.submission_status NOT NULL DEFAULT 'pending',
  raw_payload JSONB,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.quest_submissions TO authenticated;
GRANT ALL ON public.quest_submissions TO service_role;
ALTER TABLE public.quest_submissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users see their own submissions" ON public.quest_submissions;
CREATE POLICY "Users see their own submissions" ON public.quest_submissions
  FOR SELECT TO authenticated
  USING (matched_user_id = auth.uid() OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'organizer'));

DROP POLICY IF EXISTS "Organizers manage submissions" ON public.quest_submissions;
CREATE POLICY "Organizers manage submissions" ON public.quest_submissions
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'organizer'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'organizer'));

CREATE INDEX IF NOT EXISTS idx_quest_submissions_quest ON public.quest_submissions(quest_id);
CREATE INDEX IF NOT EXISTS idx_quest_submissions_user ON public.quest_submissions(matched_user_id);

-- 3. Aggregated signup counts for quest cards (public, no PII)
CREATE OR REPLACE FUNCTION public.get_quest_signups()
RETURNS TABLE(quest_id UUID, signups BIGINT)
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT quest_id, COUNT(*)::BIGINT
  FROM public.quest_submissions
  GROUP BY quest_id
$$;
REVOKE ALL ON FUNCTION public.get_quest_signups() FROM public;
GRANT EXECUTE ON FUNCTION public.get_quest_signups() TO anon, authenticated;

-- 4. Owner address on mints (for admin transfers)
ALTER TABLE public.nft_mints
  ADD COLUMN IF NOT EXISTS owner_address TEXT;

-- 5. Replace record_verified_mint to accept owner_address
DROP FUNCTION IF EXISTS public.record_verified_mint(uuid, uuid, text, text, integer, integer, text);
CREATE OR REPLACE FUNCTION public.record_verified_mint(
  _user_id UUID,
  _quest_id UUID,
  _tx_hash TEXT,
  _contract_address TEXT,
  _chain_id INTEGER,
  _token_id INTEGER,
  _metadata_uri TEXT,
  _owner_address TEXT
)
RETURNS public.nft_mints
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _row public.nft_mints;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.quest_completions WHERE user_id = _user_id AND quest_id = _quest_id) THEN
    RAISE EXCEPTION 'quest not completed';
  END IF;
  INSERT INTO public.nft_mints (user_id, quest_id, tx_hash, contract_address, chain_id, token_id, metadata_uri, owner_address)
  VALUES (_user_id, _quest_id, _tx_hash, _contract_address, _chain_id, _token_id, _metadata_uri, _owner_address)
  RETURNING * INTO _row;
  RETURN _row;
END;
$$;
REVOKE ALL ON FUNCTION public.record_verified_mint(uuid, uuid, text, text, integer, integer, text, text) FROM public;
GRANT EXECUTE ON FUNCTION public.record_verified_mint(uuid, uuid, text, text, integer, integer, text, text) TO service_role;

-- 6. Rewrite leaderboard view: quests only
DROP VIEW IF EXISTS public.leaderboard_view;
CREATE VIEW public.leaderboard_view AS
SELECT
  p.id AS user_id,
  p.display_name,
  p.avatar_url,
  p.wallet_address,
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

-- 7. Extend public stats
CREATE OR REPLACE FUNCTION public.get_public_stats()
RETURNS JSON
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT json_build_object(
    'participants', (SELECT count(*) FROM public.profiles),
    'nfts',         (SELECT count(*) FROM public.nft_mints),
    'quests',       (SELECT count(*) FROM public.quests WHERE active),
    'completions',  (SELECT count(*) FROM public.quest_completions)
  )
$$;

-- 8. Update seeded quests with tracks/weeks (best-effort by slug)
UPDATE public.quests SET track = 'Payments', week = 1 WHERE slug IN ('full-attendance', 'session-streak');
UPDATE public.quests SET track = 'Gaming', week = 2 WHERE slug = 'quest-master';
UPDATE public.quests SET track = 'Agentic AI', week = 3 WHERE slug = 'community-builder';
UPDATE public.quests SET track = 'Payments', week = 1 WHERE slug = 'first-mint';
