import { createUploadthing, type FileRouter } from "uploadthing/next";
import { UploadThingError } from "uploadthing/server";
import { auth } from "@/auth";

// Router para el catálogo de unidades y espacios
const f = createUploadthing();

// Helper de validación de rol administrativo
async function requireAdminUpload() {
  const session = await auth();
  if (!session?.user?.id || session.user.rol !== "ADMIN") {
    throw new UploadThingError("Solo administradores pueden subir fotos al catálogo de propiedades.");
  }
  return { userId: session.user.id };
}

export const propiedadesFileRouter = {
  // Fotos de una unidad (locales, apartamentos, oficinas, casas) - hasta 3 fotos
  fotosUnidad: f({
    image: { maxFileSize: "4MB", maxFileCount: 3 },
  })
    .middleware(requireAdminUpload)
    .onUploadComplete(async ({ file }) => {
      return { url: file.ufsUrl || file.url };
    }),

  // Alias fotosLocal para retrocompatibilidad
  fotosLocal: f({
    image: { maxFileSize: "4MB", maxFileCount: 3 },
  })
    .middleware(requireAdminUpload)
    .onUploadComplete(async ({ file }) => {
      return { url: file.ufsUrl || file.url };
    }),
} satisfies FileRouter;

export type PropiedadesFileRouter = typeof propiedadesFileRouter;
