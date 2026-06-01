-- Desabilitar temporariamente RLS da tabela de banco de dados, caso exista
ALTER TABLE IF EXISTS public.maps DISABLE ROW LEVEL SECURITY;

-- Adicionar políticas generosas de permissão no Storage (Arquivos) para contornar o bloqueio RLS
DROP POLICY IF EXISTS "Public Access" ON storage.objects;

CREATE POLICY "Public Access"
ON storage.objects FOR ALL
USING ( bucket_id = 'maps' OR bucket_id = 'images' )
WITH CHECK ( bucket_id = 'maps' OR bucket_id = 'images' );
