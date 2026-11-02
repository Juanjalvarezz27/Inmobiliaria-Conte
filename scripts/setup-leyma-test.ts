import { PrismaClient, EstadoPago, MetodoPago } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function prepararEscenarioLeyma() {
  console.log("=== INICIANDO PREPARACIÓN DEL ESCENARIO DE PRUEBA: LEYMA C.A ===");

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

  console.log(`Inquilino encontrado: ${inquilino.nombre} (ID: ${inquilino.id})`);

  // 2. Garantizar que el usuario tenga la contraseña "inquilino123"
  const passwordSalt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash("inquilino123", passwordSalt);

  if (inquilino.usuario) {
    await prisma.usuario.update({
      where: { id: inquilino.usuario.id },
      data: {
        passwordHash,
        activo: true,
        mustChangePassword: false,
      },
    });
    console.log(`Contraseña de ${inquilino.usuario.email} actualizada a 'inquilino123'.`);
  } else {
    console.warn("El inquilino no tiene usuario vinculado directo.");
  }

  // 3. Identificar los dos contratos
  const contratoN10 = inquilino.contratos.find((c) => c.unidad.codigo.includes("N-10"));
  const contratoN41 = inquilino.contratos.find((c) => c.unidad.codigo.includes("N-41"));

  if (!contratoN10 || !contratoN41) {
    throw new Error("No se encontraron los contratos N-10 y N-41 para LEYMA C.A.");
  }

  console.log(`Contrato N-10 ID: ${contratoN10.id} (Canon: $${contratoN10.montoAlquiler})`);
  console.log(`Contrato N-41 ID: ${contratoN41.id} (Canon: $${contratoN41.montoAlquiler})`);

  // 4. Configurar Pagos para CONTRATO N-10 ($20.00 USD)
  // -------------------------------------------------------------
  // Cuota Noviembre 2026: PENDIENTE limpia ($0 pagado de $20, sin transacciones, sin comprobante)
  const pagoN10Nov = contratoN10.pagos.find((p) => p.periodoMes === 11 && p.periodoAno === 2026);
  if (pagoN10Nov) {
    // Eliminar transacciones previas si existían
    await prisma.transaccionPago.deleteMany({
      where: { pagoId: pagoN10Nov.id },
    });

    await prisma.pago.update({
      where: { id: pagoN10Nov.id },
      data: {
        montoEsperado: 20.0,
        montoPagado: 0.0,
        estado: EstadoPago.PENDIENTE,
        comprobanteUrl: null,
        referencia: null,
        metodoPago: null,
        fechaPago: null,
        notas: null,
        fechaVencimiento: new Date("2026-11-02T12:00:00Z"),
      },
    });
    console.log("Contrato N-10 [Noviembre 2026]: Reseteado a PENDIENTE limpio ($20.00 por pagar).");
  } else {
    await prisma.pago.create({
      data: {
        contratoId: contratoN10.id,
        periodoMes: 11,
        periodoAno: 2026,
        montoEsperado: 20.0,
        montoPagado: 0.0,
        estado: EstadoPago.PENDIENTE,
        fechaVencimiento: new Date("2026-11-02T12:00:00Z"),
      },
    });
    console.log("Contrato N-10 [Noviembre 2026]: Creado PENDIENTE limpio ($20.00 por pagar).");
  }

  // Cuota Octubre 2026: PAGADO ($20.00 pagado, con recibo listo)
  const pagoN10Oct = contratoN10.pagos.find((p) => p.periodoMes === 10 && p.periodoAno === 2026);
  if (pagoN10Oct) {
    await prisma.pago.update({
      where: { id: pagoN10Oct.id },
      data: {
        montoEsperado: 20.0,
        montoPagado: 20.0,
        estado: EstadoPago.PAGADO,
        fechaPago: new Date("2026-10-02T15:30:00Z"),
        metodoPago: MetodoPago.PAGO_MOVIL,
        referencia: "PM-984321",
        comprobanteUrl: "https://12p6xoorve.ufs.sh/f/2EXceoN4JpzjD9rf3sTbOc1yCKsGUgRxTBDabXVpew4q0HJf",
        notas: "Pago mensual solventado puntualmente.",
      },
    });
    // Garantizar que tenga su transacción en el libro mayor
    const txCount = await prisma.transaccionPago.count({ where: { pagoId: pagoN10Oct.id } });
    if (txCount === 0) {
      await prisma.transaccionPago.create({
        data: {
          pagoId: pagoN10Oct.id,
          monto: 20.0,
          metodoPago: MetodoPago.PAGO_MOVIL,
          referencia: "PM-984321",
          comprobanteUrl: "https://12p6xoorve.ufs.sh/f/2EXceoN4JpzjD9rf3sTbOc1yCKsGUgRxTBDabXVpew4q0HJf",
          fechaPago: new Date("2026-10-02T15:30:00Z"),
        },
      });
    }
    console.log("Contrato N-10 [Octubre 2026]: Configurado como PAGADO ($20.00 con comprobante y recibo).");
  }

  // 5. Configurar Pagos para CONTRATO N-41 ($30.00 USD)
  // -------------------------------------------------------------
  // Cuota Noviembre 2026: PARCIAL ($10 pagado, Saldo pendiente: $20.00, con 1 abono en el libro mayor)
  const pagoN41Nov = contratoN41.pagos.find((p) => p.periodoMes === 11 && p.periodoAno === 2026);
  if (pagoN41Nov) {
    // Limpiar transacciones y dejar 1 sola de $10
    await prisma.transaccionPago.deleteMany({
      where: { pagoId: pagoN41Nov.id },
    });

    await prisma.transaccionPago.create({
      data: {
        pagoId: pagoN41Nov.id,
        monto: 10.0,
        metodoPago: MetodoPago.EFECTIVO_USD,
        referencia: "ABONO-10-USD",
        fechaPago: new Date("2026-11-01T10:00:00Z"),
        notas: "Primer abono parcial en efectivo recibido en oficina.",
      },
    });

    await prisma.pago.update({
      where: { id: pagoN41Nov.id },
      data: {
        montoEsperado: 30.0,
        montoPagado: 10.0,
        estado: EstadoPago.PARCIAL,
        comprobanteUrl: null,
        referencia: null,
        metodoPago: MetodoPago.EFECTIVO_USD,
        fechaPago: new Date("2026-11-01T10:00:00Z"),
        notas: "Abono inicial de $10.00 USD asentado.",
        fechaVencimiento: new Date("2026-11-12T12:00:00Z"),
      },
    });
    console.log("Contrato N-41 [Noviembre 2026]: Configurado como PARCIAL (Esperado: $30, Abonado: $10, Pendiente: $20).");
  }

  // Cuota Octubre 2026: PAGADO ($30.00)
  const pagoN41Oct = contratoN41.pagos.find((p) => p.periodoMes === 10 && p.periodoAno === 2026);
  if (pagoN41Oct) {
    await prisma.pago.update({
      where: { id: pagoN41Oct.id },
      data: {
        montoEsperado: 30.0,
        montoPagado: 30.0,
        estado: EstadoPago.PAGADO,
        fechaPago: new Date("2026-10-12T14:00:00Z"),
        metodoPago: MetodoPago.EFECTIVO_USD,
        referencia: "RECIBO-OCT-41",
        comprobanteUrl: null,
        notas: "Solventado en efectivo.",
      },
    });
    console.log("Contrato N-41 [Octubre 2026]: Configurado como PAGADO ($30.00).");
  }

  console.log("\n=== ESCENARIO CONFIGURADO CON ÉXITO ===");
}

prepararEscenarioLeyma()
  .catch((err) => {
    console.error("Error preparando escenario:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

