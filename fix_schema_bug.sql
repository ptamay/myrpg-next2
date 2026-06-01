-- ==========================================
-- CORREÇÃO DE ESQUEMA: TABELAS FALTANDO COLUNAS E AJUSTE DE UUID PARA TEXT
-- Execute este script no Supabase SQL Editor
-- ==========================================

-- 1. DIARY ENTRIES
ALTER TABLE public.diary_entries
  ADD COLUMN IF NOT EXISTS campaign_id UUID REFERENCES public.campaign(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS session_number INTEGER,
  ADD COLUMN IF NOT EXISTS session_title TEXT,
  ADD COLUMN IF NOT EXISTS author_id TEXT,
  ADD COLUMN IF NOT EXISTS author_name TEXT,
  ADD COLUMN IF NOT EXISTS image_url TEXT,
  ADD COLUMN IF NOT EXISTS likes JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS comments JSONB DEFAULT '[]'::jsonb;

-- 2. NPCS
ALTER TABLE public.npcs
  ADD COLUMN IF NOT EXISTS title TEXT,
  ADD COLUMN IF NOT EXISTS race TEXT,
  ADD COLUMN IF NOT EXISTS alignment TEXT,
  ADD COLUMN IF NOT EXISTS cr TEXT,
  ADD COLUMN IF NOT EXISTS str INTEGER DEFAULT 10,
  ADD COLUMN IF NOT EXISTS dex INTEGER DEFAULT 10,
  ADD COLUMN IF NOT EXISTS con INTEGER DEFAULT 10,
  ADD COLUMN IF NOT EXISTS int INTEGER DEFAULT 10,
  ADD COLUMN IF NOT EXISTS wis INTEGER DEFAULT 10,
  ADD COLUMN IF NOT EXISTS cha INTEGER DEFAULT 10,
  ADD COLUMN IF NOT EXISTS hp_max INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS hp_current INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ac TEXT,
  ADD COLUMN IF NOT EXISTS initiative TEXT,
  ADD COLUMN IF NOT EXISTS speed TEXT,
  ADD COLUMN IF NOT EXISTS perception TEXT,
  ADD COLUMN IF NOT EXISTS main_attack TEXT,
  ADD COLUMN IF NOT EXISTS resistances TEXT,
  ADD COLUMN IF NOT EXISTS immunities TEXT,
  ADD COLUMN IF NOT EXISTS actions TEXT,
  ADD COLUMN IF NOT EXISTS motivation TEXT,
  ADD COLUMN IF NOT EXISTS secrets TEXT,
  ADD COLUMN IF NOT EXISTS traits TEXT,
  ADD COLUMN IF NOT EXISTS items_visible TEXT,
  ADD COLUMN IF NOT EXISTS items_hidden TEXT,
  ADD COLUMN IF NOT EXISTS has_spells BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS spell_slots JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS spell_slots_used JSONB DEFAULT '{}'::jsonb;

-- 3. PLAYERS
ALTER TABLE public.players
  ADD COLUMN IF NOT EXISTS player_name TEXT,
  ADD COLUMN IF NOT EXISTS player_class TEXT,
  ADD COLUMN IF NOT EXISTS player_level INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS class_level TEXT,
  ADD COLUMN IF NOT EXISTS race TEXT,
  ADD COLUMN IF NOT EXISTS str INTEGER DEFAULT 10,
  ADD COLUMN IF NOT EXISTS dex INTEGER DEFAULT 10,
  ADD COLUMN IF NOT EXISTS con INTEGER DEFAULT 10,
  ADD COLUMN IF NOT EXISTS int INTEGER DEFAULT 10,
  ADD COLUMN IF NOT EXISTS wis INTEGER DEFAULT 10,
  ADD COLUMN IF NOT EXISTS cha INTEGER DEFAULT 10,
  ADD COLUMN IF NOT EXISTS hp_max INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS hp_current INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ac TEXT,
  ADD COLUMN IF NOT EXISTS initiative TEXT,
  ADD COLUMN IF NOT EXISTS speed TEXT,
  ADD COLUMN IF NOT EXISTS perception TEXT,
  ADD COLUMN IF NOT EXISTS hd_total TEXT,
  ADD COLUMN IF NOT EXISTS prof_bonus TEXT,
  ADD COLUMN IF NOT EXISTS inspiration BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS saves JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS attacks JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS is_sleeping_action BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS exhaustion_level INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS min_sleep_req INTEGER DEFAULT 8;

-- ==========================================
-- 4. CONVERSÃO DE UUID PARA TEXTO (Suporte a dados legados como "slot-1", "npc_123")
-- ==========================================

-- Para Murais, precisamos alterar também as tabelas dependentes
ALTER TABLE public.mural_cards DROP CONSTRAINT IF EXISTS mural_cards_mural_id_fkey;
ALTER TABLE public.mural_connections DROP CONSTRAINT IF EXISTS mural_connections_mural_id_fkey;
ALTER TABLE public.murals ALTER COLUMN id TYPE TEXT USING id::TEXT;
ALTER TABLE public.mural_cards ALTER COLUMN mural_id TYPE TEXT USING mural_id::TEXT;
ALTER TABLE public.mural_connections ALTER COLUMN mural_id TYPE TEXT USING mural_id::TEXT;
ALTER TABLE public.mural_cards ADD CONSTRAINT mural_cards_mural_id_fkey FOREIGN KEY (mural_id) REFERENCES public.murals(id) ON DELETE CASCADE;
ALTER TABLE public.mural_connections ADD CONSTRAINT mural_connections_mural_id_fkey FOREIGN KEY (mural_id) REFERENCES public.murals(id) ON DELETE CASCADE;

-- Para as demais tabelas que não têm dependências bloqueantes (ou que não precisam manter constraints estritas de FK pro frontend legad)
ALTER TABLE public.npcs ALTER COLUMN id TYPE TEXT USING id::TEXT;
ALTER TABLE public.diary_entries ALTER COLUMN id TYPE TEXT USING id::TEXT;

-- Para players, precisamos remover a chave estrangeira e as policies temporariamente, alterar e recriar
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_player_id_fkey;
DROP POLICY IF EXISTS "Jogador edita propria ficha" ON public.players;

ALTER TABLE public.players ALTER COLUMN id TYPE TEXT USING id::TEXT;
ALTER TABLE public.profiles ALTER COLUMN player_id TYPE TEXT USING player_id::TEXT;

ALTER TABLE public.profiles ADD CONSTRAINT profiles_player_id_fkey FOREIGN KEY (player_id) REFERENCES public.players(id) ON DELETE SET NULL;
CREATE POLICY "Jogador edita propria ficha" ON public.players FOR UPDATE USING (id = (SELECT player_id FROM profiles WHERE id = auth.uid()));
