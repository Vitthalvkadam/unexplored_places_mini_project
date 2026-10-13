CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text,
  avatar_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles readable by signed in" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "own profile insert" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "own profile update" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, avatar_url)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email,'@',1)), NEW.raw_user_meta_data->>'avatar_url')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE TABLE public.places (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (char_length(name) BETWEEN 2 AND 120),
  category text NOT NULL CHECK (category IN ('waterfall','lake','viewpoint','trail','cave','scenic','attraction')),
  description text NOT NULL CHECK (char_length(description) BETWEEN 10 AND 3000),
  latitude double precision NOT NULL CHECK (latitude BETWEEN -90 AND 90),
  longitude double precision NOT NULL CHECK (longitude BETWEEN -180 AND 180),
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.places TO authenticated;
GRANT ALL ON public.places TO service_role;
ALTER TABLE public.places ENABLE ROW LEVEL SECURITY;
CREATE POLICY "places readable" ON public.places FOR SELECT TO authenticated USING (true);
CREATE POLICY "places insert own" ON public.places FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);
CREATE POLICY "places update own" ON public.places FOR UPDATE TO authenticated USING (auth.uid() = created_by);
CREATE POLICY "places delete own" ON public.places FOR DELETE TO authenticated USING (auth.uid() = created_by);

CREATE TABLE public.contributions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  place_id uuid NOT NULL REFERENCES public.places(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  photo_url text NOT NULL,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON public.contributions(place_id);
GRANT SELECT, INSERT, DELETE ON public.contributions TO authenticated;
GRANT ALL ON public.contributions TO service_role;
ALTER TABLE public.contributions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "contrib readable" ON public.contributions FOR SELECT TO authenticated USING (true);
CREATE POLICY "contrib insert own" ON public.contributions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "contrib delete own" ON public.contributions FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.enforce_contributor_limit() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE n int;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext(NEW.place_id::text));
  IF EXISTS (SELECT 1 FROM contributions WHERE place_id = NEW.place_id AND user_id = NEW.user_id) THEN
    RETURN NEW;
  END IF;
  SELECT count(DISTINCT user_id) INTO n FROM contributions WHERE place_id = NEW.place_id;
  IF n >= 5 THEN
    RAISE EXCEPTION 'CONTRIBUTOR_LIMIT: This place already has 5 contributors';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER contributions_limit BEFORE INSERT ON public.contributions FOR EACH ROW EXECUTE FUNCTION public.enforce_contributor_limit();

CREATE TABLE public.favorites (
  user_id uuid NOT NULL,
  place_id uuid NOT NULL REFERENCES public.places(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, place_id)
);
GRANT SELECT, INSERT, DELETE ON public.favorites TO authenticated;
GRANT ALL ON public.favorites TO service_role;
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fav own select" ON public.favorites FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "fav own insert" ON public.favorites FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "fav own delete" ON public.favorites FOR DELETE TO authenticated USING (auth.uid() = user_id);