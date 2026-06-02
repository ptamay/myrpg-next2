-- ==========================================
-- SCRIPT DE RECONSTRUÇÃO DEFINITIVA DO BANCO DE DADOS (MYRPG)
-- 
-- PASSO 1: Rode este script no SQL Editor do Supabase.
-- ATENÇÃO: Este script APAGA e RECRIA todas as tabelas do jogo.
-- ==========================================

-- 1. HABILITAR EXTENSÕES E LIMPEZA
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

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
-- 2. CRIAÇÃO DAS TABELAS
-- ==========================================

CREATE TABLE public.campaign (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  current_day INTEGER DEFAULT 1,
  active_block_index INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.players (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id UUID REFERENCES public.campaign(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  player_name TEXT,
  player_class TEXT,
  player_level INTEGER DEFAULT 1,
  class_level TEXT,
  race TEXT,
  str INTEGER DEFAULT 10,
  dex INTEGER DEFAULT 10,
  con INTEGER DEFAULT 10,
  int INTEGER DEFAULT 10,
  wis INTEGER DEFAULT 10,
  cha INTEGER DEFAULT 10,
  hp_max INTEGER DEFAULT 10,
  hp_current INTEGER DEFAULT 10,
  ac TEXT,
  initiative TEXT,
  speed TEXT,
  perception TEXT,
  hd_total TEXT,
  prof_bonus TEXT,
  inspiration BOOLEAN DEFAULT false,
  saves JSONB DEFAULT '[]'::jsonb,
  skills JSONB DEFAULT '[]'::jsonb,
  attacks JSONB DEFAULT '[]'::jsonb,
  image_url TEXT,
  is_dead BOOLEAN DEFAULT false,
  is_sleeping_action BOOLEAN DEFAULT false,
  exhaustion_level INTEGER DEFAULT 0,
  min_sleep_req INTEGER DEFAULT 8,
  
  -- Campos adicionais do schema do myrpgbroken
  class TEXT DEFAULT '',
  status TEXT DEFAULT 'Saudável',
  exhaustion INTEGER DEFAULT 0,
  hp INTEGER DEFAULT 10,
  max_hp INTEGER DEFAULT 10,
  gold INTEGER DEFAULT 0,
  rations INTEGER DEFAULT 0,
  notes TEXT DEFAULT '',
  
  is_transformed BOOLEAN DEFAULT false,
  transformation JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  display_name TEXT,
  role TEXT DEFAULT 'player' CHECK (role IN ('gm', 'player')),
  player_id UUID REFERENCES public.players(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.npcs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id UUID REFERENCES public.campaign(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  title TEXT,
  race TEXT,
  alignment TEXT,
  cr TEXT,
  str INTEGER DEFAULT 10,
  dex INTEGER DEFAULT 10,
  con INTEGER DEFAULT 10,
  int INTEGER DEFAULT 10,
  wis INTEGER DEFAULT 10,
  cha INTEGER DEFAULT 10,
  hp_max INTEGER DEFAULT 0,
  hp_current INTEGER DEFAULT 0,
  temp_hp INTEGER DEFAULT 0,
  ac TEXT,
  temp_ac INTEGER DEFAULT 0,
  initiative TEXT,
  speed TEXT,
  perception TEXT,
  main_attack TEXT,
  resistances TEXT,
  immunities TEXT,
  actions TEXT,
  motivation TEXT,
  secrets TEXT,
  traits TEXT,
  items_visible TEXT,
  items_hidden TEXT,
  has_spells BOOLEAN DEFAULT false,
  spell_slots JSONB DEFAULT '{}'::jsonb,
  spell_slots_used JSONB DEFAULT '{}'::jsonb,
  temp_conditions JSONB DEFAULT '[]'::jsonb,
  temp_resistances JSONB DEFAULT '[]'::jsonb,
  
  -- Campos adicionais do schema do myrpgbroken
  type TEXT DEFAULT 'npc',
  status TEXT DEFAULT 'Neutro',
  location TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  image_url TEXT,
  is_hidden BOOLEAN DEFAULT false,
  is_dead BOOLEAN DEFAULT false,
  is_transformed BOOLEAN DEFAULT false,
  transformation JSONB,
  faction TEXT DEFAULT 'neutral',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.supplies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id UUID REFERENCES public.campaign(id) ON DELETE CASCADE UNIQUE,
  water INTEGER DEFAULT 0,
  food INTEGER DEFAULT 0,
  people INTEGER DEFAULT 0,
  last_updated TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.maps (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id UUID REFERENCES public.campaign(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  image_url TEXT, 
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.journey_days (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id UUID REFERENCES public.campaign(id) ON DELETE CASCADE,
  day_number INTEGER NOT NULL,
  weather TEXT DEFAULT 'Ensolarado',
  events TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(campaign_id, day_number)
);

CREATE TABLE public.journey_blocks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  day_id UUID REFERENCES public.journey_days(id) ON DELETE CASCADE,
  block_index INTEGER NOT NULL,
  weather TEXT DEFAULT 'clear',
  weather_effect TEXT DEFAULT 'clear',
  timeline JSONB DEFAULT '[]'::jsonb,
  plots JSONB DEFAULT '[]'::jsonb,
  sidequests JSONB DEFAULT '[]'::jsonb,
  player_sessions JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(day_id, block_index)
);

CREATE TABLE public.diary_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  content TEXT DEFAULT '',
  day_number INTEGER,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.murals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.mural_cards (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  mural_id UUID REFERENCES public.murals(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT DEFAULT '',
  type TEXT DEFAULT 'note',
  position_x FLOAT DEFAULT 0,
  position_y FLOAT DEFAULT 0,
  color TEXT DEFAULT '#2A2A35',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.mural_connections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  mural_id UUID REFERENCES public.murals(id) ON DELETE CASCADE,
  from_card_id UUID REFERENCES public.mural_cards(id) ON DELETE CASCADE,
  to_card_id UUID REFERENCES public.mural_cards(id) ON DELETE CASCADE,
  label TEXT DEFAULT '',
  color TEXT DEFAULT '#646CFF',
  created_at TIMESTAMPTZ DEFAULT now()
);


-- ==========================================
-- 3. HABILITAR RLS
-- ==========================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.npcs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journey_days ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journey_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.diary_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.murals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mural_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mural_connections ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- 4. POLÍTICAS DE RLS (Com Função is_gm)
-- ==========================================

-- FUNÇÃO AUXILIAR PARA RLS
CREATE OR REPLACE FUNCTION public.is_gm()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'gm'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- PROFILES
CREATE POLICY "Leitura global de perfis" ON profiles FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "GM gerencia perfis" ON profiles FOR ALL USING (public.is_gm());
CREATE POLICY "Jogador atualiza proprio perfil" ON profiles FOR UPDATE USING (id = auth.uid());
CREATE POLICY "Auth insere perfil" ON profiles FOR INSERT WITH CHECK (id = auth.uid());

-- NPCS
CREATE POLICY "GM gerencia NPCs" ON npcs FOR ALL USING (public.is_gm());
CREATE POLICY "Jogadores leem NPCs visiveis" ON npcs FOR SELECT USING (is_hidden = FALSE OR public.is_gm());

-- PLAYERS
CREATE POLICY "Leitura global de jogadores" ON players FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "GM gerencia jogadores" ON players FOR ALL USING (public.is_gm());
CREATE POLICY "Jogador edita propria ficha" ON players FOR UPDATE USING (id = (SELECT player_id FROM profiles WHERE id = auth.uid()));

-- CAMPANHA E JORNADA
CREATE POLICY "Leitura global de campanha" ON campaign FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "GM gerencia campanha" ON campaign FOR ALL USING (public.is_gm());

CREATE POLICY "Leitura global de dias" ON journey_days FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "GM gerencia dias" ON journey_days FOR ALL USING (public.is_gm());

CREATE POLICY "Leitura global de blocos" ON journey_blocks FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "GM gerencia blocos" ON journey_blocks FOR ALL USING (public.is_gm());

CREATE POLICY "Leitura global de suprimentos" ON supplies FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "GM gerencia suprimentos" ON supplies FOR ALL USING (public.is_gm());

CREATE POLICY "Leitura global de mapas" ON maps FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "GM gerencia mapas" ON maps FOR ALL USING (public.is_gm());

-- MURAIS E DIARIOS (Colaborativo)
CREATE POLICY "Acesso total aos Diarios" ON diary_entries FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "Acesso total aos Murais" ON murals FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "Acesso total aos Cards" ON mural_cards FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "Acesso total as Conexoes" ON mural_connections FOR ALL USING (auth.uid() IS NOT NULL);


-- ==========================================
-- 5. FUNÇÕES E TRIGGERS DE AUTH
-- ==========================================

-- Trigger para criar perfil automaticamente no SignUp
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
-- 6. FUNÇÃO RPC MERGE_PLAYER_SESSION
-- ==========================================
CREATE OR REPLACE FUNCTION merge_player_session(
  p_block_id uuid, 
  p_player_id text, 
  p_session_data jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF p_player_id != (SELECT player_id::text FROM profiles WHERE id = auth.uid()) THEN
    RAISE EXCEPTION 'Não autorizado. Apenas o dono do personagem pode salvar esta sessão.';
  END IF;

  UPDATE journey_blocks
  SET player_sessions = COALESCE(player_sessions, '{}'::jsonb) || jsonb_build_object(p_player_id, p_session_data)
  WHERE id = p_block_id;
END;
$$;

-- ==========================================
-- 7. FUNÇÃO RESET_CAMPAIGN
-- ==========================================
CREATE OR REPLACE FUNCTION reset_campaign()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'gm') THEN
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
  
  -- Recria campanha limpa
  INSERT INTO public.campaign (name, current_day, active_block_index) VALUES ('Campanha MyRPG', 1, 0);
  INSERT INTO public.murals (name) VALUES ('Quadro de Investigação');
  INSERT INTO public.journey_days (campaign_id, day_number, weather, events) 
    SELECT id, 1, 'Ensolarado', 'O início da jornada.' FROM public.campaign LIMIT 1;
END;
$$;

-- ==========================================
-- 8. BACKFILL E SEED INICIAL
-- ==========================================

-- Popula profiles caso usuários antigos existam no auth.users
INSERT INTO public.profiles (id, email, display_name, role)
SELECT 
  id, 
  email, 
  COALESCE(raw_user_meta_data->>'display_name', split_part(email, '@', 1), 'Jogador'),
  COALESCE(raw_user_meta_data->>'role', 'player')
FROM auth.users
ON CONFLICT (id) DO NOTHING;

-- Seed da Campanha Base
INSERT INTO public.campaign (name, current_day, active_block_index)
SELECT 'Campanha MyRPG', 1, 0
WHERE NOT EXISTS (SELECT 1 FROM public.campaign);

-- Seed do Mural
INSERT INTO public.murals (name)
SELECT 'Quadro de Investigação'
WHERE NOT EXISTS (SELECT 1 FROM public.murals);

-- Seed do Primeiro Dia
INSERT INTO public.journey_days (campaign_id, day_number, weather, events)
SELECT id, 1, 'Ensolarado', 'O início da jornada.'
FROM public.campaign
WHERE NOT EXISTS (SELECT 1 FROM public.journey_days);
