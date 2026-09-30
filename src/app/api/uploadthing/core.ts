import { createUploadthing, type FileRouter } from "uploadthing/next";

const f = createUploadthing();

// Enrutador de archivos de UploadThing con restricciones estrictas de tamaño del roadmap
export const ourFileRouter = {
  // Carga de fotos de propiedades y centros comerciales (máximo 1MB según roadmap)
  propertyImage: f({
    image: {
      maxFileSize: "1MB",
      maxFileCount: 1,
    },
  }).onUploadComplete(async ({ file }) => {
    return { url: file.ufsUrl || file.url };
  }),

  // Carga de contratos y comprobantes en PDF (máximo 4MB según roadmap)
  contractPdf: f({
    pdf: {
      maxFileSize: "4MB",
      maxFileCount: 1,
    },
  }).onUploadComplete(async ({ file }) => {
    return { url: file.ufsUrl || file.url };
  }),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;
