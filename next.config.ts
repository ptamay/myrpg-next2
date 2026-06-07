import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Habilita otimização automática de imagens via CDN do Supabase Storage
    remotePatterns: [
      {
        protocol: "https",
        hostname: "gixqqsczmfslmftzbeqg.supabase.co",
        port: "",
        pathname: "/storage/v1/object/public/**",
      },
    ],
    // Tamanhos de dispositivo que cobrem todos os casos de uso do app
    deviceSizes: [640, 750, 828, 1080, 1200],
    // Tamanhos de imagem para avatares e thumbnails (48px, 80px, 120px, 256px)
    imageSizes: [48, 80, 120, 256],
    // WebP é o formato padrão — reduz até 30% do tamanho em relação a JPEG
    formats: ["image/webp"],
  },
};

export default nextConfig;
