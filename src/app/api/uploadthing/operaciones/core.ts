import { createUploadthing, type FileRouter } from "uploadthing/next";

// Router para operaciones diarias
const f = createUploadthing();

export const operacionesFileRouter = {
  // Fotos de evidencia de tareas de empleados (hasta 3 fotos)
  fotoTarea: f({
    image: { maxFileSize: "2MB", maxFileCount: 3 },
  }).onUploadComplete(async ({ file }) => {
    return { url: file.ufsUrl || file.url };
  }),

  // Documentos: contratos, recibos, comprobantes de pago (PDF)
  documentoOperativo: f({
    pdf: { maxFileSize: "4MB", maxFileCount: 1 },
  }).onUploadComplete(async ({ file }) => {
    return { url: file.ufsUrl || file.url };
  }),

  // Fotos de tickets de mantenimiento
  fotoTicket: f({
    image: { maxFileSize: "2MB", maxFileCount: 5 },
  }).onUploadComplete(async ({ file }) => {
    return { url: file.ufsUrl || file.url };
  }),
} satisfies FileRouter;

export type OperacionesFileRouter = typeof operacionesFileRouter;
