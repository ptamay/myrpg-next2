// Originalmente usava IndexedDB, agora usa Supabase Storage e a tabela 'maps'
import { createClient } from "@/lib/supabase/client";

export async function saveMapToDB(id: string, name: string, base64Data: string): Promise<void> {
  const supabase = createClient();
  
  // Converter base64 para Blob
  const fetchResponse = await fetch(base64Data);
  const blob = await fetchResponse.blob();
  
  // Determinar extensão
  const mimeType = blob.type;
  const ext = mimeType === "image/png" ? "png" : mimeType === "image/jpeg" ? "jpg" : "webp";
  const path = `${id}.${ext}`;
  
  // Upload para o Storage
  const { error: uploadError } = await supabase.storage.from('maps').upload(path, blob, { upsert: true });
  if (uploadError) throw uploadError;
  
  // Obter campanha
  const { data: campaign } = await supabase.from('campaign').select('id').limit(1).single();
  
  // Inserir metadados na tabela
  const { error: dbError } = await supabase.from('maps').upsert({
    id,
    campaign_id: campaign?.id,
    name,
    storage_path: path
  });
  
  if (dbError) throw dbError;
}

export async function getAllMapsFromDB(): Promise<{id: string, name: string, data: string}[]> {
  const supabase = createClient();
  const { data: mapsData, error } = await supabase.from('maps').select('*');
  
  if (error || !mapsData) return [];
  
  return mapsData.map(map => {
    const { data: publicUrlData } = supabase.storage.from('maps').getPublicUrl(map.storage_path);
    return {
      id: map.id,
      name: map.name,
      data: publicUrlData.publicUrl // retorna a URL pública em vez do base64
    };
  });
}

export async function deleteMapFromDB(id: string): Promise<void> {
  const supabase = createClient();
  const { data: mapData } = await supabase.from('maps').select('storage_path').eq('id', id).single();
  
  if (mapData) {
    await supabase.storage.from('maps').remove([mapData.storage_path]);
    await supabase.from('maps').delete().eq('id', id);
  }
}

export async function clearAllMapsFromDB(): Promise<void> {
  const supabase = createClient();
  const { data: mapsData } = await supabase.from('maps').select('storage_path');
  
  if (mapsData && mapsData.length > 0) {
    const paths = mapsData.map(m => m.storage_path);
    await supabase.storage.from('maps').remove(paths);
    await supabase.from('maps').delete().neq('id', '0'); // deleta todos
  }
}
