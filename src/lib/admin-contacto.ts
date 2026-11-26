import { prisma } from "@/lib/prisma";
import { resolverTelefonoAdmin } from "@/lib/constants/contacto";

// Obtiene el teléfono vigente del administrador activo con respaldo en entorno y defecto
export async function obtenerTelefonoAdminActivo(): Promise<string> {
  const adminUsuario = await prisma.usuario.findFirst({
    where: { rol: "ADMIN", activo: true },
    select: { telefono: true },
    orderBy: { createdAt: "asc" },
  });

  return resolverTelefonoAdmin(
    adminUsuario?.telefono,
    process.env.ADMIN_WHATSAPP_PHONE
  );
}
