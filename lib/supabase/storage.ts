import { getSupabaseClient } from "./client";

// ─────────────────────────────────────────────────────────────
// Compressão de imagem via Canvas (browser-side)
// ─────────────────────────────────────────────────────────────

interface CompressOptions {
  /** Largura máxima em px. A altura é proporcional. */
  maxWidth?: number;
  /** Altura máxima em px. A largura é proporcional. */
  maxHeight?: number;
  /** Qualidade WebP/JPEG de 0 a 1 */
  quality?: number;
  /** Formato de saída */
  format?: "image/webp" | "image/jpeg" | "image/png";
}

/**
 * Comprime um Blob de imagem usando Canvas API.
 * Redimensiona mantendo proporção e converte para WebP por padrão.
 */
async function compressImage(blob: Blob, opts: CompressOptions = {}): Promise<Blob> {
  const {
    maxWidth = 512,
    maxHeight = 512,
    quality = 0.82,
    format = "image/webp",
  } = opts;

  return new Promise((resolve, reject) => {
    const img = new window.Image();
    const url = URL.createObjectURL(blob);

    img.onload = () => {
      URL.revokeObjectURL(url);

      let { width, height } = img;

      // Calcular dimensões finais mantendo proporção
      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext("2d");
      if (!ctx) return reject(new Error("Canvas 2D context não disponível"));

      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (result) => {
          if (!result) return reject(new Error("Falha ao comprimir imagem"));
          resolve(result);
        },
        format,
        quality
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Falha ao carregar imagem para compressão"));
    };

    img.src = url;
  });
}

// ─────────────────────────────────────────────────────────────
// Upload com compressão automática
// ─────────────────────────────────────────────────────────────

/**
 * Faz o upload de uma string em Base64 para o Supabase Storage (bucket 'images')
 * e retorna a URL pública.
 * - Imagens são comprimidas e redimensionadas antes do upload (WebP, max 512×512 para avatares).
 * - Se a string não for um Base64 válido (por exemplo, já for uma URL), retorna ela mesma.
 */
export async function uploadBase64Image(
  base64Data: string | null | undefined,
  folder: string = "misc",
  compressionOpts?: CompressOptions
): Promise<string | null | undefined> {
  if (!base64Data) return base64Data;
  if (!base64Data.startsWith("data:image/")) return base64Data; // Já é URL pública

  try {
    const supabase = getSupabaseClient();

    // Converte base64 para Blob
    const fetchResponse = await fetch(base64Data);
    const originalBlob = await fetchResponse.blob();

    // Comprime a imagem antes do upload
    const defaultOpts: CompressOptions = {
      maxWidth: 512,
      maxHeight: 512,
      quality: 0.82,
      format: "image/webp",
      ...compressionOpts,
    };
    const compressedBlob = await compressImage(originalBlob, defaultOpts);

    // Usa sempre .webp como extensão após compressão
    const ext = defaultOpts.format === "image/png" ? "png" : "webp";
    const fileName = `${folder}/${Date.now()}_${crypto.randomUUID().split("-")[0]}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("images")
      .upload(fileName, compressedBlob, {
        upsert: true,
        contentType: defaultOpts.format,
        cacheControl: "31536000", // Cache de 1 ano no CDN
      });

    if (uploadError) {
      console.error("Erro ao fazer upload da imagem:", uploadError);
      throw new Error(uploadError.message || JSON.stringify(uploadError));
    }

    const { data: publicUrlData } = supabase.storage.from("images").getPublicUrl(fileName);
    return publicUrlData.publicUrl;
  } catch (error) {
    console.error("Erro no uploadBase64Image:", error);
    throw error;
  }
}
