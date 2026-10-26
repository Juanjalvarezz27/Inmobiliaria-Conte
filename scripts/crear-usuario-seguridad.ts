import { PrismaClient, Rol } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Creando o actualizando usuario de Seguridad...");

  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash("seguridad123", salt);

  // 1. Obtener una propiedad para asignarlo
  const propiedad = await prisma.propiedad.findFirst({
    orderBy: { createdAt: "asc" },
  });

  if (!propiedad) {
    console.error("No se encontró ninguna propiedad en la base de datos.");
    return;
  }

  // 2. Crear o actualizar usuario
  const usuario = await prisma.usuario.upsert({
    where: { email: "seguridad@conte.com" },
    update: {
      passwordHash,
      nombre: "Héctor",
      apellido: "Paredes",
      cedula: "V-20112233",
      telefono: "+58 414 5556677",
      direccion: "Garita de Vigilancia Principal",
      ubicacion: `Garita - ${propiedad.nombre}`,
      rol: Rol.EMPLEADO,
      activo: true,
    },
    create: {
      email: "seguridad@conte.com",
      passwordHash,
      nombre: "Héctor",
      apellido: "Paredes",
      cedula: "V-20112233",
      telefono: "+58 414 5556677",
      direccion: "Garita de Vigilancia Principal",
      ubicacion: `Garita - ${propiedad.nombre}`,
      rol: Rol.EMPLEADO,
      activo: true,
    },
  });

  console.log(`Usuario creado/actualizado con ID: ${usuario.id}`);

  // 3. Crear o actualizar perfil de Empleado con cargo SEGURIDAD
  const empleado = await prisma.empleado.upsert({
    where: { cedula: "V-20112233" },
    update: {
      nombre: "Héctor",
      apellido: "Paredes",
      telefono: "+58 414 5556677",
      email: "seguridad@conte.com",
      direccion: "Garita de Vigilancia Principal",
      cargo: "SEGURIDAD",
      salarioMensual: 420,
      propiedadId: propiedad.id,
      usuarioId: usuario.id,
      activo: true,
    },
    create: {
      nombre: "Héctor",
      apellido: "Paredes",
      cedula: "V-20112233",
      telefono: "+58 414 5556677",
      email: "seguridad@conte.com",
      direccion: "Garita de Vigilancia Principal",
      cargo: "SEGURIDAD",
      salarioMensual: 420,
      propiedadId: propiedad.id,
      usuarioId: usuario.id,
      activo: true,
    },
  });

  console.log(`Empleado de Seguridad creado/actualizado con ID: ${empleado.id}`);
  console.log("------------------------------------------");
  console.log("Credenciales de acceso:");
  console.log("Correo:      seguridad@conte.com");
  console.log("Contraseña:  seguridad123");
  console.log("Cargo:       SEGURIDAD");
  console.log(`Inmueble:    ${propiedad.nombre}`);
  console.log("------------------------------------------");
}

main()
  .catch((e) => {
    console.error("Error al crear usuario de seguridad:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
