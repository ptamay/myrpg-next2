-- Execute no Supabase SQL Editor

ALTER TABLE public.players
  ADD COLUMN IF NOT EXISTS class_resources JSONB DEFAULT '{}'::jsonb;
-- Guardará Pontos de Ki, Fúrias (Rage), Sorcery Points, etc.
