import type { NextConfig } from "next";

// Recarga de configuración y esquema de base de datos
const nextConfig: NextConfig = {
  // Habilita compresión Gzip nativa para respuestas del servidor
  compress: true,
  // Elimina encabezado X-Powered-By para reducir bytes transferidos
  poweredByHeader: false,
  // Silencia el registro verboso de peticiones HTTP y Server Actions en la terminal
  logging: {
    incomingRequests: false,
    serverFunctions: false,
  },
  // Optimización de imágenes para reducir Fast Data Transfer en Vercel
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      { protocol: "https", hostname: "utfs.io" },
      { protocol: "https", hostname: "*.ufs.sh" },
    ],
    minimumCacheTTL: 2592000,
  },
  // Configuración de Turbopack (bundler por defecto en Next.js 16)
  turbopack: {
    resolveAlias: {
      canvas: "./src/lib/empty-module.ts",
    },
  },
  // Evitar que Next.js intente bundlear pdfjs-dist como módulo de servidor bajo Webpack
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // pdfjs-dist usa canvas en el entorno nativo, ignorarlo en el cliente web
      config.resolve.alias = {
        ...(config.resolve.alias || {}),
        canvas: false,
      };
    }
    return config;
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


