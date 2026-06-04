-- =======================================================================
-- FIX DEFINITIVO PARA O "INFINITE RECURSION"
-- Execute no SQL Editor do Supabase
-- =======================================================================

-- 1. Removemos a política de leitura que causava o loop infinito
DROP POLICY IF EXISTS "Usuarios leem proprio perfil" ON public.profiles;

-- 2. Permitimos que qualquer usuário logado leia a tabela profiles.
-- Como is_gm() consulta a tabela profiles, a política de SELECT não pode
-- depender do próprio is_gm() (isso criava o loop do Postgres).
CREATE POLICY "Leitura global de perfis"
  ON public.profiles FOR SELECT
  USING ( auth.uid() IS NOT NULL );

-- 3. (OPCIONAL) Garante novamente que o seu e-mail seja admin 
-- Caso já tenha rodado antes, não tem problema rodar de novo.
-- Descomente a linha abaixo e coloque seu email se quiser forçar o papel de gm:
-- UPDATE public.profiles SET role = 'gm' WHERE email = 'admin@seudominio.com';
