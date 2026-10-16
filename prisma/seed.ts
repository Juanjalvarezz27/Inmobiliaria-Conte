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

  // 4. Perfil Empleado para Carlos Mendoza
  const empleadoPerfil = await prisma.empleado.upsert({
    where: { cedula: "V-18304050" },
    update: {
      nombre: "Carlos",
      apellido: "Mendoza",
      telefono: "+58 414 7654321",
      email: "empleado@conte.com",
      cargo: "TECNICO_MANTENIMIENTO",
      salarioMensual: 450,
      usuarioId: empleado.id,
      activo: true,
    },
    create: {
      nombre: "Carlos",
      apellido: "Mendoza",
      cedula: "V-18304050",
      telefono: "+58 414 7654321",
      email: "empleado@conte.com",
      direccion: "Sector Los Olivos, Calle 4",
      cargo: "TECNICO_MANTENIMIENTO",
      salarioMensual: 450,
      usuarioId: empleado.id,
      activo: true,
    },
  });

  // 5. Empleado Operativo Adicional (Conserje)
  const conserjePerfil = await prisma.empleado.upsert({
    where: { cedula: "V-15890123" },
    update: {
      nombre: "José",
      apellido: "Rivas",
      telefono: "+58 412 9876543",
      cargo: "CONSERJE",
      salarioMensual: 350,
      activo: true,
    },
    create: {
      nombre: "José",
      apellido: "Rivas",
      cedula: "V-15890123",
      telefono: "+58 412 9876543",
      direccion: "Barrio Obrero, Carrera 18",
      cargo: "CONSERJE",
      salarioMensual: 350,
      activo: true,
    },
  });

  // 6. Asistencia de hoy para Carlos Mendoza
  const hoy = new Date();
  const inicioDia = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate(), 7, 30, 0);

  const asistenciaExistente = await prisma.registroAsistencia.findFirst({
    where: {
      empleadoId: empleadoPerfil.id,
      fecha: {
        gte: new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate(), 0, 0, 0),
      },
    },
  });

  if (!asistenciaExistente) {
    await prisma.registroAsistencia.create({
      data: {
        empleadoId: empleadoPerfil.id,
        fecha: hoy,
        horaEntrada: inicioDia,
        estado: "PRESENTE",
        ubicacionEntrada: "Sede Administrativa Principal",
        observaciones: "Entrada puntual en turno matutino.",
      },
    });
  }

  // 7. Tarea operativa de ejemplo
  const tareaExistente = await prisma.tareaEmpleado.findFirst({
    where: { empleadoId: empleadoPerfil.id },
  });

  if (!tareaExistente) {
    await prisma.tareaEmpleado.create({
      data: {
        empleadoId: empleadoPerfil.id,
        titulo: "Revisión preventiva del sistema hidroneumático",
        descripcion: "Comprobar presiones del pulmón y limpiar filtros en el cuarto de máquinas.",
        prioridad: "ALTA",
        estado: "PENDIENTE",
        fechaLimite: new Date(hoy.getTime() + 86400000), // Mañana
        evidencias: [],
      },
    });
  }

  console.log("Usuarios y colaboradores de prueba creados exitosamente:");
  console.log(`- Admin: ${admin.email} (rol: ${admin.rol})`);
  console.log(`- Empleado con portal: ${empleado.email} (colaborador: ${empleadoPerfil.nombre})`);
  console.log(`- Empleado operativo: ${conserjePerfil.nombre} ${conserjePerfil.apellido}`);
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
