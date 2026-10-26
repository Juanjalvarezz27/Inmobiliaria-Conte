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
  const seguridadPasswordHash = await bcrypt.hash("seguridad123", passwordSalt);

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
    where: { email: "jjsalvarezz@gmail.com" },
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
      email: "jjsalvarezz@gmail.com",
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

  // 4. Usuario Empleado Seguridad (Vigilante)
  const usuarioSeguridad = await prisma.usuario.upsert({
    where: { email: "seguridad@conte.com" },
    update: {
      passwordHash: seguridadPasswordHash,
      nombre: "Héctor",
      apellido: "Paredes",
      cedula: "V-20112233",
      telefono: "+58 414 5556677",
      direccion: "Garita de Vigilancia Principal",
      ubicacion: "Garita Principal de Vigilancia",
      rol: Rol.EMPLEADO,
      activo: true,
    },
    create: {
      email: "seguridad@conte.com",
      passwordHash: seguridadPasswordHash,
      nombre: "Héctor",
      apellido: "Paredes",
      cedula: "V-20112233",
      telefono: "+58 414 5556677",
      direccion: "Garita de Vigilancia Principal",
      ubicacion: "Garita Principal de Vigilancia",
      rol: Rol.EMPLEADO,
      activo: true,
    },
  });

  // 5. Obtener inmuebles para asignación de personal
  const primeraPropiedad = await prisma.propiedad.findFirst({
    orderBy: { createdAt: "asc" },
  });
  const segundaPropiedad = await prisma.propiedad.findFirst({
    skip: 1,
    orderBy: { createdAt: "asc" },
  });

  // 5. Perfil Empleado para Carlos Mendoza (asignado a primera propiedad, ej: Centro Comercial Gran Bazar)
  const empleadoPerfil = await prisma.empleado.upsert({
    where: { cedula: "V-18304050" },
    update: {
      nombre: "Carlos",
      apellido: "Mendoza",
      telefono: "+58 414 7654321",
      email: "jjsalvarezz@gmail.com",
      cargo: "TECNICO_MANTENIMIENTO",
      salarioMensual: 450,
      propiedadId: primeraPropiedad?.id || null,
      usuarioId: empleado.id,
      activo: true,
    },
    create: {
      nombre: "Carlos",
      apellido: "Mendoza",
      cedula: "V-18304050",
      telefono: "+58 414 7654321",
      email: "jjsalvarezz@gmail.com",
      direccion: "Sector Los Olivos, Calle 4",
      cargo: "TECNICO_MANTENIMIENTO",
      salarioMensual: 450,
      propiedadId: primeraPropiedad?.id || null,
      usuarioId: empleado.id,
      activo: true,
    },
  });

  // 6. Empleado Operativo Adicional (Conserje asignado a segunda propiedad)
  const conserjePerfil = await prisma.empleado.upsert({
    where: { cedula: "V-15890123" },
    update: {
      nombre: "José",
      apellido: "Rivas",
      telefono: "+58 412 9876543",
      cargo: "CONSERJE",
      salarioMensual: 350,
      propiedadId: segundaPropiedad?.id || primeraPropiedad?.id || null,
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
      propiedadId: segundaPropiedad?.id || primeraPropiedad?.id || null,
      activo: true,
    },
  });

  // 7. Perfil Empleado de Seguridad para Héctor Paredes
  const seguridadPerfil = await prisma.empleado.upsert({
    where: { cedula: "V-20112233" },
    update: {
      nombre: "Héctor",
      apellido: "Paredes",
      telefono: "+58 414 5556677",
      email: "seguridad@conte.com",
      direccion: "Garita de Vigilancia Principal",
      cargo: "SEGURIDAD",
      salarioMensual: 420,
      propiedadId: primeraPropiedad?.id || null,
      usuarioId: usuarioSeguridad.id,
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
      propiedadId: primeraPropiedad?.id || null,
      usuarioId: usuarioSeguridad.id,
      activo: true,
    },
  });

  // 8. Asistencia de hoy para Carlos Mendoza
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
        observaciones: null,
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
