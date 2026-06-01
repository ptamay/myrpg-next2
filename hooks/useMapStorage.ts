// Originalmente usava IndexedDB, agora usa Supabase Storage e a tabela 'maps'
import { getSupabaseClient } from "@/lib/supabase/client";

export async function saveMapToDB(id: string, name: string, base64Data: string): Promise<void> {
  const supabase = getSupabaseClient();
  
  // Converter base64 para Blob
  const fetchResponse = await fetch(base64Data);
  const blob = await fetchResponse.blob();
  
  // Determinar extensão
  const mimeType = blob.type;
  const ext = mimeType === "image/png" ? "png" : mimeType === "image/jpeg" ? "jpg" : "webp";
  const path = `${id}.${ext}`;
  
  // Upload para o Storage
  const { error: uploadError } = await supabase.storage.from('maps').upload(path, blob, { upsert: true });
  if (uploadError) throw new Error(uploadError?.message || JSON.stringify(uploadError));
  
  // Obter campanha
  const { data: campaign } = await supabase.from('campaign').select('id').limit(1).single();
  
  // Inserir metadados na tabela
  const { error: dbError } = await supabase.from('maps').upsert({
    id,
    campaign_id: campaign?.id,
    name,
    image_url: path
  });
  
  if (dbError) throw new Error(dbError?.message || JSON.stringify(dbError));
}

export async function getAllMapsFromDB(): Promise<{id: string, name: string, data: string}[]> {
  const supabase = getSupabaseClient();
  const { data: mapsData, error } = await supabase.from('maps').select('*');
  
  if (error || !mapsData) return [];
  
  return mapsData.map((map: any) => {
    const { data: publicUrlData } = supabase.storage.from('maps').getPublicUrl(map.image_url);
    return {
      id: map.id,
      name: map.name,
      data: publicUrlData.publicUrl // retorna a URL pública em vez do base64
    };
  });
}

export async function deleteMapFromDB(id: string): Promise<void> {
  const supabase = getSupabaseClient();
  const { data: mapData } = await supabase.from('maps').select('image_url').eq('id', id).single();
  
  if (mapData) {
    await supabase.storage.from('maps').remove([mapData.image_url]);
    await supabase.from('maps').delete().eq('id', id);
  }
}

export async function clearAllMapsFromDB(): Promise<void> {
  const supabase = getSupabaseClient();
  const { data: mapsData } = await supabase.from('maps').select('image_url');
  
  if (mapsData && mapsData.length > 0) {
    const paths = mapsData.map((m: any) => m.image_url);
    await supabase.storage.from('maps').remove(paths);
    await supabase.from('maps').delete().not('id', 'is', null); // deleta todos
  }
}
