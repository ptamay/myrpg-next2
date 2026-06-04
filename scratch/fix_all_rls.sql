-- =======================================================================
-- FIX COMPLETO DE RLS — myrpg-next2
-- Execute no SQL Editor do Supabase (pode rodar mais de uma vez com segurança)
-- =======================================================================

-- =====================
-- 1. DROP de todas as policies existentes (reset limpo)
-- =====================
DO $$ 
DECLARE
  r RECORD;
BEGIN
  FOR r IN (
    SELECT policyname, tablename
    FROM pg_policies
    WHERE schemaname = 'public'
  ) LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', r.policyname, r.tablename);
  END LOOP;
END $$;

-- =====================
-- 2. Recriar a função is_gm() — sem risco de recursão
--    SECURITY DEFINER + SET search_path garante que ela leia a tabela
--    sem acionar o RLS novamente (ela roda como o owner do schema).
-- =====================
CREATE OR REPLACE FUNCTION public.is_gm()
RETURNS BOOLEAN AS $$
DECLARE
  v_role TEXT;
BEGIN
  SELECT role INTO v_role
  FROM public.profiles
  WHERE id = auth.uid()
  LIMIT 1;
  RETURN v_role = 'gm';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth;

-- =====================
-- 3. PROFILES
-- Policy de SELECT: cada um lê o próprio perfil; GM lê todos.
-- NOTA: is_gm() é SECURITY DEFINER, portanto não entra em loop.
-- =====================
CREATE POLICY "Usuarios leem proprio perfil"
  ON public.profiles FOR SELECT
  USING ( id = auth.uid() OR public.is_gm() );

CREATE POLICY "Auth insere perfil"
  ON public.profiles FOR INSERT
  WITH CHECK ( id = auth.uid() );

-- Permite atualizar o próprio perfil (role, display_name, etc.)
CREATE POLICY "Usuarios atualizam proprio perfil"
  ON public.profiles FOR UPDATE
  USING ( id = auth.uid() );

-- GM pode gerenciar tudo (INSERT/UPDATE/DELETE outros perfis)
CREATE POLICY "GM gerencia todos os perfis"
  ON public.profiles FOR ALL
  USING ( public.is_gm() );

-- =====================
-- 4. PLAYERS — qualquer autenticado lê; GM escreve; jogador edita a própria ficha
-- =====================
CREATE POLICY "Leitura global de jogadores"
  ON public.players FOR SELECT
  USING ( auth.uid() IS NOT NULL );

CREATE POLICY "GM gerencia jogadores"
  ON public.players FOR ALL
  USING ( public.is_gm() );

CREATE POLICY "Jogador edita propria ficha"
  ON public.players FOR UPDATE
  USING (
    id = (SELECT player_id FROM public.profiles WHERE id = auth.uid() LIMIT 1)
  );

-- =====================
-- 5. NPCS — visíveis para todos autenticados (exceto hidden, só GM)
-- =====================
CREATE POLICY "Jogadores leem NPCs visiveis"
  ON public.npcs FOR SELECT
  USING ( is_hidden = FALSE OR public.is_gm() );

CREATE POLICY "GM gerencia NPCs"
  ON public.npcs FOR ALL
  USING ( public.is_gm() );

-- =====================
-- 6. CAMPAIGN, JOURNEY_DAYS, JOURNEY_BLOCKS, SUPPLIES, MAPS
--    Todos autenticados leem; GM escreve.
-- =====================
CREATE POLICY "Leitura global campanha"     ON public.campaign       FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "GM gerencia campanha"        ON public.campaign       FOR ALL    USING (public.is_gm());

CREATE POLICY "Leitura global dias"         ON public.journey_days   FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "GM gerencia dias"            ON public.journey_days   FOR ALL    USING (public.is_gm());

CREATE POLICY "Leitura global blocos"       ON public.journey_blocks FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "GM gerencia blocos"          ON public.journey_blocks FOR ALL    USING (public.is_gm());

CREATE POLICY "Leitura global suprimentos"  ON public.supplies       FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "GM gerencia suprimentos"     ON public.supplies       FOR ALL    USING (public.is_gm());

CREATE POLICY "Leitura global mapas"        ON public.maps           FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "GM gerencia mapas"           ON public.maps           FOR ALL    USING (public.is_gm());

-- Jogadores podem salvar sessão em blocos (via RPC merge_player_session — SECURITY DEFINER, não precisa de policy de UPDATE)
-- Mas para o caso de acesso direto, bloqueamos escrita de non-GMs via a policy acima.

-- =====================
-- 7. COLABORATIVOS — qualquer autenticado
-- =====================
CREATE POLICY "Acesso total diarios"           ON public.diary_entries      FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "Acesso total murais"            ON public.murals             FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "Acesso total mural_cards"       ON public.mural_cards        FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "Acesso total mural_connections" ON public.mural_connections  FOR ALL USING (auth.uid() IS NOT NULL);

-- =====================
-- 8. Garante que o e-mail Admin tenha a role correta no banco
--    Substitua 'admin@seudominio.com' pelo seu e-mail real.
-- =====================
-- UPDATE public.profiles SET role = 'gm' WHERE email = 'admin@seudominio.com';
-- (Descomente a linha acima e substitua o e-mail antes de rodar)

-- =====================
-- 9. STORAGE — proteção dos buckets
-- =====================
DROP POLICY IF EXISTS "Public Access"               ON storage.objects;
DROP POLICY IF EXISTS "Public Read Access"          ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Upload/Edit Access" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Update Access" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Delete Access" ON storage.objects;

-- Qualquer um pode ler imagens/mapas (para exibição no jogo)
CREATE POLICY "Public Read Access"
  ON storage.objects FOR SELECT
  USING ( bucket_id IN ('maps', 'images') );

-- Apenas usuários autenticados podem fazer upload, editar ou deletar
CREATE POLICY "Authenticated Write Access"
  ON storage.objects FOR INSERT
  WITH CHECK ( bucket_id IN ('maps', 'images') AND auth.uid() IS NOT NULL );

CREATE POLICY "Authenticated Update Access"
  ON storage.objects FOR UPDATE
  USING ( bucket_id IN ('maps', 'images') AND auth.uid() IS NOT NULL );

CREATE POLICY "Authenticated Delete Access"
  ON storage.objects FOR DELETE
  USING ( bucket_id IN ('maps', 'images') AND auth.uid() IS NOT NULL );
