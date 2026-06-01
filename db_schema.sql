-- ==========================================
-- SCHEMA DEFINITIVO — MYRPG
-- Execute no Supabase SQL Editor
-- ==========================================

-- EXTENSÕES
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- LIMPEZA (ordem importa por causa de FK)
DROP TABLE IF EXISTS public.mural_connections CASCADE;
DROP TABLE IF EXISTS public.mural_cards CASCADE;
DROP TABLE IF EXISTS public.murals CASCADE;
DROP TABLE IF EXISTS public.diary_entries CASCADE;
DROP TABLE IF EXISTS public.journey_blocks CASCADE;
DROP TABLE IF EXISTS public.journey_days CASCADE;
DROP TABLE IF EXISTS public.maps CASCADE;
DROP TABLE IF EXISTS public.supplies CASCADE;
DROP TABLE IF EXISTS public.npcs CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;
DROP TABLE IF EXISTS public.players CASCADE;
DROP TABLE IF EXISTS public.campaign CASCADE;

-- ==========================================
-- TABELAS
-- ==========================================

CREATE TABLE public.campaign (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name          TEXT NOT NULL,
  current_day   INTEGER DEFAULT 1,
  active_block_index INTEGER DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.players (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id   UUID REFERENCES public.campaign(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  player_name   TEXT,
  player_class  TEXT,
  player_level  INTEGER DEFAULT 1,
  class_level   TEXT,
  class         TEXT NOT NULL,
  status        TEXT DEFAULT 'Saudável',
  exhaustion    INTEGER DEFAULT 0,
  hp            INTEGER DEFAULT 10,
  max_hp        INTEGER DEFAULT 10,
  gold          INTEGER DEFAULT 0,
  rations       INTEGER DEFAULT 0,
  notes         TEXT DEFAULT '',
  image_url     TEXT,
  attributes    JSONB DEFAULT '{}'::jsonb,
  skills        JSONB DEFAULT '{}'::jsonb,
  inventory     JSONB DEFAULT '[]'::jsonb,
  is_dead       BOOLEAN DEFAULT false,
  is_transformed BOOLEAN DEFAULT false,
  transformation JSONB,
  race          TEXT,
  str           INTEGER DEFAULT 10,
  dex           INTEGER DEFAULT 10,
  con           INTEGER DEFAULT 10,
  int           INTEGER DEFAULT 10,
  wis           INTEGER DEFAULT 10,
  cha           INTEGER DEFAULT 10,
  hp_max        INTEGER DEFAULT 0,
  hp_current    INTEGER DEFAULT 0,
  ac            TEXT,
  initiative    TEXT,
  speed         TEXT,
  perception    TEXT,
  hd_total      TEXT,
  prof_bonus    TEXT,
  inspiration   BOOLEAN DEFAULT false,
  saves         JSONB DEFAULT '[]'::jsonb,
  attacks       JSONB DEFAULT '[]'::jsonb,
  is_sleeping_action BOOLEAN DEFAULT false,
  exhaustion_level INTEGER DEFAULT 0,
  min_sleep_req INTEGER DEFAULT 8,
  created_at    TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.profiles (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email         TEXT NOT NULL,
  display_name  TEXT,
  role          TEXT DEFAULT 'player' CHECK (role IN ('gm', 'player')),
  player_id     UUID REFERENCES public.players(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.npcs (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id   UUID REFERENCES public.campaign(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  title         TEXT,
  type          TEXT DEFAULT 'npc',
  class         TEXT,
  status        TEXT DEFAULT 'Neutro',
  location      TEXT DEFAULT '',
  notes         TEXT DEFAULT '',
  image_url     TEXT,
  attributes    JSONB DEFAULT '{}'::jsonb,
  skills        JSONB DEFAULT '{}'::jsonb,
  is_hidden     BOOLEAN DEFAULT false,
  is_dead       BOOLEAN DEFAULT false,
  is_transformed BOOLEAN DEFAULT false,
  transformation JSONB,
  faction       TEXT DEFAULT 'neutral',
  race          TEXT,
  alignment     TEXT,
  cr            TEXT,
  str           INTEGER DEFAULT 10,
  dex           INTEGER DEFAULT 10,
  con           INTEGER DEFAULT 10,
  int           INTEGER DEFAULT 10,
  wis           INTEGER DEFAULT 10,
  cha           INTEGER DEFAULT 10,
  hp_max        INTEGER DEFAULT 0,
  hp_current    INTEGER DEFAULT 0,
  ac            TEXT,
  initiative    TEXT,
  speed         TEXT,
  perception    TEXT,
  main_attack   TEXT,
  resistances   TEXT,
  immunities    TEXT,
  actions       TEXT,
  motivation    TEXT,
  secrets       TEXT,
  traits        TEXT,
  items_visible TEXT,
  items_hidden  TEXT,
  has_spells    BOOLEAN DEFAULT false,
  spell_slots   JSONB DEFAULT '{}'::jsonb,
  spell_slots_used JSONB DEFAULT '{}'::jsonb,
  created_at    TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.supplies (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id   UUID REFERENCES public.campaign(id) ON DELETE CASCADE UNIQUE,
  water         INTEGER DEFAULT 0,
  food          INTEGER DEFAULT 0,
  people        INTEGER DEFAULT 0,
  last_updated  TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.maps (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id   UUID REFERENCES public.campaign(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  image_url     TEXT,
  is_visible    BOOLEAN DEFAULT false,
  created_at    TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.journey_days (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id   UUID REFERENCES public.campaign(id) ON DELETE CASCADE,
  day_number    INTEGER NOT NULL,
  weather       TEXT DEFAULT 'Ensolarado',
  events        TEXT DEFAULT '',
  created_at    TIMESTAMPTZ DEFAULT now(),
  UNIQUE(campaign_id, day_number)
);

CREATE TABLE public.journey_blocks (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  day_id        UUID REFERENCES public.journey_days(id) ON DELETE CASCADE,
  block_index   INTEGER NOT NULL,
  weather       TEXT DEFAULT 'clear',
  weather_effect TEXT DEFAULT 'clear',
  timeline      JSONB DEFAULT '[]'::jsonb,
  plots         JSONB DEFAULT '[]'::jsonb,
  sidequests    JSONB DEFAULT '[]'::jsonb,
  player_sessions JSONB DEFAULT '{}'::jsonb,
  created_at    TIMESTAMPTZ DEFAULT now(),
  UNIQUE(day_id, block_index)
);

CREATE TABLE public.diary_entries (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id   UUID REFERENCES public.campaign(id) ON DELETE CASCADE,
  title         TEXT NOT NULL,
  content       TEXT DEFAULT '',
  day_number    INTEGER,
  session_number INTEGER,
  session_title TEXT,
  author_id     TEXT,
  author_name   TEXT,
  image_url     TEXT,
  likes         JSONB DEFAULT '[]'::jsonb,
  comments      JSONB DEFAULT '[]'::jsonb,
  created_by    UUID REFERENCES auth.users(id),
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.murals (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name          TEXT NOT NULL,
  pan_x         FLOAT DEFAULT 0,
  pan_y         FLOAT DEFAULT 0,
  zoom          FLOAT DEFAULT 1,
  created_at    TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.mural_cards (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  mural_id      UUID REFERENCES public.murals(id) ON DELETE CASCADE,
  title         TEXT NOT NULL,
  content       TEXT DEFAULT '',
  type          TEXT DEFAULT 'note',
  position_x    FLOAT DEFAULT 0,
  position_y    FLOAT DEFAULT 0,
  width         FLOAT DEFAULT 200,
  height        FLOAT DEFAULT 120,
  color         TEXT DEFAULT '#2A2A35',
  created_at    TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.mural_connections (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  mural_id      UUID REFERENCES public.murals(id) ON DELETE CASCADE,
  from_card_id  UUID REFERENCES public.mural_cards(id) ON DELETE CASCADE,
  to_card_id    UUID REFERENCES public.mural_cards(id) ON DELETE CASCADE,
  label         TEXT DEFAULT '',
  color         TEXT DEFAULT '#646CFF',
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- ==========================================
-- RLS
-- ==========================================

ALTER TABLE public.profiles         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.players          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.npcs             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplies         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maps             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journey_days     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journey_blocks   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.diary_entries    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.murals           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mural_cards      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mural_connections ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- FUNÇÃO AUXILIAR is_gm()
-- ==========================================

CREATE OR REPLACE FUNCTION public.is_gm()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'gm'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==========================================
-- POLICIES
-- ==========================================

-- PROFILES
CREATE POLICY "Leitura global de perfis"       ON profiles FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Auth insere perfil"             ON profiles FOR INSERT WITH CHECK (id = auth.uid());
CREATE POLICY "Jogador atualiza proprio perfil" ON profiles FOR UPDATE USING (id = auth.uid());
CREATE POLICY "GM gerencia perfis"             ON profiles FOR ALL    USING (public.is_gm());

-- NPCS
CREATE POLICY "GM gerencia NPCs"               ON npcs FOR ALL    USING (public.is_gm());
CREATE POLICY "Jogadores leem NPCs visiveis"   ON npcs FOR SELECT USING (is_hidden = FALSE OR public.is_gm());

-- PLAYERS
CREATE POLICY "Leitura global de jogadores"    ON players FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "GM gerencia jogadores"          ON players FOR ALL    USING (public.is_gm());
CREATE POLICY "Jogador edita propria ficha"    ON players FOR UPDATE USING (
  id = (SELECT player_id FROM profiles WHERE id = auth.uid())
);

-- CAMPAIGN, JOURNEY_DAYS, JOURNEY_BLOCKS, SUPPLIES, MAPS
CREATE POLICY "Leitura global campanha"        ON campaign       FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "GM gerencia campanha"           ON campaign       FOR ALL    USING (public.is_gm());

CREATE POLICY "Leitura global dias"            ON journey_days   FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "GM gerencia dias"               ON journey_days   FOR ALL    USING (public.is_gm());

CREATE POLICY "Leitura global blocos"          ON journey_blocks FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "GM gerencia blocos"             ON journey_blocks FOR ALL    USING (public.is_gm());

CREATE POLICY "Leitura global suprimentos"     ON supplies       FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "GM gerencia suprimentos"        ON supplies       FOR ALL    USING (public.is_gm());

CREATE POLICY "Leitura global mapas"           ON maps           FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "GM gerencia mapas"              ON maps           FOR ALL    USING (public.is_gm());

-- COLABORATIVOS (todos autenticados)
CREATE POLICY "Acesso total diarios"           ON diary_entries      FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "Acesso total murais"            ON murals             FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "Acesso total mural_cards"       ON mural_cards        FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "Acesso total mural_connections" ON mural_connections  FOR ALL USING (auth.uid() IS NOT NULL);

-- ==========================================
-- TRIGGER: cria profile automaticamente no signup
-- ==========================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name, role, player_id)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1), 'Jogador'),
    COALESCE(new.raw_user_meta_data->>'role', 'player'),
    NULL
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- ==========================================
-- RPC: merge_player_session
-- ==========================================

CREATE OR REPLACE FUNCTION merge_player_session(
  p_block_id    uuid,
  p_player_id   text,
  p_session_data jsonb
)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  -- Valida que o player_id pertence ao usuário autenticado
  IF p_player_id != (
    SELECT player_id::text FROM profiles WHERE id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Não autorizado. Apenas o dono do personagem pode salvar.';
  END IF;

  UPDATE journey_blocks
  SET player_sessions =
    COALESCE(player_sessions, '{}'::jsonb) ||
    jsonb_build_object(p_player_id, p_session_data)
  WHERE id = p_block_id;
END;
$$;

-- ==========================================
-- RPC: reset_campaign
-- ==========================================

CREATE OR REPLACE FUNCTION reset_campaign()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NOT public.is_gm() THEN
    RAISE EXCEPTION 'Não autorizado';
  END IF;

  DELETE FROM mural_connections;
  DELETE FROM mural_cards;
  DELETE FROM murals;
  DELETE FROM diary_entries;
  DELETE FROM maps;
  DELETE FROM supplies;
  DELETE FROM journey_blocks;
  DELETE FROM journey_days;
  DELETE FROM players;
  DELETE FROM npcs;
  DELETE FROM campaign;

  -- Recria estado base
  INSERT INTO public.campaign (name, current_day, active_block_index)
    VALUES ('Campanha MyRPG', 1, 0);

  INSERT INTO public.murals (name)
    VALUES ('Quadro de Investigação');

  INSERT INTO public.journey_days (campaign_id, day_number, weather, events)
    SELECT id, 1, 'Ensolarado', 'O início da jornada.' FROM public.campaign LIMIT 1;
END;
$$;

-- ==========================================
-- BACKFILL: usuários já existentes ganham profile
-- ==========================================

INSERT INTO public.profiles (id, email, display_name, role)
SELECT
  id,
  email,
  COALESCE(raw_user_meta_data->>'display_name', split_part(email, '@', 1), 'Jogador'),
  COALESCE(raw_user_meta_data->>'role', 'player')
FROM auth.users
ON CONFLICT (id) DO NOTHING;

-- ==========================================
-- SEED INICIAL
-- ==========================================

INSERT INTO public.campaign (name, current_day, active_block_index)
SELECT 'Campanha MyRPG', 1, 0
WHERE NOT EXISTS (SELECT 1 FROM public.campaign);

INSERT INTO public.murals (name)
SELECT 'Quadro de Investigação'
WHERE NOT EXISTS (SELECT 1 FROM public.murals);

INSERT INTO public.journey_days (campaign_id, day_number, weather, events)
SELECT id, 1, 'Ensolarado', 'O início da jornada.'
FROM public.campaign
WHERE NOT EXISTS (SELECT 1 FROM public.journey_days);
