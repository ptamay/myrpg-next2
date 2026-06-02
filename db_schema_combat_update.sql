-- =============================================
-- MIGRAÇÃO: Preparação para Sistema de Combate
-- Execute no Supabase SQL Editor
-- =============================================

-- FASE 1: Vida Temporária (persiste entre sessões)
ALTER TABLE public.players ADD COLUMN IF NOT EXISTS temp_hp INTEGER DEFAULT 0;
ALTER TABLE public.npcs    ADD COLUMN IF NOT EXISTS temp_hp INTEGER DEFAULT 0;

-- FASE 1 (adicional): Campos de combate efêmero para NPCs (agora persistidos)
ALTER TABLE public.npcs ADD COLUMN IF NOT EXISTS temp_ac    INTEGER DEFAULT 0;
ALTER TABLE public.npcs ADD COLUMN IF NOT EXISTS temp_res   JSONB   DEFAULT '[]'::jsonb;

-- FASE 4: Condições de Combate (lista de strings: 'poisoned', 'stunned', etc.)
ALTER TABLE public.players ADD COLUMN IF NOT EXISTS conditions JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.npcs    ADD COLUMN IF NOT EXISTS conditions JSONB DEFAULT '[]'::jsonb;

-- FASE 2: Buffs Ativos (para sistema de buffs fora de combate)
ALTER TABLE public.players ADD COLUMN IF NOT EXISTS active_buffs JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.npcs    ADD COLUMN IF NOT EXISTS active_buffs JSONB DEFAULT '[]'::jsonb;

-- PADRONIZAÇÃO: Salvaguardas em NPCs (equivalente a players.saves)
ALTER TABLE public.npcs ADD COLUMN IF NOT EXISTS saves JSONB DEFAULT '[]'::jsonb;

-- PADRONIZAÇÃO: Bônus de Proficiência em NPCs (opcional — motor calcula via CR se vazio)
ALTER TABLE public.npcs ADD COLUMN IF NOT EXISTS prof_bonus TEXT DEFAULT '';

-- PADRONIZAÇÃO: skills de NPCs como array (igual a players)
-- ATENÇÃO: Execute este UPDATE antes do ALTER para não perder dados
UPDATE public.npcs SET skills = '[]'::jsonb WHERE jsonb_typeof(skills) = 'object';

-- CORREÇÃO: sleep_hours_today para players (campo existe na interface mas sem coluna)
ALTER TABLE public.players ADD COLUMN IF NOT EXISTS sleep_hours_today INTEGER DEFAULT 0;
