-- Wire the real MiniHack quest curriculum to the actual badge artwork shipped
-- in /public/badges, replacing the 5 placeholder demo quests seeded at launch.
-- Badge IDs 1-17 are soulbound quest badges; 18-20 (leaderboard rank awards)
-- are intentionally NOT quest rows — they're awarded by an organizer via the
-- admin panel to the top 3 finishers at cohort end, not self-claimed.

-- 1. Retire the old placeholder quests instead of deleting them, so any
--    historical quest_completions / nft_mints rows that reference them by
--    FK remain valid. They're excluded from every "active" query already
--    used across the app (dashboard, admin dropdown, and now the quests page).
UPDATE public.quests
SET active = false
WHERE slug IN ('full-attendance', 'quest-master', 'session-streak', 'first-mint', 'community-builder');

-- 2. Upsert the real 17-quest catalog. badge_token_id matches the on-chain
--    registry IDs registered via scripts/register_badges.ts. cover_image_url
--    is a path relative to /public, resolved at render time by
--    resolveArtworkUrl() in BadgeCard.tsx (respects the Vite base path).
INSERT INTO public.quests (slug, title, description, points, badge_token_id, icon, track, week, cover_image_url, active)
VALUES
  ('w1s1-deploy-first-contract', 'Deploy Your First Contract', 'Deploy your first smart contract on Avalanche Fuji.', 50, 1, 'rocket', 'Payments', 1, 'badges/badge-01-w1s1-deploy-first-contract.png', true),
  ('w1s2-register-as-builder', 'Register as a Builder', 'Register as an official MiniHack builder.', 50, 2, 'wallet', 'Payments', 1, 'badges/badge-02-w1s2-register-as-builder.png', true),
  ('w2s3-build-and-submit', 'Build and Submit a Project', 'Build and submit your Week 2 project.', 50, 3, 'wrench', 'Payments', 2, 'badges/badge-03-w2s3-build-and-submit.png', true),
  ('w2s4-scaffold-foundry', 'Scaffold with Foundry', 'Scaffold a project using Foundry.', 50, 4, 'wrench', 'Payments', 2, 'badges/badge-04-w2s4-scaffold-foundry.png', true),
  ('w3s5-cluster-quest', 'Week 3 Session 5 Quest', 'Complete the Week 3 Session 5 challenge.', 50, 5, 'sparkles', 'Payments', 3, 'badges/badge-05-w3s5-cluster-quest.png', true),
  ('w3s6-complex-web-quest', 'Week 3 Session 6 Quest', 'Complete the Week 3 Session 6 challenge.', 50, 6, 'sparkles', 'Payments', 3, 'badges/badge-06-w3s6-complex-web-quest.png', true),
  ('w4-subnet-configuration', 'Advanced Subnet Configuration', 'Configure an advanced Avalanche subnet.', 60, 7, 'cpu', 'Payments', 4, 'badges/badge-07-w4-subnet-configuration.png', true),
  ('w5-cross-chain-communication', 'Cross-Chain Communication', 'Implement cross-chain messaging.', 60, 8, 'cpu', 'Payments', 5, 'badges/badge-08-w5-cross-chain-communication.png', true),
  ('gw5-game-loop-design', 'Game Loop Design', 'Design an on-chain game loop.', 60, 9, 'gamepad', 'Gaming', 5, 'badges/badge-09-gw5-game-loop-design.png', true),
  ('gw6-nft-integration', 'NFT Integration', 'Integrate NFTs into a blockchain game.', 60, 10, 'gamepad', 'Gaming', 6, 'badges/badge-10-gw6-nft-integration.png', true),
  ('gw7-leaderboard-contract', 'Leaderboard Contract', 'Build and deploy an on-chain leaderboard contract.', 70, 11, 'trophy', 'Gaming', 7, 'badges/badge-11-gw7-leaderboard-contract.png', true),
  ('aw9-agent-architecture', 'Agent Architecture', 'Design a robust agentic AI architecture.', 70, 12, 'brain', 'Agentic AI', 9, 'badges/badge-12-aw9-agent-architecture.png', true),
  ('aw10-on-chain-ai-action', 'On-Chain AI Action', 'Execute an on-chain AI action successfully.', 70, 13, 'brain', 'Agentic AI', 10, 'badges/badge-13-aw10-on-chain-ai-action.png', true),
  ('w10-decentralized-governance', 'Decentralized Governance', 'Implement a decentralized governance mechanism.', 70, 14, 'trophy', 'Payments', 10, 'badges/badge-14-w10-decentralized-governance.png', true),
  ('w11-production-deployment', 'Production Mainnet Deployment', 'Deploy a project to Avalanche mainnet.', 80, 15, 'rocket', 'Payments', 11, 'badges/badge-15-w11-production-deployment.png', true),
  ('aw12-product-demo', 'Agentic Product Demo', 'Deliver an agentic AI product demo.', 80, 16, 'brain', 'Agentic AI', 12, 'badges/badge-16-aw12-product-demo.png', true),
  ('final-capstone', 'Final Capstone: Master of the Forge', 'Complete the final MiniHack capstone project.', 150, 17, 'trophy', 'Payments', 13, 'badges/badge-17-final-capstone.png', true)
ON CONFLICT (slug) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  points = EXCLUDED.points,
  badge_token_id = EXCLUDED.badge_token_id,
  icon = EXCLUDED.icon,
  track = EXCLUDED.track,
  week = EXCLUDED.week,
  cover_image_url = EXCLUDED.cover_image_url,
  active = EXCLUDED.active;

-- 3. Harden the claim flow against double-mint races (e.g. a double click
--    before the button disables, or two tabs open). De-dupe any pre-existing
--    rows first (keeps the newest), then enforce uniqueness going forward.
DELETE FROM public.nft_mints a
USING public.nft_mints b
WHERE a.id < b.id
  AND a.user_id = b.user_id
  AND a.quest_id IS NOT NULL
  AND a.quest_id = b.quest_id;

ALTER TABLE public.nft_mints
  ADD CONSTRAINT nft_mints_user_quest_unique UNIQUE (user_id, quest_id);

-- 4. Make record_verified_mint idempotent: on a conflicting (user_id, quest_id)
--    pair, return the existing row instead of erroring, so a retried/duplicate
--    claim request is a safe no-op rather than a crash.
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
  ON CONFLICT (user_id, quest_id) DO NOTHING
  RETURNING * INTO _row;

  IF _row.id IS NULL THEN
    SELECT * INTO _row FROM public.nft_mints WHERE user_id = _user_id AND quest_id = _quest_id;
  END IF;

  RETURN _row;
END;
$$;
REVOKE ALL ON FUNCTION public.record_verified_mint(uuid, uuid, text, text, integer, integer, text, text) FROM public;
GRANT EXECUTE ON FUNCTION public.record_verified_mint(uuid, uuid, text, text, integer, integer, text, text) TO service_role;
