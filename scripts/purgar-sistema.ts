import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const ADMIN_EMAIL = "fabianinmoconte@gmail.com";

// Script para purgar completamente la base de datos dejando únicamente el usuario administrador principal
async function main() {
  console.log("=============================================================");
  console.log("    INMOBILIARIA CONTE - PURGA DE BASE DE DATOS (PRODUCCIÓN)");
  console.log("=============================================================");

  // 1. Verificar existencia del Administrador principal antes de proceder
  const admin = await prisma.usuario.findUnique({
    where: { email: ADMIN_EMAIL },
  });

  if (!admin) {
    throw new Error(
      `Abortando: No se encontró al usuario administrador (${ADMIN_EMAIL}) en la base de datos. Ninguna tabla fue modificada.`
    );
  }

  console.log(`Usuario Administrador preservado: ${admin.nombre} ${admin.apellido || ""} (${admin.email}) [Rol: ${admin.rol}]`);
  console.log("Iniciando purga en orden estricto de integridad referencial...");

  // 2. Ejecución atómica en transacción
  const resultado = await prisma.$transaction(async (tx) => {
    // Tablas dependientes de nivel 3 (novedades de minutas)
    const novedadesMinuta = await tx.novedadMinuta.deleteMany();

    // Tablas dependientes de nivel 2 (minutas, tickets, tareas, asistencias, abonos)
    const minutas = await tx.minutaGuardia.deleteMany();
    const tickets = await tx.ticketMantenimiento.deleteMany();
    const tareas = await tx.tareaEmpleado.deleteMany();
    const asistencias = await tx.registroAsistencia.deleteMany();
    const transaccionesPago = await tx.transaccionPago.deleteMany();

    // Tablas dependientes de nivel 1 (pagos de contratos)
    const pagos = await tx.pago.deleteMany();

    // Contratos y transacciones financieras
    const contratos = await tx.contrato.deleteMany();
    const transaccionesFinancieras = await tx.transaccionFinanciera.deleteMany();

    // Unidades, Inquilinos y Empleados
    const unidades = await tx.unidad.deleteMany();
    const inquilinos = await tx.inquilino.deleteMany();
    const empleados = await tx.empleado.deleteMany();

    // Propiedades
    const propiedades = await tx.propiedad.deleteMany();

    // Usuarios demo (todos excepto el administrador principal)
    const usuariosDemo = await tx.usuario.deleteMany({
      where: {
        email: { not: ADMIN_EMAIL },
      },
    });

    return {
      novedadesMinuta: novedadesMinuta.count,
      minutas: minutas.count,
      tickets: tickets.count,
      tareas: tareas.count,
      asistencias: asistencias.count,
      transaccionesPago: transaccionesPago.count,
      pagos: pagos.count,
      contratos: contratos.count,
      transaccionesFinancieras: transaccionesFinancieras.count,
      unidades: unidades.count,
      inquilinos: inquilinos.count,
      empleados: empleados.count,
      propiedades: propiedades.count,
      usuariosDemo: usuariosDemo.count,
    };
  });

  console.log("\n--- REGISTROS PURGADOS CON ÉXITO ---");
  console.table(resultado);

  // 3. Auditoría posterior a la purga
  const totalUsuarios = await prisma.usuario.count();
  const totalPropiedades = await prisma.propiedad.count();
  const totalContratos = await prisma.contrato.count();

  console.log("\n--- ESTADO FINAL DE LA BASE DE DATOS ---");
  console.log(`Usuarios en sistema:    ${totalUsuarios} (Solo ${ADMIN_EMAIL})`);
  console.log(`Propiedades registradas: ${totalPropiedades}`);
  console.log(`Contratos activos:       ${totalContratos}`);
  console.log("=============================================================");
  console.log("El sistema ha quedado 100% limpio y listo para producción.");
  console.log("=============================================================");
}

main()
  .catch((e) => {
    console.error("Error crítico durante la purga de la base de datos:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
