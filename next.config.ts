import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Habilita compresión Gzip nativa para respuestas del servidor
  compress: true,
  // Elimina encabezado X-Powered-By para reducir bytes transferidos
  poweredByHeader: false,
  // Optimización de imágenes para reducir Fast Data Transfer en Vercel
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      { protocol: "https", hostname: "utfs.io" },
      { protocol: "https", hostname: "*.ufs.sh" },
    ],
    minimumCacheTTL: 2592000,
  },
  // Encabezados HTTP para evitar re-descargas y optimizar entrega de assets
  async headers() {
    return [
      {
        source: "/:all*(svg|jpg|jpeg|png|webp|avif|ico|woff|woff2)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
    ];
  },
};

export default nextConfig;

