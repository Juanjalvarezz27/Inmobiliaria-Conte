import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

export type SemaforoEstado = "AL_DIA" | "POR_PAGAR" | "EN_MORA" | "SIN_CONTRATO";

export interface ResumenFinancieroInquilino {
  semaforoEstado: SemaforoEstado;
  montoCanonTotal: number;
  montoMensualidadTotal: number;
  montoDeudaVencida: number;
  cuotasVencidasCount: number;
  periodosVencidos: string[];
  periodoVencidoTexto: string | null;
  montoPorPagar: number;
  diasParaVencer: number | null;
  fechaProximoVencimiento: string | null;
  periodoProximoVencimiento: string | null;
  ultimoPeriodoPagado: string | null;
  proximoDiaCorte: number | null;
  totalLocalesActivos: number;
  detalleEspacioPrincipal: string | null;
  mesesRestantesContrato: number | null;
  codigoContratoPrincipal: string | null;
  cuotasPagadasCount: number;
  montoDepositoGarantia: number | null;
  esAdminModoSupervision: boolean;
  inquilinoNombre: string;
  documentoIdentidad: string;
}

export interface LocalArrendadoResumen {
  id: string;
  codigoLocal: string;
  propiedadNombre: string;
  tipoPropiedad: string;
  tipoUnidad: string;
  piso: string | null;
  areaMt2: number | null;
  canonMensual: number;
  mensualidad: number;
  contratoCodigo: string;
  contratoId: string;
  diaCobro: number;
  fechaInicio: string;
  fechaFin: string;
  documentoUrl: string | null;
}

export interface InquilinoContratoDetalle {
  id: string;
  codigo: string;
  estado: string;
  fechaInicio: string;
  fechaFin: string;
  diaCobro: number;
  montoAlquiler: number;
  moneda: string;
  documentoUrl: string | null;
  notas: string | null;
  mesesTotales: number;
  mesesRestantes: number;
  porcentajeTranscurrido: number;
  unidad: {
    id: string;
    codigo: string;
    tipo: string;
    piso: string | null;
    areaMt2: number | null;
    descripcion: string | null;
    imagenes: string[];
    propiedad: {
      id: string;
      nombre: string;
      tipo: string;
      direccion: string;
      ciudad: string;
      telefonoContacto: string | null;
    };
  };
  deposito: {
    monto: number | null;
    estado: string;
    fechaCobro: string | null;
    metodoPago: string | null;
    referencia: string | null;
    comprobanteUrl: string | null;
    notas: string | null;
  };
  pagosResumen: {
    totalPagados: number;
    totalPendientes: number;
    totalVencidos: number;
  };
}

const NOMBRES_MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
];

// 1. Obtener datos financieros consolidados para el Dashboard del inquilino
export async function getInquilinoDashboardData(): Promise<{
  resumen: ResumenFinancieroInquilino;
  locales: LocalArrendadoResumen[];
}> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("No autenticado");
  }

  // Buscar el perfil Inquilino vinculado al usuario
  let inquilino = await prisma.inquilino.findUnique({
    where: { usuarioId: session.user.id },
    include: {
      contratos: {
        where: { estado: { in: ["ACTIVO", "POR_VENCER"] } },
        include: {
          unidad: { include: { propiedad: true } },
          pagos: { orderBy: [{ periodoAno: "desc" }, { periodoMes: "desc" }] },
        },
      },
    },
  });

  // Si no se encuentra por usuarioId, intentar buscar por correo electrónico
  if (!inquilino && session.user.email) {
    inquilino = await prisma.inquilino.findFirst({
      where: { email: session.user.email },
      include: {
        contratos: {
          where: { estado: { in: ["ACTIVO", "POR_VENCER"] } },
          include: {
            unidad: { include: { propiedad: true } },
            pagos: { orderBy: [{ periodoAno: "desc" }, { periodoMes: "desc" }] },
          },
        },
      },
    });
  }

  // Si es Administrador y no tiene perfil de inquilino propio, activar Modo Supervisión
  let esAdminModoSupervision = false;
  if (!inquilino && session.user.rol === "ADMIN") {
    esAdminModoSupervision = true;
    inquilino = await prisma.inquilino.findFirst({
      where: { activo: true, contratos: { some: { estado: { in: ["ACTIVO", "POR_VENCER"] } } } },
      include: {
        contratos: {
          where: { estado: { in: ["ACTIVO", "POR_VENCER"] } },
          include: {
            unidad: { include: { propiedad: true } },
            pagos: { orderBy: [{ periodoAno: "desc" }, { periodoMes: "desc" }] },
          },
        },
      },
    });
  }

  if (!inquilino || inquilino.contratos.length === 0) {
    return {
      resumen: {
        semaforoEstado: "SIN_CONTRATO",
        montoCanonTotal: 0,
        montoMensualidadTotal: 0,
        montoDeudaVencida: 0,
        cuotasVencidasCount: 0,
        periodosVencidos: [],
        periodoVencidoTexto: null,
        montoPorPagar: 0,
        diasParaVencer: null,
        fechaProximoVencimiento: null,
        periodoProximoVencimiento: null,
        ultimoPeriodoPagado: null,
        proximoDiaCorte: null,
        totalLocalesActivos: 0,
        detalleEspacioPrincipal: null,
        mesesRestantesContrato: null,
        codigoContratoPrincipal: null,
        cuotasPagadasCount: 0,
        montoDepositoGarantia: null,
        esAdminModoSupervision,
        inquilinoNombre: inquilino?.nombre || session.user.nombre || "Inquilino",
        documentoIdentidad: inquilino?.documentoIdentidad || "Sin documento",
      },
      locales: [],
    };
  }

  const ahora = new Date();
  const mesActual = ahora.getMonth() + 1;
  const anoActual = ahora.getFullYear();

  let montoMensualidadTotal = 0;
  let montoDeudaVencida = 0;
  let cuotasVencidasCount = 0;
  let cuotasPagadasCount = 0;
  let montoPorPagar = 0;
  let proximoVencimiento: Date | null = null;
  let periodoProximoVencimiento: string | null = null;
  let proximoDiaCorte: number | null = null;
  let tieneCuotaMesActualImpaga = false;

  let ultimoPeriodoAnoMes = 0;
  let ultimoPeriodoPagado: string | null = null;
  const periodosVencidos: string[] = [];

  const locales: LocalArrendadoResumen[] = [];

  for (const contrato of inquilino.contratos) {
    montoMensualidadTotal += contrato.montoAlquiler;
    if (proximoDiaCorte === null || contrato.diaCobro < proximoDiaCorte) {
      proximoDiaCorte = contrato.diaCobro;
    }

    locales.push({
      id: contrato.unidad.id,
      codigoLocal: contrato.unidad.codigo,
      propiedadNombre: contrato.unidad.propiedad.nombre,
      tipoPropiedad: contrato.unidad.propiedad.tipo,
      tipoUnidad: contrato.unidad.tipo,
      piso: contrato.unidad.piso,
      areaMt2: contrato.unidad.areaMt2,
      canonMensual: contrato.montoAlquiler,
      mensualidad: contrato.montoAlquiler,
      contratoCodigo: contrato.codigo,
      contratoId: contrato.id,
      diaCobro: contrato.diaCobro,
      fechaInicio: contrato.fechaInicio.toISOString(),
      fechaFin: contrato.fechaFin.toISOString(),
      documentoUrl: contrato.documentoUrl,
    });

    // Evaluar pagos asociados al contrato
    for (const pago of contrato.pagos) {
      const saldoPendiente = Math.max(0, pago.montoEsperado - pago.montoPagado);
      
      if (saldoPendiente <= 0) {
        cuotasPagadasCount += 1;
        // Cuota solventada
        const peso = pago.periodoAno * 100 + pago.periodoMes;
        if (peso > ultimoPeriodoAnoMes) {
          ultimoPeriodoAnoMes = peso;
          ultimoPeriodoPagado = `${NOMBRES_MESES[pago.periodoMes - 1]} ${pago.periodoAno}`;
        }
        continue;
      }

      const fechaVenc = new Date(pago.fechaVencimiento);
      const estaVencido = pago.estado === "VENCIDO" || fechaVenc < ahora;

      if (pago.periodoAno === anoActual && pago.periodoMes === mesActual) {
        tieneCuotaMesActualImpaga = true;
      }

      if (estaVencido) {
        montoDeudaVencida += saldoPendiente;
        cuotasVencidasCount += 1;
        const nombrePeriodo = `${NOMBRES_MESES[pago.periodoMes - 1]} ${pago.periodoAno}`;
        if (!periodosVencidos.includes(nombrePeriodo)) {
          periodosVencidos.push(nombrePeriodo);
        }
      } else {
        montoPorPagar += saldoPendiente;
        if (!proximoVencimiento || fechaVenc < proximoVencimiento) {
          proximoVencimiento = fechaVenc;
          periodoProximoVencimiento = `${NOMBRES_MESES[pago.periodoMes - 1]} ${pago.periodoAno}`;
        }
      }
    }
  }

  // Datos contractuales adicionales para métricas clave
  let mesesRestantesContrato: number | null = null;
  let codigoContratoPrincipal: string | null = null;
  let montoDepositoGarantia: number | null = null;
  let detalleEspacioPrincipal: string | null = null;

  if (inquilino.contratos.length > 0) {
    const primerContrato = inquilino.contratos[0];
    codigoContratoPrincipal = primerContrato.codigo;
    const diffMeses = (primerContrato.fechaFin.getFullYear() - ahora.getFullYear()) * 12 +
                      (primerContrato.fechaFin.getMonth() - ahora.getMonth());
    mesesRestantesContrato = Math.max(0, diffMeses);

    if (primerContrato.depositoGarantia && primerContrato.depositoEstado === "COBRADO") {
      montoDepositoGarantia = primerContrato.depositoGarantia;
    }
  }

  if (locales.length > 0) {
    detalleEspacioPrincipal = `${locales[0].propiedadNombre} • ${locales[0].codigoLocal}`;
  }

  let diasParaVencer: number | null = null;
  if (proximoVencimiento) {
    const diffMs = proximoVencimiento.getTime() - ahora.getTime();
    diasParaVencer = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
  }

  let semaforoEstado: SemaforoEstado = "AL_DIA";
  const periodoVencidoTexto = periodosVencidos.length > 0 ? periodosVencidos.join(", ") : null;

  if (montoDeudaVencida > 0) {
    // 1. Hay cuotas vencidas impagas
    semaforoEstado = "EN_MORA";
  } else if (tieneCuotaMesActualImpaga) {
    // 2. La cuota del mes en curso está impaga
    semaforoEstado = "POR_PAGAR";
  } else if (montoPorPagar > 0 && diasParaVencer !== null && diasParaVencer <= 5) {
    // 3. La cuota del próximo mes está a 5 días o menos de vencer (ventana de cobro regular)
    semaforoEstado = "POR_PAGAR";
  } else {
    // 4. El mes actual está completamente solvente y la siguiente cuota aún no entra en ventana de cobro
    semaforoEstado = "AL_DIA";
  }

  return {
    resumen: {
      semaforoEstado,
      montoCanonTotal: montoMensualidadTotal,
      montoMensualidadTotal,
      montoDeudaVencida,
      cuotasVencidasCount,
      periodosVencidos,
      periodoVencidoTexto,
      montoPorPagar,
      diasParaVencer,
      fechaProximoVencimiento: proximoVencimiento ? proximoVencimiento.toISOString() : null,
      periodoProximoVencimiento,
      ultimoPeriodoPagado,
      proximoDiaCorte,
      totalLocalesActivos: locales.length,
      detalleEspacioPrincipal,
      mesesRestantesContrato,
      codigoContratoPrincipal,
      cuotasPagadasCount,
      montoDepositoGarantia,
      esAdminModoSupervision,
      inquilinoNombre: `${inquilino.nombre} ${inquilino.apellido || ""}`.trim(),
      documentoIdentidad: inquilino.documentoIdentidad,
    },
    locales,
  };
}

// 2. Obtener lista detallada de contratos del inquilino autenticado
export async function getInquilinoContratosData(): Promise<{
  contratos: InquilinoContratoDetalle[];
  esAdminModoSupervision: boolean;
  inquilinoNombre: string;
  documentoIdentidad: string;
}> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("No autenticado");
  }

  let inquilino = await prisma.inquilino.findUnique({
    where: { usuarioId: session.user.id },
    include: {
      contratos: {
        orderBy: { createdAt: "desc" },
        include: {
          unidad: { include: { propiedad: true } },
          pagos: true,
        },
      },
    },
  });

  if (!inquilino && session.user.email) {
    inquilino = await prisma.inquilino.findFirst({
      where: { email: session.user.email },
      include: {
        contratos: {
          orderBy: { createdAt: "desc" },
          include: {
            unidad: { include: { propiedad: true } },
            pagos: true,
          },
        },
      },
    });
  }

  let esAdminModoSupervision = false;
  if (!inquilino && session.user.rol === "ADMIN") {
    esAdminModoSupervision = true;
    inquilino = await prisma.inquilino.findFirst({
      where: { activo: true, contratos: { some: {} } },
      include: {
        contratos: {
          orderBy: { createdAt: "desc" },
          include: {
            unidad: { include: { propiedad: true } },
            pagos: true,
          },
        },
      },
    });
  }

  if (!inquilino) {
    return {
      contratos: [],
      esAdminModoSupervision,
      inquilinoNombre: session.user.nombre || "Inquilino",
      documentoIdentidad: "Sin documento",
    };
  }

  const ahora = new Date();

  const contratos: InquilinoContratoDetalle[] = inquilino.contratos.map((c) => {
    const fInicio = new Date(c.fechaInicio);
    const fFin = new Date(c.fechaFin);

    const mesesTotales = Math.max(
      1,
      (fFin.getFullYear() - fInicio.getFullYear()) * 12 + (fFin.getMonth() - fInicio.getMonth())
    );

    const mesesRestantes = Math.max(
      0,
      (fFin.getFullYear() - ahora.getFullYear()) * 12 + (fFin.getMonth() - ahora.getMonth())
    );

    const duracionTotalMs = Math.max(1, fFin.getTime() - fInicio.getTime());
    const transcurridoMs = Math.max(0, ahora.getTime() - fInicio.getTime());
    const porcentajeTranscurrido = Math.min(100, Math.max(0, Math.round((transcurridoMs / duracionTotalMs) * 100)));

    const totalPagados = c.pagos.filter((p) => p.estado === "PAGADO").length;
    const totalPendientes = c.pagos.filter((p) => p.estado === "PENDIENTE" && new Date(p.fechaVencimiento) >= ahora).length;
    const totalVencidos = c.pagos.filter((p) => p.estado === "VENCIDO" || (p.estado === "PENDIENTE" && new Date(p.fechaVencimiento) < ahora)).length;

    return {
      id: c.id,
      codigo: c.codigo,
      estado: c.estado,
      fechaInicio: c.fechaInicio.toISOString(),
      fechaFin: c.fechaFin.toISOString(),
      diaCobro: c.diaCobro,
      montoAlquiler: c.montoAlquiler,
      moneda: c.moneda,
      documentoUrl: c.documentoUrl,
      notas: c.notas,
      mesesTotales,
      mesesRestantes,
      porcentajeTranscurrido,
      unidad: {
        id: c.unidad.id,
        codigo: c.unidad.codigo,
        tipo: c.unidad.tipo,
        piso: c.unidad.piso,
        areaMt2: c.unidad.areaMt2,
        descripcion: c.unidad.descripcion,
        imagenes: c.unidad.imagenes,
        propiedad: {
          id: c.unidad.propiedad.id,
          nombre: c.unidad.propiedad.nombre,
          tipo: c.unidad.propiedad.tipo,
          direccion: c.unidad.propiedad.direccion,
          ciudad: c.unidad.propiedad.ciudad,
          telefonoContacto: c.unidad.propiedad.telefonoContacto,
        },
      },
      deposito: {
        monto: c.depositoGarantia,
        estado: c.depositoEstado,
        fechaCobro: c.depositoFechaCobro ? c.depositoFechaCobro.toISOString() : null,
        metodoPago: c.depositoMetodoPago,
        referencia: c.depositoReferencia,
        comprobanteUrl: c.depositoComprobanteUrl,
        notas: c.depositoNotas,
      },
      pagosResumen: {
        totalPagados,
        totalPendientes,
        totalVencidos,
      },
    };
  });

  return {
    contratos,
    esAdminModoSupervision,
    inquilinoNombre: `${inquilino.nombre} ${inquilino.apellido || ""}`.trim(),
    documentoIdentidad: inquilino.documentoIdentidad,
  };
}
