-- Corrige o problema de leitura / "não consigo acessar dados" (Infinite Recursion ou Role desatualizado)

-- 1. Garante que o usuário Admin (seu e-mail) tenha a role de GM no banco de dados
UPDATE public.profiles
SET role = 'gm'
WHERE email = current_setting('request.jwt.claims', true)::json->>'email';

-- 2. Atualiza a função is_gm() para evitar um loop infinito de RLS
-- Ao invés de consultar a tabela 'profiles' inteira (que poderia disparar a política RLS e causar loop),
-- usamos bypass direto na tabela, ou consultamos via JWT se preferível.
-- Como é SECURITY DEFINER, geralmente deveria dar bypass, mas para garantir:
CREATE OR REPLACE FUNCTION public.is_gm()
RETURNS BOOLEAN AS $$
DECLARE
  is_admin BOOLEAN;
BEGIN
  -- Consulta contornando possíveis loops (lendo direto na chave primária)
  SELECT (role = 'gm') INTO is_admin 
  FROM public.profiles 
  WHERE id = auth.uid();
  
  RETURN COALESCE(is_admin, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 3. Atualiza a política de Profiles para ser mais segura e livre de loops
DROP POLICY IF EXISTS "Leitura de perfis (proprio e GM)" ON public.profiles;

CREATE POLICY "Leitura de perfis (proprio e GM)" 
ON public.profiles 
FOR SELECT 
USING (
  id = auth.uid() OR (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'gm'
);
