import { createUploadthing, type FileRouter } from "uploadthing/next";

// Router para el catálogo de unidades y espacios
const f = createUploadthing();

export const propiedadesFileRouter = {
  // Fotos de una unidad (locales, apartamentos, oficinas, casas) - hasta 3 fotos
  fotosUnidad: f({
    image: { maxFileSize: "4MB", maxFileCount: 3 },
  }).onUploadComplete(async ({ file }) => {
    return { url: file.ufsUrl || file.url };
  }),

  // Alias fotosLocal para retrocompatibilidad
  fotosLocal: f({
    image: { maxFileSize: "4MB", maxFileCount: 3 },
  }).onUploadComplete(async ({ file }) => {
    return { url: file.ufsUrl || file.url };
  }),
} satisfies FileRouter;

export type PropiedadesFileRouter = typeof propiedadesFileRouter;
