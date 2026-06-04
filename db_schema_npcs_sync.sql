-- =============================================
-- ATUALIZAÇÃO: Colunas faltantes em NPCs
-- Execute no Supabase SQL Editor
-- =============================================

-- Campos de Unificação (Player)
ALTER TABLE public.npcs ADD COLUMN IF NOT EXISTS attacks JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.npcs ADD COLUMN IF NOT EXISTS player_class TEXT DEFAULT '';
ALTER TABLE public.npcs ADD COLUMN IF NOT EXISTS player_level INTEGER DEFAULT 1;
ALTER TABLE public.npcs ADD COLUMN IF NOT EXISTS custom_class TEXT DEFAULT '';
ALTER TABLE public.npcs ADD COLUMN IF NOT EXISTS expertise_skills JSONB DEFAULT '[]'::jsonb;

-- Campos Mágicos Faltantes
ALTER TABLE public.npcs ADD COLUMN IF NOT EXISTS spellcasting_ability TEXT DEFAULT 'int';
ALTER TABLE public.npcs ADD COLUMN IF NOT EXISTS spell_slot_type TEXT DEFAULT 'standard';
ALTER TABLE public.npcs ADD COLUMN IF NOT EXISTS spells_known JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.npcs ADD COLUMN IF NOT EXISTS class_resources JSONB DEFAULT '[]'::jsonb;
