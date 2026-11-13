import { createUploadthing, type FileRouter } from "uploadthing/next";
import { UploadThingError } from "uploadthing/server";
import { auth } from "@/auth";

// Router para operaciones diarias
const f = createUploadthing();

// Helper para validar autenticación básica en cargas
async function getUploadSession() {
  const session = await auth();
  if (!session?.user?.id) {
    throw new UploadThingError("No autenticado. Inicia sesión para subir archivos.");
  }
  return session.user;
}

export const operacionesFileRouter = {
  // Fotos de evidencia de tareas de empleados (hasta 2 fotos)
  fotoTarea: f({
    image: { maxFileSize: "4MB", maxFileCount: 2 },
  })
    .middleware(async () => {
      const user = await getUploadSession();
      if (user.rol !== "ADMIN" && user.rol !== "EMPLEADO") {
        throw new UploadThingError("Solo administradores y empleados pueden subir evidencias.");
      }
      return { userId: user.id };
    })
    .onUploadComplete(async ({ file }) => {
      return { url: file.ufsUrl || file.url };
    }),

  // Fotos de incidencias y novedades de seguridad (hasta 3 fotos)
  fotoIncidencia: f({
    image: { maxFileSize: "4MB", maxFileCount: 3 },
  })
    .middleware(async () => {
      const user = await getUploadSession();
      if (user.rol !== "ADMIN" && user.rol !== "EMPLEADO") {
        throw new UploadThingError("Solo personal de seguridad o administradores pueden subir incidencias.");
      }
      return { userId: user.id };
    })
    .onUploadComplete(async ({ file }) => {
      return { url: file.ufsUrl || file.url };
    }),

  // Documentos: contratos, recibos, comprobantes de pago (PDF)
  documentoOperativo: f({
    pdf: { maxFileSize: "8MB", maxFileCount: 1 },
  })
    .middleware(async () => {
      const user = await getUploadSession();
      if (user.rol !== "ADMIN") {
        throw new UploadThingError("Solo administradores pueden cargar documentos operativos.");
      }
      return { userId: user.id };
    })
    .onUploadComplete(async ({ file }) => {
      return { url: file.ufsUrl || file.url };
    }),

  // Fotos de tickets de mantenimiento
  fotoTicket: f({
    image: { maxFileSize: "2MB", maxFileCount: 5 },
  })
    .middleware(async () => {
      const user = await getUploadSession();
      return { userId: user.id };
    })
    .onUploadComplete(async ({ file }) => {
      return { url: file.ufsUrl || file.url };
    }),

  // Comprobantes de pago (captures de transferencia, recibos bancarios o PDFs)
  comprobantePago: f({
    image: { maxFileSize: "4MB", maxFileCount: 1 },
    pdf: { maxFileSize: "4MB", maxFileCount: 1 },
  })
    .middleware(async () => {
      const user = await getUploadSession();
      return { userId: user.id };
    })
    .onUploadComplete(async ({ file }) => {
      return { url: file.ufsUrl || file.url };
    }),

  // Contratos laborales de empleados (PDF o imagen escaneada/fotografiada)
  contratoLaboral: f({
    pdf: { maxFileSize: "8MB", maxFileCount: 1 },
    image: { maxFileSize: "4MB", maxFileCount: 1 },
  })
    .middleware(async () => {
      const user = await getUploadSession();
      if (user.rol !== "ADMIN") {
        throw new UploadThingError("Solo administradores pueden cargar contratos laborales.");
      }
      return { userId: user.id };
    })
    .onUploadComplete(async ({ file }) => {
      return { url: file.ufsUrl || file.url };
    }),
} satisfies FileRouter;

export type OperacionesFileRouter = typeof operacionesFileRouter;
