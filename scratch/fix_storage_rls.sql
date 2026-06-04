-- Script para proteção dos Buckets (maps e images)
-- 1. Remove a política permissiva global (FOR ALL)
DROP POLICY IF EXISTS "Public Access" ON storage.objects;

-- 2. Permite que qualquer um leia (SELECT) as imagens/mapas
CREATE POLICY "Public Read Access"
ON storage.objects FOR SELECT
USING ( bucket_id IN ('maps', 'images') );

-- 3. Permite que apenas usuários AUTENTICADOS façam upload, editem ou deletem
CREATE POLICY "Authenticated Upload/Edit Access"
ON storage.objects FOR INSERT
WITH CHECK ( bucket_id IN ('maps', 'images') AND auth.uid() IS NOT NULL );

CREATE POLICY "Authenticated Update Access"
ON storage.objects FOR UPDATE
USING ( bucket_id IN ('maps', 'images') AND auth.uid() IS NOT NULL );

CREATE POLICY "Authenticated Delete Access"
ON storage.objects FOR DELETE
USING ( bucket_id IN ('maps', 'images') AND auth.uid() IS NOT NULL );
