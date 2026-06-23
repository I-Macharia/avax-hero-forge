
-- Lock down public reads on user-linked tables
DROP POLICY IF EXISTS "Attendance public read" ON public.attendance;
CREATE POLICY "Users see own attendance" ON public.attendance FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Mints public read" ON public.nft_mints;
DROP POLICY IF EXISTS "Users record own mint" ON public.nft_mints;
CREATE POLICY "Users see own mints" ON public.nft_mints FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Quest completions public read" ON public.quest_completions;
CREATE POLICY "Users see own completions" ON public.quest_completions FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- profiles: restrict to authenticated only (hides wallet addresses from anon)
DROP POLICY IF EXISTS "Profiles are public" ON public.profiles;
CREATE POLICY "Authenticated read profiles" ON public.profiles FOR SELECT TO authenticated USING (true);

-- Revoke anon read access on these tables
REVOKE SELECT ON public.attendance FROM anon;
REVOKE SELECT ON public.nft_mints FROM anon;
REVOKE SELECT ON public.quest_completions FROM anon;
REVOKE SELECT ON public.profiles FROM anon;

-- user_roles: explicit admin-only management policies (defence in depth)
CREATE POLICY "Admins insert roles" ON public.user_roles FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update roles" ON public.user_roles FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins delete roles" ON public.user_roles FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Lock SECURITY DEFINER functions
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

-- Public homepage stats RPC (aggregate counts only, no row data leak)
CREATE OR REPLACE FUNCTION public.get_public_stats()
RETURNS json
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT json_build_object(
    'participants', (SELECT count(*) FROM public.profiles),
    'nfts',         (SELECT count(*) FROM public.nft_mints),
    'quests',       (SELECT count(*) FROM public.quest_completions)
  )
$$;
REVOKE EXECUTE ON FUNCTION public.get_public_stats() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_stats() TO anon, authenticated;

-- Verified mint recorder (only callable by the server via service_role / SECURITY DEFINER).
-- Inserts a row in nft_mints only if the user has actually completed the quest.
CREATE OR REPLACE FUNCTION public.record_verified_mint(
  _user_id uuid,
  _quest_id uuid,
  _tx_hash text,
  _contract_address text,
  _chain_id integer,
  _token_id integer,
  _metadata_uri text
)
RETURNS public.nft_mints
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _row public.nft_mints;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.quest_completions WHERE user_id = _user_id AND quest_id = _quest_id) THEN
    RAISE EXCEPTION 'quest not completed';
  END IF;
  INSERT INTO public.nft_mints (user_id, quest_id, tx_hash, contract_address, chain_id, token_id, metadata_uri)
  VALUES (_user_id, _quest_id, _tx_hash, _contract_address, _chain_id, _token_id, _metadata_uri)
  RETURNING * INTO _row;
  RETURN _row;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.record_verified_mint(uuid, uuid, text, text, integer, integer, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_verified_mint(uuid, uuid, text, text, integer, integer, text) TO service_role;
