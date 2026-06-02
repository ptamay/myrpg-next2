-- Adiciona as colunas background e personal_goals na tabela players, se elas não existirem
ALTER TABLE public.players ADD COLUMN IF NOT EXISTS background TEXT DEFAULT '';
ALTER TABLE public.players ADD COLUMN IF NOT EXISTS personal_goals TEXT DEFAULT '';

-- Atualiza o cache do schema do PostgREST para o Supabase reconhecer as novas colunas
NOTIFY pgrst, 'reload schema';
