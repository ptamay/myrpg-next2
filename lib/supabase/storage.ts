import { getSupabaseClient } from "./client";

/**
 * Faz o upload de uma string em Base64 para o Supabase Storage (bucket 'images')
 * e retorna a URL pública.
 * Se a string não for um Base64 válido (por exemplo, já for uma URL), retorna ela mesma.
 */
export async function uploadBase64Image(base64Data: string | null | undefined, folder: string = "misc"): Promise<string | null | undefined> {
  if (!base64Data) return base64Data;
  if (!base64Data.startsWith("data:image/")) return base64Data; // Pode ser que já seja uma URL pública

  try {
    const supabase = getSupabaseClient();
    
    // Converte base64 para Blob
    const fetchResponse = await fetch(base64Data);
    const blob = await fetchResponse.blob();
    
    // Extrai extensão
    const mimeType = blob.type;
    const ext = mimeType === "image/png" ? "png" : mimeType === "image/jpeg" ? "jpg" : mimeType === "image/webp" ? "webp" : "jpg";
    
    const fileName = `${folder}/${Date.now()}_${crypto.randomUUID().split("-")[0]}.${ext}`;
    
    const { error: uploadError } = await supabase.storage.from("images").upload(fileName, blob, { upsert: true });
    
    if (uploadError) {
      console.error("Erro ao fazer upload da imagem:", uploadError);
      throw new Error(uploadError.message || JSON.stringify(uploadError));
    }
    
    const { data: publicUrlData } = supabase.storage.from("images").getPublicUrl(fileName);
    return publicUrlData.publicUrl;
  } catch (error) {
    console.error("Erro no uploadBase64Image:", error);
    // Em caso de falha, retorna a própria string ou joga o erro adiante dependendo da estratégia. 
    // Vamos lançar para que o form exiba um alerta ao usuário que falhou e não sobreponha banco com dado corrompido.
    throw error;
  }
}
