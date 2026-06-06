-- Adiciona colunas para Habilidades Especiais e Resistências formatadas como Arrays (JSONB)
-- Isso permite salvar múltiplas resistências, imunidades e habilidades detalhadas para Jogadores e NPCs.

-- Para PLAYERS
ALTER TABLE public.players ADD COLUMN IF NOT EXISTS abilities JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.players ADD COLUMN IF NOT EXISTS resistances_arr JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.players ADD COLUMN IF NOT EXISTS immunities_arr JSONB DEFAULT '[]'::jsonb;

-- Para NPCS
ALTER TABLE public.npcs ADD COLUMN IF NOT EXISTS abilities JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.npcs ADD COLUMN IF NOT EXISTS resistances_arr JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.npcs ADD COLUMN IF NOT EXISTS immunities_arr JSONB DEFAULT '[]'::jsonb;
