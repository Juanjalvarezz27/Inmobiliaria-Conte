import { PrismaClient, Rol } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const ADMIN_EMAIL = "fabianinmoconte@gmail.com";

// Seed de producción: asegura exclusivamente la existencia del usuario Administrador principal
async function main() {
  console.log("Verificando usuario Administrador principal para entorno de producción...");

  const adminExistente = await prisma.usuario.findUnique({
    where: { email: ADMIN_EMAIL },
  });

  if (adminExistente) {
    console.log(`El usuario Administrador (${ADMIN_EMAIL}) ya existe en la base de datos.`);
    return;
  }

  // Si no existe, se crea con credenciales iniciales
  const passwordHash = await bcrypt.hash("27306275", 10);

  const admin = await prisma.usuario.create({
    data: {
      email: ADMIN_EMAIL,
      passwordHash: passwordHash,
      nombre: "Fabian",
      apellido: "Conte",
      cedula: "V-27306275",
      telefono: "+58 412 1234567",
      direccion: "Oficina Administrativa Central",
      ubicacion: "Sede Principal",
      rol: Rol.ADMIN,
      activo: true,
      mustChangePassword: false,
    },
  });

  console.log(`Usuario Administrador creado exitosamente: ${admin.email} (Rol: ${admin.rol})`);
}

main()
  .catch((e) => {
    console.error("Error al ejecutar seed de producción:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
