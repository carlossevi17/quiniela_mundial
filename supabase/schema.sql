-- 1. Profiles (extending auth.users)
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL,
  display_name TEXT,
  is_admin BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Leagues
CREATE TABLE public.leagues (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  join_code TEXT UNIQUE NOT NULL,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. League Members
CREATE TABLE public.league_members (
  league_id INT REFERENCES public.leagues(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (league_id, user_id)
);

-- 4. Matches
CREATE TABLE public.matches (
  id SERIAL PRIMARY KEY,
  team_a TEXT NOT NULL,
  team_b TEXT NOT NULL,
  start_time TIMESTAMPTZ NOT NULL,
  score_a INT,
  score_b INT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'finished')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Predictions
CREATE TABLE public.predictions (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  match_id INT REFERENCES public.matches(id) ON DELETE CASCADE,
  league_id INT REFERENCES public.leagues(id) ON DELETE CASCADE,
  score_a INT NOT NULL,
  score_b INT NOT NULL,
  points INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, match_id, league_id)
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leagues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.league_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.predictions ENABLE ROW LEVEL SECURITY;

-- --- RLS Policies ---

-- Profiles
CREATE POLICY "Public profiles are viewable by everyone." ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert their own profile." ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update their own profile." ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Leagues
CREATE POLICY "Leagues viewable by everyone." ON public.leagues FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create leagues." ON public.leagues FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- League Members
CREATE POLICY "League members viewable by everyone." ON public.league_members FOR SELECT USING (true);
CREATE POLICY "Users can join leagues." ON public.league_members FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Matches
CREATE POLICY "Matches are viewable by everyone." ON public.matches FOR SELECT USING (true);
CREATE POLICY "Admins can insert matches." ON public.matches FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true));
CREATE POLICY "Admins can update matches." ON public.matches FOR UPDATE USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true));

-- Predictions
CREATE POLICY "Predictions viewable by owner or if match started." ON public.predictions FOR SELECT USING (
  auth.uid() = user_id OR
  EXISTS (SELECT 1 FROM public.matches WHERE id = match_id AND start_time <= NOW())
);
CREATE POLICY "Users can insert own predictions if match not started." ON public.predictions FOR INSERT WITH CHECK (
  auth.uid() = user_id AND 
  EXISTS (SELECT 1 FROM public.matches WHERE id = match_id AND start_time > NOW())
);
CREATE POLICY "Users can update own predictions if match not started." ON public.predictions FOR UPDATE USING (
  auth.uid() = user_id AND 
  EXISTS (SELECT 1 FROM public.matches WHERE id = match_id AND start_time > NOW())
);

-- --- Triggers & Functions ---

CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name)
  VALUES (new.id, new.email, split_part(new.email, '@', 1));
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

CREATE OR REPLACE FUNCTION public.calculate_prediction_points(
    real_a INT, real_b INT, pred_a INT, pred_b INT
) RETURNS INT AS $$
BEGIN
    IF real_a IS NULL OR real_b IS NULL THEN RETURN 0; END IF;
    IF real_a = pred_a AND real_b = pred_b THEN RETURN 3; END IF;
    IF (real_a > real_b AND pred_a > pred_b) OR
       (real_a < real_b AND pred_a < pred_b) OR
       (real_a = real_b AND pred_a = pred_b) THEN RETURN 1; END IF;
    RETURN 0;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

CREATE OR REPLACE FUNCTION public.trigger_update_match_points() RETURNS TRIGGER AS $$
BEGIN
    IF NEW.score_a IS DISTINCT FROM OLD.score_a OR NEW.score_b IS DISTINCT FROM OLD.score_b THEN
        UPDATE public.predictions
        SET points = public.calculate_prediction_points(NEW.score_a, NEW.score_b, score_a, score_b)
        WHERE match_id = NEW.id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_match_score_update AFTER UPDATE ON public.matches FOR EACH ROW EXECUTE FUNCTION public.trigger_update_match_points();

ALTER PUBLICATION supabase_realtime ADD TABLE public.matches;
ALTER PUBLICATION supabase_realtime ADD TABLE public.predictions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
