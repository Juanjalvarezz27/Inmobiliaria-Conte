import { createUploadthing, type FileRouter } from "uploadthing/next";

// Router para el catálogo oficial de propiedades
const f = createUploadthing();

export const propiedadesFileRouter = {
  // Foto principal de un Centro Comercial
  fotocentroComercial: f({
    image: { maxFileSize: "2MB", maxFileCount: 1 },
  }).onUploadComplete(async ({ file }) => {
    return { url: file.ufsUrl || file.url };
  }),

  // Fotos de un Local (hasta 5 fotos)
  fotosLocal: f({
    image: { maxFileSize: "2MB", maxFileCount: 5 },
  }).onUploadComplete(async ({ file }) => {
    return { url: file.ufsUrl || file.url };
  }),
} satisfies FileRouter;

export type PropiedadesFileRouter = typeof propiedadesFileRouter;
