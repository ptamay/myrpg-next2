-- =======================================================================
-- FIX DEFINITIVO (REMOVER "FOR ALL" DA TABELA PROFILES)
-- =======================================================================

-- 1. Remove as políticas que usavam FOR ALL (que incluíam SELECT e causavam loop)
DROP POLICY IF EXISTS "GM gerencia todos os perfis" ON public.profiles;
DROP POLICY IF EXISTS "GM gerencia perfis" ON public.profiles;
DROP POLICY IF EXISTS "Usuarios leem proprio perfil" ON public.profiles;
DROP POLICY IF EXISTS "Leitura global de perfis" ON public.profiles;
DROP POLICY IF EXISTS "GM insere perfis" ON public.profiles;
DROP POLICY IF EXISTS "GM atualiza perfis" ON public.profiles;
DROP POLICY IF EXISTS "GM deleta perfis" ON public.profiles;

-- 2. Recria as políticas garantindo que o SELECT seja livre de loops
CREATE POLICY "Leitura global de perfis"
  ON public.profiles FOR SELECT
  USING ( auth.uid() IS NOT NULL );

-- 3. As permissões de GM na tabela profiles agora são separadas, 
-- evitando aplicar a checagem no momento do SELECT.
CREATE POLICY "GM insere perfis"
  ON public.profiles FOR INSERT
  WITH CHECK ( public.is_gm() );

CREATE POLICY "GM atualiza perfis"
  ON public.profiles FOR UPDATE
  USING ( public.is_gm() );

CREATE POLICY "GM deleta perfis"
  ON public.profiles FOR DELETE
  USING ( public.is_gm() );
