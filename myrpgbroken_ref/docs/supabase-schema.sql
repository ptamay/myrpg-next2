-- ==========================================
-- MyRPG Next - Supabase Schema
-- Run this in your Supabase SQL Editor
-- ==========================================

-- 1. Tabelas
-- Usuários e Roles
CREATE TABLE profiles (
  id UUID REFERENCES auth.users PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  display_name TEXT,
  role TEXT NOT NULL CHECK (role IN ('gm', 'player')),
  player_id TEXT,          -- FK para players.id (se role = 'player')
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Campanha (singleton por ora)
CREATE TABLE campaign (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  current_day INT DEFAULT 1,
  active_block_index INT DEFAULT 0,  -- 0-5 (blocos de tempo)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Jogadores (fichas de personagem)
CREATE TABLE players (
  id TEXT PRIMARY KEY,
  campaign_id UUID REFERENCES campaign(id),
  name TEXT NOT NULL,              -- Nome do personagem
  player_name TEXT,                -- Nome real do jogador
  player_email TEXT,               -- Email para convite via Magic Link
  class_level TEXT,
  player_class TEXT,
  player_level INT,
  race TEXT,
  str INT, dex INT, con INT, int INT, wis INT, cha INT,
  hp_max INT,
  hp_current INT,
  ac TEXT,
  initiative TEXT,
  speed TEXT,
  perception TEXT,
  hd_total TEXT,
  prof_bonus TEXT,
  inspiration BOOLEAN DEFAULT FALSE,
  saves JSONB,                     -- string[]
  skills JSONB,                    -- string[]
  attacks JSONB,                   -- { name, bonus, dmg }[]
  image_url TEXT,                  -- Supabase Storage URL
  is_dead BOOLEAN DEFAULT FALSE,
  is_sleeping_action BOOLEAN DEFAULT FALSE,
  exhaustion_level INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- NPCs
CREATE TABLE npcs (
  id TEXT PRIMARY KEY,
  campaign_id UUID REFERENCES campaign(id),
  name TEXT,
  title TEXT,
  faction TEXT,
  race TEXT,
  alignment TEXT,
  cr TEXT,
  str INT, dex INT, con INT, int INT, wis INT, cha INT,
  hp_max INT,
  hp_current INT,
  temp_hp INT DEFAULT 0,
  ac TEXT,
  temp_ac INT DEFAULT 0,
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
  notes TEXT,
  has_spells BOOLEAN DEFAULT FALSE,
  spell_slots JSONB,               -- Record<number, number>
  spell_slots_used JSONB,          -- Record<number, number>
  temp_conditions JSONB,           -- string[]
  temp_resistances JSONB,          -- string[]
  is_dead BOOLEAN DEFAULT FALSE,
  is_hidden BOOLEAN DEFAULT FALSE, -- Oculto dos jogadores
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Jornada: dias
CREATE TABLE journey_days (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES campaign(id),
  day_number INT NOT NULL,
  UNIQUE(campaign_id, day_number)
);

-- Jornada: blocos de tempo (6 por dia)
CREATE TABLE journey_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  day_id UUID REFERENCES journey_days(id),
  block_index INT NOT NULL,         -- 0-5
  weather TEXT,
  weather_effect TEXT,
  timeline JSONB DEFAULT '[]',      -- TimelineEvent[]
  plots JSONB DEFAULT '[]',         -- Plot[]
  sidequests JSONB DEFAULT '[]',    -- SideQuest[]
  player_sessions JSONB DEFAULT '{}', -- Record<playerId, PlayerSession>
  UNIQUE(day_id, block_index)
);

-- Suprimentos (água e comida)
CREATE TABLE supplies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES campaign(id) UNIQUE,
  water INT DEFAULT 0,
  food INT DEFAULT 0,
  people INT DEFAULT 0,
  consumption_rate INT DEFAULT 1,
  history JSONB DEFAULT '[]'       -- SupplyHistoryEntry[]
);

-- Mapas (metadados — imagem fica no Storage)
CREATE TABLE maps (
  id TEXT PRIMARY KEY,
  campaign_id UUID REFERENCES campaign(id),
  name TEXT NOT NULL,
  storage_path TEXT NOT NULL,      -- Supabase Storage path
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Diário de Bordo
CREATE TABLE diary_entries (
  id TEXT PRIMARY KEY,
  campaign_id UUID REFERENCES campaign(id),
  session_number INT,
  session_title TEXT,
  author_id TEXT,                  -- player.id ou 'gm'
  author_name TEXT,
  content TEXT,
  image_url TEXT,
  likes JSONB DEFAULT '[]',        -- string[] (authorIds)
  comments JSONB DEFAULT '[]',     -- DiaryComment[]
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Murais de Investigação (slots 1-6)
CREATE TABLE murals (
  id TEXT PRIMARY KEY,             -- 'slot-1' a 'slot-6'
  campaign_id UUID REFERENCES campaign(id),
  name TEXT,
  background_style TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE mural_cards (
  id TEXT PRIMARY KEY,
  mural_id TEXT REFERENCES murals(id),
  campaign_id UUID REFERENCES campaign(id),
  type TEXT,
  title TEXT,
  content TEXT,
  image_url TEXT,
  ref_id TEXT,
  pos_x FLOAT,
  pos_y FLOAT,
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE mural_connections (
  id TEXT PRIMARY KEY,
  mural_id TEXT REFERENCES murals(id),
  campaign_id UUID REFERENCES campaign(id),
  from_card_id TEXT,
  to_card_id TEXT,
  label TEXT,
  color TEXT
);

-- Anotações Pessoais dos Jogadores (NOVO — GM não vê)
CREATE TABLE player_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES campaign(id),
  player_id TEXT REFERENCES players(id),
  title TEXT NOT NULL,
  content TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Políticas de Segurança (RLS)
-- Habilitar RLS em todas as tabelas
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign ENABLE ROW LEVEL SECURITY;
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE npcs ENABLE ROW LEVEL SECURITY;
ALTER TABLE journey_days ENABLE ROW LEVEL SECURITY;
ALTER TABLE journey_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplies ENABLE ROW LEVEL SECURITY;
ALTER TABLE maps ENABLE ROW LEVEL SECURITY;
ALTER TABLE diary_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE murals ENABLE ROW LEVEL SECURITY;
ALTER TABLE mural_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE mural_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_notes ENABLE ROW LEVEL SECURITY;

-- Profiles: Todos os autenticados podem ler (necessário para as outras policies funcionarem)
CREATE POLICY "profiles_read_all" ON profiles FOR SELECT TO authenticated USING (TRUE);

-- Permitir que GMs atualizem perfis (para associar player_id ou alterar role)
CREATE POLICY "profiles_gm_update" ON profiles FOR UPDATE TO authenticated
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'gm');

-- Permitir que usuários atualizem seus próprios perfis (caso queiram alterar display_name, etc)
CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE TO authenticated
  USING (id = auth.uid());

-- Permitir que GMs excluam perfis (para a tela de gerenciamento de usuários)
CREATE POLICY "profiles_gm_delete" ON profiles FOR DELETE TO authenticated
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'gm');

-- NPCs: GM vê todos; Players NÃO veem is_hidden = true
CREATE POLICY "npcs_gm_all" ON npcs FOR ALL TO authenticated
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'gm');

CREATE POLICY "npcs_player_visible" ON npcs FOR SELECT TO authenticated
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'player'
    AND is_hidden = FALSE
  );

-- Anotações: somente o próprio jogador acessa (GM excluído)
CREATE POLICY "notes_own_only" ON player_notes FOR ALL TO authenticated
  USING (player_id = (SELECT player_id FROM profiles WHERE id = auth.uid()));

-- Players: GM pode tudo; Player lê todos, edita HP apenas do seu
CREATE POLICY "players_gm_all" ON players FOR ALL TO authenticated
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'gm');

CREATE POLICY "players_read_all" ON players FOR SELECT TO authenticated
  USING (TRUE);

CREATE POLICY "players_update_own" ON players FOR UPDATE TO authenticated
  USING (id = (SELECT player_id FROM profiles WHERE id = auth.uid()));

-- Journey days: GM escreve; Players apenas leem
CREATE POLICY "days_gm_write" ON journey_days FOR ALL TO authenticated
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'gm');

CREATE POLICY "days_player_read" ON journey_days FOR SELECT TO authenticated
  USING (TRUE);

-- Journey blocks: GM escreve; Players apenas leem
CREATE POLICY "blocks_gm_write" ON journey_blocks FOR ALL TO authenticated
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'gm');

CREATE POLICY "blocks_player_read" ON journey_blocks FOR SELECT TO authenticated
  USING (TRUE);

-- Campaign: GM controla; Players apenas leem
CREATE POLICY "campaign_gm_write" ON campaign FOR ALL TO authenticated
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'gm');

CREATE POLICY "campaign_player_read" ON campaign FOR SELECT TO authenticated
  USING (TRUE);
  
-- Supplies: GM controla; Players apenas leem
CREATE POLICY "supplies_gm_write" ON supplies FOR ALL TO authenticated
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'gm');

CREATE POLICY "supplies_player_read" ON supplies FOR SELECT TO authenticated
  USING (TRUE);

-- Maps: GM controla; Players apenas leem
CREATE POLICY "maps_gm_write" ON maps FOR ALL TO authenticated
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'gm');

CREATE POLICY "maps_player_read" ON maps FOR SELECT TO authenticated
  USING (TRUE);
  
-- Diary Entries: Todos leem, mas updates controlados (qualquer um insere, gm altera/deleta ou dono deleta)
CREATE POLICY "diary_all_read" ON diary_entries FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "diary_all_insert" ON diary_entries FOR INSERT TO authenticated WITH CHECK (TRUE);
CREATE POLICY "diary_gm_update_delete" ON diary_entries FOR UPDATE TO authenticated USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'gm');
CREATE POLICY "diary_gm_delete" ON diary_entries FOR DELETE TO authenticated USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'gm');
CREATE POLICY "diary_player_update_own" ON diary_entries FOR UPDATE TO authenticated USING (author_id = (SELECT player_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "diary_player_delete_own" ON diary_entries FOR DELETE TO authenticated USING (author_id = (SELECT player_id FROM profiles WHERE id = auth.uid()));

-- Murals: Todos os autenticados (GM e jogadores) podem ler e escrever para permitir colaboração
CREATE POLICY "murals_all_read" ON murals FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "murals_all_write" ON murals FOR ALL TO authenticated USING (TRUE);

CREATE POLICY "mural_cards_all_read" ON mural_cards FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "mural_cards_all_write" ON mural_cards FOR ALL TO authenticated USING (TRUE);

CREATE POLICY "mural_conn_all_read" ON mural_connections FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "mural_conn_all_write" ON mural_connections FOR ALL TO authenticated USING (TRUE);


-- 3. Inserir Campanha Padrão (necessário para FKs)
INSERT INTO campaign (id, name, current_day, active_block_index)
VALUES (gen_random_uuid(), 'Campanha MyRPG', 1, 0)
ON CONFLICT (id) DO NOTHING;

-- Trigger para convites (ON INSERT auth.users -> create profile se convidado)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name, role, player_id)
  VALUES (
    new.id,
    new.email,
    new.raw_user_meta_data->>'display_name',
    COALESCE(new.raw_user_meta_data->>'role', 'player'), -- Default player, ou player se convidado
    new.raw_user_meta_data->>'player_id'
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Criação de Storage Bucket para Mapas
INSERT INTO storage.buckets (id, name, public) VALUES ('maps', 'maps', true) ON CONFLICT (id) DO NOTHING;
-- Policy para maps storage
CREATE POLICY "Public Access maps" ON storage.objects FOR SELECT USING ( bucket_id = 'maps' );
CREATE POLICY "GM Upload maps" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'maps' AND (SELECT role FROM profiles WHERE id = auth.uid()) = 'gm');
CREATE POLICY "GM Delete maps" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'maps' AND (SELECT role FROM profiles WHERE id = auth.uid()) = 'gm');

-- Criação de Storage Bucket para Avatares/Imagens
INSERT INTO storage.buckets (id, name, public) VALUES ('images', 'images', true) ON CONFLICT (id) DO NOTHING;
CREATE POLICY "Public Access images" ON storage.objects FOR SELECT USING ( bucket_id = 'images' );
CREATE POLICY "GM Upload images" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'images' AND (SELECT role FROM profiles WHERE id = auth.uid()) = 'gm');
CREATE POLICY "GM Delete images" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'images' AND (SELECT role FROM profiles WHERE id = auth.uid()) = 'gm');

-- Fim do script
