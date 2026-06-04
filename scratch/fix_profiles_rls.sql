-- Correção da política de RLS da tabela 'profiles' para evitar vazamento global de e-mails
-- Pode ser executado no SQL Editor do Supabase

-- 1. Remove a política antiga
DROP POLICY IF EXISTS "Leitura global de perfis" ON public.profiles;

-- 2. Cria a nova política mais restritiva (apenas o próprio usuário e o GM podem ler)
CREATE POLICY "Leitura de perfis (proprio e GM)" 
ON public.profiles 
FOR SELECT 
USING (
  id = auth.uid() OR public.is_gm()
);
