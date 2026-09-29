import { PrismaClient, Rol } from "@prisma/client";
import bcrypt from "bcryptjs";

// Instancia aislada de Prisma para el script de seed
const prisma = new PrismaClient();

async function main() {
  // Contraseña base para pruebas
  const passwordSalt = await bcrypt.genSalt(10);
  const adminPasswordHash = await bcrypt.hash("admin123", passwordSalt);
  const empleadoPasswordHash = await bcrypt.hash("empleado123", passwordSalt);
  const inquilinoPasswordHash = await bcrypt.hash("inquilino123", passwordSalt);

  // 1. Usuario Administrador
  const admin = await prisma.usuario.upsert({
    where: { email: "admin@conte.com" },
    update: {
      passwordHash: adminPasswordHash,
      nombre: "Fabián",
      apellido: "Conte",
      cedula: "V-10203040",
      telefono: "+58 412 1234567",
      direccion: "Oficina Central Inmobiliaria Conte",
      ubicacion: "Sede Principal",
      rol: Rol.ADMIN,
      activo: true,
    },
    create: {
      email: "admin@conte.com",
      passwordHash: adminPasswordHash,
      nombre: "Fabián",
      apellido: "Conte",
      cedula: "V-10203040",
      telefono: "+58 412 1234567",
      direccion: "Oficina Central Inmobiliaria Conte",
      ubicacion: "Sede Principal",
      rol: Rol.ADMIN,
      activo: true,
    },
  });

  // 2. Usuario Empleado
  const empleado = await prisma.usuario.upsert({
    where: { email: "empleado@conte.com" },
    update: {
      passwordHash: empleadoPasswordHash,
      nombre: "Carlos",
      apellido: "Mendoza",
      cedula: "V-18304050",
      telefono: "+58 414 7654321",
      direccion: "Sector Los Olivos, Calle 4",
      ubicacion: "Zona Norte - Mantenimiento",
      rol: Rol.EMPLEADO,
      activo: true,
    },
    create: {
      email: "empleado@conte.com",
      passwordHash: empleadoPasswordHash,
      nombre: "Carlos",
      apellido: "Mendoza",
      cedula: "V-18304050",
      telefono: "+58 414 7654321",
      direccion: "Sector Los Olivos, Calle 4",
      ubicacion: "Zona Norte - Mantenimiento",
      rol: Rol.EMPLEADO,
      activo: true,
    },
  });

  // 3. Usuario Inquilino
  const inquilino = await prisma.usuario.upsert({
    where: { email: "inquilino@conte.com" },
    update: {
      passwordHash: inquilinoPasswordHash,
      nombre: "María",
      apellido: "González",
      cedula: "V-22405060",
      telefono: "+58 424 9876543",
      direccion: "Local 14, Centro Comercial Conte Plaza",
      ubicacion: "CC Conte Plaza",
      rol: Rol.INQUILINO,
      activo: true,
    },
    create: {
      email: "inquilino@conte.com",
      passwordHash: inquilinoPasswordHash,
      nombre: "María",
      apellido: "González",
      cedula: "V-22405060",
      telefono: "+58 424 9876543",
      direccion: "Local 14, Centro Comercial Conte Plaza",
      ubicacion: "CC Conte Plaza",
      rol: Rol.INQUILINO,
      activo: true,
    },
  });

  console.log("Usuarios de prueba creados exitosamente:");
  console.log(`- Admin: ${admin.email} (rol: ${admin.rol})`);
  console.log(`- Empleado: ${empleado.email} (rol: ${empleado.rol})`);
  console.log(`- Inquilino: ${inquilino.email} (rol: ${inquilino.rol})`);
}

main()
  .catch((e) => {
    console.error("Error al ejecutar seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
