"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { z } from "zod";
import { MetodoPago, MonedaTransaccion, TasaReferenciaBcv } from "@prisma/client";
import type { PagoItem } from "@/app/admin/cobranza/types";
import { getTasaBcvOficial, getTasaBcvPorFecha, type TasaBcvResponse } from "@/lib/bcv";
import { getPartesFechaVenezuela } from "@/lib/date-utils";
import { enviarNotificacionPagoReportadoAdmin } from "@/lib/email-templates/notificacion-pago-reportado";
import { sincronizarCuotasMes } from "@/lib/actions/cobranza";

/**
 * Ejecuta tareas asíncronas secundarias (como emails SMTP) en segundo plano
 * para responder inmediatamente a las Server Actions del portal del inquilino.
 */
function ejecutarEnSegundoPlano(tarea: () => Promise<unknown>) {
  try {
    after(async () => {
      try {
        await tarea();
      } catch (err) {
        console.error("Error en tarea de segundo plano:", err);
      }
    });
  } catch {
    tarea().catch((err) => {
      console.error("Error en tarea de segundo plano (fallback):", err);
    });
  }
}

export type SemaforoEstado = "AL_DIA" | "POR_PAGAR" | "EN_MORA" | "SIN_CONTRATO";

export interface ResumenFinancieroInquilino {
  semaforoEstado: SemaforoEstado;
  montoCanonTotal: number;
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
  serviciosLuzPendientesCount: number;
  serviciosAguaPendientesCount: number;
  totalServiciosPendientes: number;
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
  tasaReferenciaBcv: "USD" | "EUR";
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

  try {
    const usuarioActivo = await prisma.usuario.findUnique({
      where: { id: session.user.id },
      select: { activo: true, rol: true, email: true },
    });
    if (!usuarioActivo?.activo || (usuarioActivo.rol !== "INQUILINO" && usuarioActivo.rol !== "ADMIN")) {
      throw new Error("No autorizado");
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

    // Solo asociar por email si el perfil de inquilino aún no tiene usuarioId vinculado
    if (!inquilino && usuarioActivo.email) {
      inquilino = await prisma.inquilino.findFirst({
        where: { email: usuarioActivo.email, usuarioId: null, activo: true },
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
    if (!inquilino && usuarioActivo.rol === "ADMIN") {
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
          serviciosLuzPendientesCount: 0,
          serviciosAguaPendientesCount: 0,
          totalServiciosPendientes: 0,
        },
        locales: [],
      };
    }

    const ahora = new Date();
    const { mes: mesActual, ano: anoActual } = getPartesFechaVenezuela(ahora);

    let montoCanonTotal = 0;
    let montoDeudaVencida = 0;
    let cuotasVencidasCount = 0;
    let cuotasPagadasCount = 0;
    let montoPorPagar = 0;
    let proximoVencimiento: Date | null = null;
    let periodoProximoVencimiento: string | null = null;
    let proximoDiaCorte: number | null = null;
    let tieneCuotaMesActualImpaga = false;

    let serviciosLuzPendientesCount = 0;
    let serviciosAguaPendientesCount = 0;

    let ultimoPeriodoAnoMes = 0;
    let ultimoPeriodoPagado: string | null = null;
    const periodosVencidos: string[] = [];

    const locales: LocalArrendadoResumen[] = [];

    for (const contrato of inquilino.contratos) {
      montoCanonTotal += contrato.montoAlquiler;
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
        contratoCodigo: contrato.codigo,
        contratoId: contrato.id,
        diaCobro: contrato.diaCobro,
        fechaInicio: contrato.fechaInicio.toISOString(),
        fechaFin: contrato.fechaFin.toISOString(),
        documentoUrl: contrato.documentoUrl,
      });

      // Evaluar pagos asociados al contrato
      for (const pago of contrato.pagos) {
        // Computar solvencia de servicios públicos para meses corrientes o pasados
        const esMesCorrienteOPasado =
          pago.periodoAno < anoActual ||
          (pago.periodoAno === anoActual && pago.periodoMes <= mesActual);

        if (esMesCorrienteOPasado) {
          if (!pago.luzSolvente) serviciosLuzPendientesCount += 1;
          if (!pago.aguaSolvente) serviciosAguaPendientesCount += 1;
        }

        const saldoPendiente = Math.max(0, pago.montoEsperado - pago.montoPagado);
        
        if (saldoPendiente <= 0) {
          cuotasPagadasCount += 1;
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
      semaforoEstado = "EN_MORA";
    } else if (tieneCuotaMesActualImpaga) {
      semaforoEstado = "POR_PAGAR";
    } else if (montoPorPagar > 0 && diasParaVencer !== null && diasParaVencer <= 5) {
      semaforoEstado = "POR_PAGAR";
    } else {
      semaforoEstado = "AL_DIA";
    }

    return {
      resumen: {
        semaforoEstado,
        montoCanonTotal,
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
        serviciosLuzPendientesCount,
        serviciosAguaPendientesCount,
        totalServiciosPendientes: serviciosLuzPendientesCount + serviciosAguaPendientesCount,
      },
      locales,
    };
  } catch (error) {
    console.error("Error en getInquilinoDashboardData:", error);
    return {
      resumen: {
        semaforoEstado: "SIN_CONTRATO",
        montoCanonTotal: 0,
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
        esAdminModoSupervision: false,
        inquilinoNombre: session.user.nombre || "Inquilino",
        documentoIdentidad: "Sin documento",
        serviciosLuzPendientesCount: 0,
        serviciosAguaPendientesCount: 0,
        totalServiciosPendientes: 0,
      },
      locales: [],
    };
  }
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

  try {
    const usuarioActivo = await prisma.usuario.findUnique({
      where: { id: session.user.id },
      select: { activo: true, rol: true, email: true },
    });
    if (!usuarioActivo?.activo || (usuarioActivo.rol !== "INQUILINO" && usuarioActivo.rol !== "ADMIN")) {
      throw new Error("No autorizado");
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

    if (!inquilino && usuarioActivo.email) {
      inquilino = await prisma.inquilino.findFirst({
        where: { email: usuarioActivo.email, usuarioId: null, activo: true },
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
    if (!inquilino && usuarioActivo.rol === "ADMIN") {
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
        tasaReferenciaBcv: c.tasaReferenciaBcv === "EUR" ? "EUR" : "USD",
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
  } catch (error) {
    console.error("Error en getInquilinoContratosData:", error);
    return {
      contratos: [],
      esAdminModoSupervision: false,
      inquilinoNombre: session.user.nombre || "Inquilino",
      documentoIdentidad: "Sin documento",
    };
  }
}

// 3. Obtener listado de cuotas y estado de pagos para el portal del inquilino
export async function getInquilinoPagosDataAction(): Promise<{
  pagos: PagoItem[];
  resumen: ResumenFinancieroInquilino;
  esAdminModoSupervision: boolean;
  inquilinoNombre: string;
  tasaBcvActual: TasaBcvResponse;
}> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("No autenticado");

  // Fase 24: Sincronizar bajo demanda el mes en curso y el próximo mes (máx 1 mes de adelanto)
  const { mes: mesActual, ano: anoActual } = getPartesFechaVenezuela();
  let proximoMes = mesActual + 1;
  let proximoAno = anoActual;
  if (proximoMes > 12) {
    proximoMes = 1;
    proximoAno += 1;
  }

  try {
    const usuarioActivo = await prisma.usuario.findUnique({
      where: { id: session.user.id },
      select: { activo: true, rol: true, email: true },
    });
    if (!usuarioActivo?.activo || (usuarioActivo.rol !== "INQUILINO" && usuarioActivo.rol !== "ADMIN")) {
      throw new Error("No autorizado");
    }

    await Promise.all([
      sincronizarCuotasMes(mesActual, anoActual),
      sincronizarCuotasMes(proximoMes, proximoAno),
    ]);

    // Obtener la tasa oficial BCV del día en paralelo
    const tasaBcvActual = await getTasaBcvOficial();

    // Buscar el perfil Inquilino vinculado al usuario
    let inquilino = await prisma.inquilino.findUnique({
      where: { usuarioId: session.user.id },
      include: {
        contratos: {
          include: {
            unidad: { include: { propiedad: true } },
            pagos: {
              orderBy: [{ periodoAno: "desc" }, { periodoMes: "desc" }],
              include: {
                transacciones: { orderBy: { fechaPago: "desc" } },
              },
            },
          },
        },
      },
    });

    if (!inquilino && usuarioActivo.email) {
      inquilino = await prisma.inquilino.findFirst({
        where: { email: usuarioActivo.email, usuarioId: null, activo: true },
        include: {
          contratos: {
            include: {
              unidad: { include: { propiedad: true } },
              pagos: {
                orderBy: [{ periodoAno: "desc" }, { periodoMes: "desc" }],
                include: {
                  transacciones: { orderBy: { fechaPago: "desc" } },
                },
              },
            },
          },
        },
      });
    }

    let esAdminModoSupervision = false;
    if (!inquilino && usuarioActivo.rol === "ADMIN") {
      esAdminModoSupervision = true;
      inquilino = await prisma.inquilino.findFirst({
        where: { activo: true, contratos: { some: {} } },
        include: {
          contratos: {
            include: {
              unidad: { include: { propiedad: true } },
              pagos: {
                orderBy: [{ periodoAno: "desc" }, { periodoMes: "desc" }],
                include: {
                  transacciones: { orderBy: { fechaPago: "desc" } },
                },
              },
            },
          },
        },
      });
    }

    const { resumen } = await getInquilinoDashboardData();

    if (!inquilino || inquilino.contratos.length === 0) {
      return {
        pagos: [],
        resumen,
        esAdminModoSupervision,
        inquilinoNombre: session.user.nombre || "Inquilino",
        tasaBcvActual,
      };
    }

    // Aplanar todos los pagos de los contratos del inquilino serializados para Client Components
    const todosLosPagos: PagoItem[] = [];

    for (const c of inquilino.contratos) {
      for (const p of c.pagos) {
        todosLosPagos.push({
          id: p.id,
          contratoId: p.contratoId,
          periodoMes: p.periodoMes,
          periodoAno: p.periodoAno,
          montoEsperado: p.montoEsperado,
          montoPagado: p.montoPagado,
          monedaOriginal: p.monedaOriginal,
          montoOriginal: p.montoOriginal,
          montoBs: p.montoBs,
          tasaBcv: p.tasaBcv,
          tasaReferenciaUsada: p.tasaReferenciaUsada ?? null,
          tasaDolarBcvDia: p.tasaDolarBcvDia ?? null,
          montoUsdFinanzas: p.montoUsdFinanzas ?? null,
          fechaVencimiento: p.fechaVencimiento.toISOString(),
          fechaPago: p.fechaPago ? p.fechaPago.toISOString() : null,
          metodoPago: p.metodoPago,
          referencia: p.referencia,
          comprobanteUrl: p.comprobanteUrl,
          estado: p.estado,
          notas: p.notas,
          luzSolvente: Boolean(p.luzSolvente),
          luzNumeroFactura: p.luzNumeroFactura || null,
          luzComprobanteUrl: p.luzComprobanteUrl || null,
          aguaSolvente: Boolean(p.aguaSolvente),
          aguaNumeroFactura: p.aguaNumeroFactura || null,
          aguaComprobanteUrl: p.aguaComprobanteUrl || null,
          serviciosObservaciones: p.serviciosObservaciones || null,
          fechaRevisionServicios: p.fechaRevisionServicios ? p.fechaRevisionServicios.toISOString() : null,
          createdAt: p.createdAt.toISOString(),
          updatedAt: p.updatedAt.toISOString(),
          transacciones: p.transacciones.map((t) => ({
            id: t.id,
            pagoId: t.pagoId,
            monto: t.monto,
            monedaOriginal: t.monedaOriginal,
            montoOriginal: t.montoOriginal,
            montoBs: t.montoBs,
            tasaBcv: t.tasaBcv,
            tasaReferenciaUsada: t.tasaReferenciaUsada ?? null,
            tasaDolarBcvDia: t.tasaDolarBcvDia ?? null,
            montoUsdFinanzas: t.montoUsdFinanzas ?? null,
            fechaPago: t.fechaPago.toISOString(),
            metodoPago: t.metodoPago,
            referencia: t.referencia,
            comprobanteUrl: t.comprobanteUrl,
            notas: t.notas,
            createdAt: t.createdAt.toISOString(),
          })),
          contrato: {
            id: c.id,
            codigo: c.codigo,
            diaCobro: c.diaCobro,
            moneda: c.moneda,
            tasaReferenciaBcv: c.tasaReferenciaBcv,
            fechaInicio: c.fechaInicio.toISOString(),
            fechaFin: c.fechaFin.toISOString(),
            montoAlquiler: c.montoAlquiler,
            depositoGarantia: c.depositoGarantia,
            estado: c.estado,
            documentoUrl: c.documentoUrl,
            notas: c.notas,
            unidad: {
              id: c.unidad.id,
              codigo: c.unidad.codigo,
              tipo: c.unidad.tipo,
              piso: c.unidad.piso,
              areaMt2: c.unidad.areaMt2,
              precioAlquiler: c.unidad.precioAlquiler,
              tasaReferenciaBcv: c.unidad.tasaReferenciaBcv,
              descripcion: c.unidad.descripcion,
              imagenes: c.unidad.imagenes,
              propiedad: {
                id: c.unidad.propiedad.id,
                nombre: c.unidad.propiedad.nombre,
                tipo: c.unidad.propiedad.tipo,
                direccion: c.unidad.propiedad.direccion,
                ciudad: c.unidad.propiedad.ciudad,
                propietario: c.unidad.propiedad.propietario,
                telefonoContacto: c.unidad.propiedad.telefonoContacto,
              },
            },
            inquilino: {
              id: inquilino.id,
              nombre: inquilino.nombre,
              apellido: inquilino.apellido,
              documentoIdentidad: inquilino.documentoIdentidad,
              telefono: inquilino.telefono,
              telefonoSecundario: inquilino.telefonoSecundario,
              email: inquilino.email,
              tipoPersona: inquilino.tipoPersona,
              direccion: inquilino.direccion,
            },
          },
        });
      }
    }

    // Ordenar cronológicamente (más recientes primero)
    todosLosPagos.sort((a, b) => {
      if (a.periodoAno !== b.periodoAno) return b.periodoAno - a.periodoAno;
      return b.periodoMes - a.periodoMes;
    });

    return {
      pagos: todosLosPagos,
      resumen,
      esAdminModoSupervision,
      inquilinoNombre: `${inquilino.nombre} ${inquilino.apellido || ""}`.trim(),
      tasaBcvActual,
    };
  } catch (error) {
    console.error("Error en getInquilinoPagosDataAction:", error);
    const { resumen } = await getInquilinoDashboardData();
    const tasaFallback: TasaBcvResponse = {
      tasa: 0,
      fechaActualizacion: new Date().toISOString(),
      fuente: "Respaldo",
      esFallback: true,
    };
    return {
      pagos: [],
      resumen,
      esAdminModoSupervision: false,
      inquilinoNombre: session.user.nombre || "Inquilino",
      tasaBcvActual: tasaFallback,
    };
  }
}

const reportarPagoSchema = z.object({
  pagoId: z.string().min(1, "El identificador de la cuota es requerido"),
  montoReportado: z.coerce.number().positive("El monto debe ser mayor a 0"),
  montoBs: z.coerce.number().positive().optional().nullable(),
  tasaBcv: z.coerce.number().positive().optional().nullable(),
  tasaDolarBcvDia: z.coerce.number().positive().optional().nullable(),
  fechaPago: z.string().min(1, "La fecha de pago es requerida"),
  metodoPago: z.nativeEnum(MetodoPago),
  referencia: z.string().trim().min(3, "La referencia o número de comprobante es requerida"),
  comprobanteUrl: z.string().url("Debes adjuntar el comprobante o captura de pago"),
  notas: z.string().optional().nullable(),
});

export type ReportarPagoInput = z.infer<typeof reportarPagoSchema>;

// 4. Reporte de pago bancario por parte del inquilino (queda en auditoría para el Admin)
export async function reportarPagoInquilinoAction(input: ReportarPagoInput): Promise<{
  success: boolean;
  message?: string;
  error?: string;
}> {
  try {
    const session = await auth();
    if (!session?.user?.id) throw new Error("No autenticado");

    const validacion = reportarPagoSchema.safeParse(input);
    if (!validacion.success) {
      return {
        success: false,
        error: validacion.error.issues[0]?.message || "Datos del reporte de pago inválidos",
      };
    }

    const usuarioActivo = await prisma.usuario.findUnique({
      where: { id: session.user.id },
      select: { activo: true, rol: true, email: true },
    });
    if (!usuarioActivo?.activo || (usuarioActivo.rol !== "INQUILINO" && usuarioActivo.rol !== "ADMIN")) {
      return { success: false, error: "Cuenta no autorizada o desactivada." };
    }

    const {
      pagoId,
      montoReportado,
      montoBs,
      tasaBcv,
      tasaDolarBcvDia,
      fechaPago,
      metodoPago,
      referencia,
      comprobanteUrl,
      notas,
    } = validacion.data;

    // Determinar si es método en Bolívares y calcular montos congelados
    const esMonedaNacional =
      metodoPago === MetodoPago.PAGO_MOVIL || metodoPago === MetodoPago.TRANSFERENCIA;
    const monedaOriginal = esMonedaNacional ? MonedaTransaccion.VES : MonedaTransaccion.USD;
    const montoBsCalculado =
      montoBs || (esMonedaNacional && tasaBcv ? Number((montoReportado * tasaBcv).toFixed(2)) : null);
    const montoOriginalCalculado = esMonedaNacional
      ? montoBsCalculado || montoReportado
      : montoReportado;

    let tasaDolarEfectiva = tasaDolarBcvDia ?? null;
    if (esMonedaNacional && !tasaDolarEfectiva) {
      try {
        const fechaDiaStr = fechaPago.split("T")[0];
        const tasaDia = await getTasaBcvPorFecha(fechaDiaStr);
        if (tasaDia?.tasa > 0) {
          tasaDolarEfectiva = tasaDia.tasa;
        }
      } catch {
        tasaDolarEfectiva = null;
      }
    }

    const fechaObj = new Date(fechaPago);

    const pago = await prisma.$transaction(async (tx) => {
      const pagoTx = await tx.pago.findUnique({
        where: { id: pagoId },
        include: {
          contrato: {
            include: {
              inquilino: true,
              unidad: { include: { propiedad: true } },
            },
          },
        },
      });

      if (!pagoTx) throw new Error("La cuota seleccionada no existe");

      const esAdmin = usuarioActivo.rol === "ADMIN";
      const esDueno =
        pagoTx.contrato.inquilino.usuarioId === session.user.id ||
        (!pagoTx.contrato.inquilino.usuarioId &&
          usuarioActivo.email &&
          pagoTx.contrato.inquilino.email === usuarioActivo.email);

      if (!esAdmin && !esDueno) {
        throw new Error("No tienes autorización para reportar pagos de este contrato");
      }

      if (pagoTx.estado === "PAGADO") {
        throw new Error("Esta cuota ya fue conciliada y marcada como pagada.");
      }

      const saldoPendiente = Math.max(0, Number((pagoTx.montoEsperado - pagoTx.montoPagado).toFixed(2)));
      if (montoReportado > saldoPendiente) {
        throw new Error(
          `El monto reportado ($${montoReportado.toFixed(2)} USD) no puede superar el saldo pendiente de este canon ($${saldoPendiente.toFixed(2)} USD).`
        );
      }

      const cuotaAnteriorImpaga = await tx.pago.findFirst({
        where: {
          contratoId: pagoTx.contratoId,
          OR: [
            { periodoAno: { lt: pagoTx.periodoAno } },
            { periodoAno: pagoTx.periodoAno, periodoMes: { lt: pagoTx.periodoMes } },
          ],
          estado: { not: "PAGADO" },
        },
        orderBy: [{ periodoAno: "asc" }, { periodoMes: "asc" }],
        select: { periodoMes: true, periodoAno: true, montoEsperado: true, montoPagado: true },
      });

      if (cuotaAnteriorImpaga) {
        const nombreMesAnterior = new Date(
          Date.UTC(cuotaAnteriorImpaga.periodoAno, cuotaAnteriorImpaga.periodoMes - 1, 1)
        ).toLocaleDateString("es-VE", { month: "long", year: "numeric", timeZone: "UTC" });
        const saldoRestante = Math.max(
          0,
          cuotaAnteriorImpaga.montoEsperado - cuotaAnteriorImpaga.montoPagado
        ).toFixed(2);
        throw new Error(
          `Para mantener la correlatividad contable, debes solventar primero el canon de ${nombreMesAnterior} (Resta: $${saldoRestante} USD) antes de reportar este período.`
        );
      }

      const { mes: mesActualCal, ano: anoActualCal } = getPartesFechaVenezuela();
      let maxMesAdelanto = mesActualCal + 1;
      let maxAnoAdelanto = anoActualCal;
      while (maxMesAdelanto > 12) {
        maxMesAdelanto -= 12;
        maxAnoAdelanto += 1;
      }
      const excedeTopeCalendario =
        pagoTx.periodoAno > maxAnoAdelanto ||
        (pagoTx.periodoAno === maxAnoAdelanto && pagoTx.periodoMes > maxMesAdelanto);

      if (excedeTopeCalendario) {
        throw new Error(
          `Solo se permite reportar hasta 1 mes por encima del mes calendario actual (${maxMesAdelanto}/${maxAnoAdelanto}). Períodos posteriores se habilitarán cuando avance el calendario.`
        );
      }

      const tasaRefContrato = pagoTx.contrato.tasaReferenciaBcv ?? TasaReferenciaBcv.USD;
      const etiquetaTasaAudit = tasaRefContrato === TasaReferenciaBcv.EUR ? "Bs/€ (Euro BCV)" : "Bs/$ (Dólar BCV)";
      const detalleBsAudit =
        esMonedaNacional && montoBsCalculado && tasaBcv
          ? ` • Bs. ${montoBsCalculado.toLocaleString("es-VE", { minimumFractionDigits: 2 })} @ Tasa BCV: ${tasaBcv.toFixed(2)} ${etiquetaTasaAudit}`
          : "";
      const tasaDolarTx =
        esMonedaNacional
          ? (tasaRefContrato === TasaReferenciaBcv.USD ? (tasaBcv || tasaDolarEfectiva) : tasaDolarEfectiva)
          : null;
      const montoUsdFinanzasTx =
        esMonedaNacional && tasaRefContrato === TasaReferenciaBcv.EUR && montoBsCalculado && tasaDolarTx && tasaDolarTx > 0
          ? Number((montoBsCalculado / tasaDolarTx).toFixed(2))
          : montoReportado;

      const notasLimpias = [
        pagoTx.notas,
        `Reportado por inquilino: Ref ${referencia} ($${montoReportado.toFixed(2)} USD${detalleBsAudit}) el ${fechaPago}.`,
        notas?.trim() || "",
      ]
        .filter(Boolean)
        .join(" - ");

      const updated = await tx.pago.updateMany({
        where: { id: pagoId, estado: { not: "PAGADO" } },
        data: {
          metodoPago,
          referencia: referencia.trim(),
          comprobanteUrl: comprobanteUrl.trim(),
          fechaPago: isNaN(fechaObj.getTime()) ? new Date() : fechaObj,
          monedaOriginal,
          montoOriginal: montoOriginalCalculado,
          montoBs: montoBsCalculado,
          tasaBcv: tasaBcv || null,
          tasaReferenciaUsada: esMonedaNacional ? tasaRefContrato : null,
          tasaDolarBcvDia: tasaDolarTx,
          montoUsdFinanzas: montoUsdFinanzasTx,
          notas: notasLimpias,
        },
      });

      if (updated.count === 0) {
        throw new Error("La cuota ya fue conciliada concurrentemente.");
      }

      return pagoTx;
    });

    // Enviar notificación por correo al administrador en segundo plano (respuesta instantánea < 150ms)
    ejecutarEnSegundoPlano(async () => {
      await enviarNotificacionPagoReportadoAdmin({
        inquilinoNombre: `${pago.contrato.inquilino.nombre} ${pago.contrato.inquilino.apellido || ""}`.trim(),
        inquilinoCedula: pago.contrato.inquilino.documentoIdentidad,
        inquilinoTelefono: pago.contrato.inquilino.telefono,
        inquilinoEmail: pago.contrato.inquilino.email,
        propiedadNombre: pago.contrato.unidad.propiedad.nombre,
        unidadCodigo: pago.contrato.unidad.codigo,
        periodoMes: pago.periodoMes,
        periodoAno: pago.periodoAno,
        montoCanon: pago.montoEsperado,
        montoReportado,
        montoBs: montoBsCalculado,
        tasaBcv: tasaBcv || null,
        tasaReferenciaBcv: pago.contrato.tasaReferenciaBcv ?? TasaReferenciaBcv.USD,
        metodoPago,
        referencia: referencia.trim(),
        fechaPago,
        comprobanteUrl: comprobanteUrl.trim(),
        notas: notas?.trim() || null,
      });
    });

    revalidatePath("/inquilino/pagos");
    revalidatePath("/inquilino/dashboard");
    revalidatePath("/admin/cobranza");

    return {
      success: true,
      message: "¡Pago reportado exitosamente! Tu comprobante fue enviado a la administración para su verificación.",
    };
  } catch (error) {
    console.error("Error al reportar pago de inquilino:", error);
    return {
      success: false,
      error: "Ocurrió un error al registrar el reporte de pago.",
    };
  }
}
