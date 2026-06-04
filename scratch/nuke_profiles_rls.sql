-- =======================================================================
-- SCRIPT NUCLEAR PARA RESOLVER O "INFINITE RECURSION" DE VEZ
-- =======================================================================

-- 1. APAGAR TODAS AS POSSÍVEIS POLÍTICAS "FANTASMAS" QUE CAUSAM LOOP NO SELECT
-- (Alguma das antigas ficou viva no seu banco de dados!)
DROP POLICY IF EXISTS "Leitura de perfis (proprio e GM)" ON public.profiles;
DROP POLICY IF EXISTS "Leitura global de perfis" ON public.profiles;
DROP POLICY IF EXISTS "Usuarios leem proprio perfil" ON public.profiles;
DROP POLICY IF EXISTS "GM gerencia todos os perfis" ON public.profiles;
DROP POLICY IF EXISTS "GM gerencia perfis" ON public.profiles;
DROP POLICY IF EXISTS "Auth insere perfil" ON public.profiles;
DROP POLICY IF EXISTS "Jogador atualiza proprio perfil" ON public.profiles;
DROP POLICY IF EXISTS "Usuarios atualizam proprio perfil" ON public.profiles;
DROP POLICY IF EXISTS "GM insere perfis" ON public.profiles;
DROP POLICY IF EXISTS "GM atualiza perfis" ON public.profiles;
DROP POLICY IF EXISTS "GM deleta perfis" ON public.profiles;

-- 2. RECRIAR AS POLÍTICAS COM TOTAL SEGURANÇA CONTRA RECURSÃO
-- A leitura deve ser "true" (ou auth.uid() IS NOT NULL) sem NENHUM is_gm()
CREATE POLICY "Leitura global de perfis" 
ON public.profiles FOR SELECT 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Auth insere perfil" 
ON public.profiles FOR INSERT 
WITH CHECK (id = auth.uid());

CREATE POLICY "Usuarios atualizam proprio perfil" 
ON public.profiles FOR UPDATE 
USING (id = auth.uid());

-- O GM pode atualizar e deletar. Como isso não é SELECT, não causará loop!
CREATE POLICY "GM atualiza perfis" 
ON public.profiles FOR UPDATE 
USING (public.is_gm());

CREATE POLICY "GM deleta perfis" 
ON public.profiles FOR DELETE 
USING (public.is_gm());

-- 3. (Garantia) Atualiza a is_gm garantindo que ela é isolada
CREATE OR REPLACE FUNCTION public.is_gm()
RETURNS BOOLEAN AS $$
DECLARE
  v_role TEXT;
BEGIN
  SELECT role INTO v_role FROM public.profiles WHERE id = auth.uid() LIMIT 1;
  RETURN v_role = 'gm';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth;
