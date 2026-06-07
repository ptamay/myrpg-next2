"use client";

/**
 * OptimizedImage.tsx
 *
 * Wrapper sobre next/image que:
 * 1. Detecta se a URL é do Supabase Storage → usa <Image> com otimização automática
 * 2. Para URLs externas (ex: base64, imgur, etc.) → usa <img> com lazy loading
 * 3. Exibe um placeholder enquanto carrega
 *
 * Uso:
 *   <OptimizedImage src={npc.image} alt={npc.name} width={48} height={48} className="npc-avatar" />
 */

import Image from "next/image";
import { useState } from "react";

const SUPABASE_HOSTNAME = "gixqqsczmfslmftzbeqg.supabase.co";

interface OptimizedImageProps {
  src?: string | null;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  style?: React.CSSProperties;
  /** Fallback quando a imagem falha ou src está vazio */
  fallback?: React.ReactNode;
  /** Prioridade de carregamento (desativa lazy-load) — use apenas above-the-fold */
  priority?: boolean;
  objectFit?: "cover" | "contain" | "fill" | "none" | "scale-down";
  loading?: "lazy" | "eager"; // Adicionado para aceitar props antigas
}

function isSupabaseUrl(src: string): boolean {
  try {
    const url = new URL(src);
    return url.hostname === SUPABASE_HOSTNAME;
  } catch {
    return false;
  }
}

function isBase64(src: string): boolean {
  return src.startsWith("data:image/");
}

export function OptimizedImage({
  src,
  alt,
  width,
  height,
  className,
  style,
  fallback,
  priority = false,
  objectFit = "cover",
}: OptimizedImageProps) {
  const [error, setError] = useState(false);

  if (!src || error) {
    return (
      <>{fallback ?? <div className={className} style={{ ...style, background: "#333", display: "flex", alignItems: "center", justifyContent: "center", color: "#888", fontSize: "0.7rem", objectFit }}>{alt?.charAt(0) || "?"}</div>}</>
    );
  }

  const imgStyle: React.CSSProperties = {
    ...(objectFit ? { objectFit } : {}),
    ...style,
  };

  // URLs do Supabase Storage: usa next/image para otimização automática (resize + WebP + cache CDN)
  if (isSupabaseUrl(src) && !isBase64(src)) {
    return (
      <Image
        src={src}
        alt={alt}
        width={width || 800} // Next exige numérico se fill não for true. 800 garante boa resolução sem ser massivo.
        height={height || 800}
        className={className}
        style={imgStyle}
        priority={priority}
        loading={priority ? undefined : "lazy"}
        onError={() => setError(true)}
        unoptimized={false}
      />
    );
  }

  // Fallback para URLs externas, base64, etc.
  return (
    <img
      src={src}
      alt={alt}
      width={width}
      height={height}
      className={className}
      style={imgStyle}
      loading={priority ? "eager" : "lazy"}
      decoding="async"
      onError={() => setError(true)}
    />
  );
}
