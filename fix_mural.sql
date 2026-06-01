-- Adicionar colunas faltantes para suportar os cards completos do Mural
ALTER TABLE public.mural_cards
ADD COLUMN IF NOT EXISTS image_url TEXT,
ADD COLUMN IF NOT EXISTS ref_id TEXT,
ADD COLUMN IF NOT EXISTS created_by TEXT;

ALTER TABLE public.murals
ADD COLUMN IF NOT EXISTS background_style TEXT;
