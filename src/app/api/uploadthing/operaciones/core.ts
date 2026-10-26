import { createUploadthing, type FileRouter } from "uploadthing/next";

// Router para operaciones diarias
const f = createUploadthing();

export const operacionesFileRouter = {
  // Fotos de evidencia de tareas de empleados (hasta 2 fotos)
  fotoTarea: f({
    image: { maxFileSize: "4MB", maxFileCount: 2 },
  }).onUploadComplete(async ({ file }) => {
    return { url: file.ufsUrl || file.url };
  }),

  // Fotos de incidencias y novedades de seguridad (hasta 3 fotos)
  fotoIncidencia: f({
    image: { maxFileSize: "4MB", maxFileCount: 3 },
  }).onUploadComplete(async ({ file }) => {
    return { url: file.ufsUrl || file.url };
  }),

  // Documentos: contratos, recibos, comprobantes de pago (PDF)
  documentoOperativo: f({
    pdf: { maxFileSize: "8MB", maxFileCount: 1 },
  }).onUploadComplete(async ({ file }) => {
    return { url: file.ufsUrl || file.url };
  }),

  // Fotos de tickets de mantenimiento
  fotoTicket: f({
    image: { maxFileSize: "2MB", maxFileCount: 5 },
  }).onUploadComplete(async ({ file }) => {
    return { url: file.ufsUrl || file.url };
  }),

  // Comprobantes de pago (captures de transferencia, recibos bancarios o PDFs)
  comprobantePago: f({
    image: { maxFileSize: "4MB", maxFileCount: 1 },
    pdf: { maxFileSize: "4MB", maxFileCount: 1 },
  }).onUploadComplete(async ({ file }) => {
    return { url: file.ufsUrl || file.url };
  }),
} satisfies FileRouter;

export type OperacionesFileRouter = typeof operacionesFileRouter;
