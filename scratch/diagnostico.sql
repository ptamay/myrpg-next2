-- =======================================================================
-- DIAGNÓSTICO: Cole no SQL Editor do Supabase e rode
-- =======================================================================

-- 1. Ver seu próprio perfil (quem está autenticado e qual é sua role no banco)
SELECT id, email, role, player_id FROM public.profiles;

-- 2. Testar se is_gm() funciona sem recursão
-- (Execute separado se precisar — substitua o UUID pelo seu)
SELECT public.is_gm() AS resultado_is_gm;

-- 3. Ver quais policies existem na tabela profiles AGORA
SELECT policyname, cmd, qual
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'profiles'
ORDER BY cmd;

-- 4. Verificar se há dados nas tabelas principais
SELECT 'profiles' as tabela, count(*) as total FROM public.profiles
UNION ALL
SELECT 'players', count(*) FROM public.players
UNION ALL
SELECT 'npcs', count(*) FROM public.npcs
UNION ALL
SELECT 'campaign', count(*) FROM public.campaign
UNION ALL
SELECT 'supplies', count(*) FROM public.supplies
UNION ALL
SELECT 'journey_days', count(*) FROM public.journey_days;
