
-- Enum for app roles
CREATE TYPE public.app_role AS ENUM ('admin', 'organizer', 'participant');

-- Profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_url TEXT,
  wallet_address TEXT,
  bio TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.profiles TO anon;
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Profiles are public" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "Users insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- User roles
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);

-- has_role security definer
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

-- Auto-create profile + participant role on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'participant');
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Sessions
CREATE TABLE public.sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  starts_at TIMESTAMPTZ NOT NULL,
  points INTEGER NOT NULL DEFAULT 10,
  location TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.sessions TO anon, authenticated;
GRANT ALL ON public.sessions TO service_role;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Sessions public read" ON public.sessions FOR SELECT USING (true);
CREATE POLICY "Organizers manage sessions" ON public.sessions FOR ALL USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'organizer')) WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'organizer'));

-- Attendance
CREATE TABLE public.attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  marked_by UUID REFERENCES auth.users(id),
  marked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, session_id)
);
GRANT SELECT ON public.attendance TO anon, authenticated;
GRANT ALL ON public.attendance TO service_role;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Attendance public read" ON public.attendance FOR SELECT USING (true);
CREATE POLICY "Organizers manage attendance" ON public.attendance FOR ALL USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'organizer')) WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'organizer'));

-- Quests
CREATE TABLE public.quests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  points INTEGER NOT NULL DEFAULT 50,
  badge_token_id INTEGER,
  icon TEXT,
  metadata_uri TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.quests TO anon, authenticated;
GRANT ALL ON public.quests TO service_role;
ALTER TABLE public.quests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Quests public read" ON public.quests FOR SELECT USING (true);
CREATE POLICY "Organizers manage quests" ON public.quests FOR ALL USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'organizer')) WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'organizer'));

-- Quest completions
CREATE TABLE public.quest_completions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  quest_id UUID NOT NULL REFERENCES public.quests(id) ON DELETE CASCADE,
  completed_by UUID REFERENCES auth.users(id),
  completed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, quest_id)
);
GRANT SELECT ON public.quest_completions TO anon, authenticated;
GRANT ALL ON public.quest_completions TO service_role;
ALTER TABLE public.quest_completions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Quest completions public read" ON public.quest_completions FOR SELECT USING (true);
CREATE POLICY "Organizers manage completions" ON public.quest_completions FOR ALL USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'organizer')) WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'organizer'));

-- NFT mints
CREATE TABLE public.nft_mints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  quest_id UUID REFERENCES public.quests(id) ON DELETE SET NULL,
  token_id BIGINT,
  tx_hash TEXT NOT NULL,
  contract_address TEXT NOT NULL,
  chain_id INTEGER NOT NULL DEFAULT 43113,
  metadata_uri TEXT,
  minted_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.nft_mints TO anon, authenticated;
GRANT INSERT ON public.nft_mints TO authenticated;
GRANT ALL ON public.nft_mints TO service_role;
ALTER TABLE public.nft_mints ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Mints public read" ON public.nft_mints FOR SELECT USING (true);
CREATE POLICY "Users record own mint" ON public.nft_mints FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Organizers manage mints" ON public.nft_mints FOR ALL USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'organizer')) WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'organizer'));

-- Leaderboard view
CREATE OR REPLACE VIEW public.leaderboard_view AS
SELECT
  p.id AS user_id,
  p.display_name,
  p.avatar_url,
  p.wallet_address,
  COALESCE(att.attendance_points, 0) AS attendance_points,
  COALESCE(att.session_count, 0) AS session_count,
  COALESCE(qc.quest_points, 0) AS quest_points,
  COALESCE(qc.quest_count, 0) AS quest_count,
  COALESCE(nm.nft_count, 0) AS nft_count,
  COALESCE(att.attendance_points, 0) + COALESCE(qc.quest_points, 0) AS total_points
FROM public.profiles p
LEFT JOIN (
  SELECT a.user_id, SUM(s.points) AS attendance_points, COUNT(*) AS session_count
  FROM public.attendance a JOIN public.sessions s ON s.id = a.session_id
  GROUP BY a.user_id
) att ON att.user_id = p.id
LEFT JOIN (
  SELECT c.user_id, SUM(q.points) AS quest_points, COUNT(*) AS quest_count
  FROM public.quest_completions c JOIN public.quests q ON q.id = c.quest_id
  GROUP BY c.user_id
) qc ON qc.user_id = p.id
LEFT JOIN (
  SELECT user_id, COUNT(*) AS nft_count FROM public.nft_mints GROUP BY user_id
) nm ON nm.user_id = p.id;
GRANT SELECT ON public.leaderboard_view TO anon, authenticated;

-- Seed quests
INSERT INTO public.quests (slug, title, description, points, badge_token_id, icon) VALUES
  ('full-attendance', 'Full Attendance Hero', 'Attend every MiniHack session', 200, 1, 'trophy'),
  ('quest-master', 'Quest Master', 'Complete 5 quests', 150, 2, 'sword'),
  ('session-streak', 'Session Streak', 'Attend 3 sessions in a row', 100, 3, 'flame'),
  ('first-mint', 'First Badge Minted', 'Mint your first on-chain badge', 50, 4, 'sparkles'),
  ('community-builder', 'Community Builder', 'Help a fellow hacker complete a quest', 75, 5, 'users');

-- Seed sessions
INSERT INTO public.sessions (title, description, starts_at, points, location) VALUES
  ('Kickoff: Avalanche 101', 'Intro to Avalanche & MiniHack rules', now() - interval '2 days', 10, 'Nairobi HQ'),
  ('Core Wallet Workshop', 'Hands-on with Core embedded wallets', now() - interval '1 day', 10, 'Nairobi HQ'),
  ('Build Day: L1 Deploy', 'Deploy your custom Avalanche L1', now() + interval '1 day', 15, 'Nairobi HQ'),
  ('Demo Day', 'Pitch your MiniHack project', now() + interval '3 days', 20, 'Nairobi HQ');
