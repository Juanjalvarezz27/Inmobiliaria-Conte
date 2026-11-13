import { PrismaClient, EstadoPago, MetodoPago } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function prepararEscenarioRechazo() {
  console.log("=== CONFIGURANDO ESCENARIO DE PRUEBA: RECHAZO DE PAGO ===");

  // 1. Buscar el inquilino LEYMA C.A
  const inquilino = await prisma.inquilino.findFirst({
    where: { nombre: { contains: "LEYMA" } },
    include: {
      usuario: true,
      contratos: {
        include: {
          unidad: { include: { propiedad: true } },
          pagos: {
            include: { transacciones: true },
            orderBy: [{ periodoAno: "desc" }, { periodoMes: "desc" }],
          },
        },
      },
    },
  });

  if (!inquilino) {
    throw new Error("No se encontró el inquilino LEYMA C.A en la base de datos.");
  }

  // 2. Garantizar contraseña conocida
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash("inquilino123", salt);
  if (inquilino.usuario) {
    await prisma.usuario.update({
      where: { id: inquilino.usuario.id },
      data: { passwordHash, activo: true, mustChangePassword: false },
    });
  }

  // 3. Obtener el contrato N-10 ($20.00 USD)
  const contratoN10 = inquilino.contratos.find((c) => c.unidad.codigo.includes("N-10"));
  if (!contratoN10) {
    throw new Error("No se encontró el contrato N-10.");
  }

  // 4. Configurar el canon de Noviembre 2026 en estado 'Por Confirmar' con capture dudoso
  const pagoN10Nov = contratoN10.pagos.find((p) => p.periodoMes === 11 && p.periodoAno === 2026);

  // Limpiar transacciones si existían
  if (pagoN10Nov) {
    await prisma.transaccionPago.deleteMany({
      where: { pagoId: pagoN10Nov.id },
    });

    await prisma.pago.update({
      where: { id: pagoN10Nov.id },
      data: {
        montoEsperado: 20.0,
        montoPagado: 0.0,
        estado: EstadoPago.PENDIENTE,
        comprobanteUrl: "https://12p6xoorve.ufs.sh/f/2EXceoN4JpzjD9rf3sTbOc1yCKsGUgRxTBDabXVpew4q0HJf",
        referencia: "PM-DUDOSA-9912",
        metodoPago: MetodoPago.PAGO_MOVIL,
        fechaPago: new Date(),
        notas: "Reportado por inquilino: PM-DUDOSA-9912 ($20.00) el 2026-11-01.",
        fechaVencimiento: new Date("2026-11-02T12:00:00Z"),
      },
    });
  } else {
    await prisma.pago.create({
      data: {
        contratoId: contratoN10.id,
        periodoMes: 11,
        periodoAno: 2026,
        montoEsperado: 20.0,
        montoPagado: 0.0,
        estado: EstadoPago.PENDIENTE,
        comprobanteUrl: "https://12p6xoorve.ufs.sh/f/2EXceoN4JpzjD9rf3sTbOc1yCKsGUgRxTBDabXVpew4q0HJf",
        referencia: "PM-DUDOSA-9912",
        metodoPago: MetodoPago.PAGO_MOVIL,
        fechaPago: new Date(),
        notas: "Reportado por inquilino: PM-DUDOSA-9912 ($20.00) el 2026-11-01.",
        fechaVencimiento: new Date("2026-11-02T12:00:00Z"),
      },
    });
  }

  console.log("\n✅ ¡ESCENARIO DE RECHAZO CONFIGURADO EXITOSAMENTE!");
  console.log("------------------------------------------------------------------");
  console.log("Inquilino: LEYMA C.A (Correo: jjsa6109+inquilino@gmail.com / Clave: inquilino123)");
  console.log("Inmueble: C.C. Los Andes • Local N-10");
  console.log("Mes: Noviembre 2026");
  console.log("Monto: $20.00 USD");
  console.log("Estado actual: POR CONFIRMAR (Tiene comprobante y ref 'PM-DUDOSA-9912')");
  console.log("------------------------------------------------------------------\n");
}

prepararEscenarioRechazo()
  .catch((e) => {
    console.error("Error al preparar escenario de rechazo:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

