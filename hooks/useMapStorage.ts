// Originalmente usava IndexedDB, agora usa Supabase Storage e a tabela 'maps'
import { getSupabaseClient } from "@/lib/supabase/client";
import { getCampaignId } from "@/lib/supabase/campaignCache";

export async function saveMapToDB(id: string, name: string, base64Data: string): Promise<void> {
  const supabase = getSupabaseClient();
  
  // Converter base64 para Blob
  const fetchResponse = await fetch(base64Data);
  const blob = await fetchResponse.blob();
  
  // Validação 1: Tamanho máximo (5MB)
  const MAX_SIZE = 5 * 1024 * 1024;
  if (blob.size > MAX_SIZE) {
    throw new Error("A imagem é muito grande. O tamanho máximo permitido é 5MB.");
  }
  
  // Validação 2: Tipo de arquivo (MIME type estrito)
  const mimeType = blob.type;
  const allowedTypes = ["image/png", "image/jpeg", "image/webp"];
  if (!allowedTypes.includes(mimeType)) {
    throw new Error("Formato de imagem não suportado. Use apenas PNG, JPG ou WEBP.");
  }

  const ext = mimeType === "image/png" ? "png" : mimeType === "image/jpeg" ? "jpg" : "webp";
  const path = `${id}.${ext}`;
  
  // Upload para o Storage
  const { error: uploadError } = await supabase.storage.from('maps').upload(path, blob, { upsert: true });
  if (uploadError) throw new Error(uploadError?.message || JSON.stringify(uploadError));
  
  // Obter campanha (usa cache para evitar round-trip desnecessário)
  const campaignId = await getCampaignId();
  
  // Inserir metadados na tabela
  const { error: dbError } = await supabase.from('maps').upsert({
    id,
    campaign_id: campaignId,
    name,
    image_url: path
  });
  
  if (dbError) throw new Error(dbError?.message || JSON.stringify(dbError));
}

export async function getAllMapsFromDB(): Promise<{id: string, name: string, data: string}[]> {
  const supabase = getSupabaseClient();
  // Seleciona apenas os campos necessários para a listagem
  const { data: mapsData, error } = await supabase.from('maps').select('id, name, image_url');
  
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
