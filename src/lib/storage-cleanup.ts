import { prisma } from "@/lib/prisma";
import {
  eliminarArchivosUploadThing,
  extraerFileKey,
  listarTodosArchivosUploadThing,
  obtenerInstanciasUploadThing,
} from "@/lib/uploadthing-server";

// Opciones de configuración para la ejecución de limpieza
export interface OpcionesLimpieza {
  diasAntiguedad?: number;
  dryRun?: boolean;
}

// Resumen del resultado del proceso de depuración
export interface ResultadoLimpieza {
  diasAntiguedad: number;
  fechaCorte: string;
  dryRun: boolean;
  archivosDetectados: number;
  archivosEliminadosFisicamente: number;
  detalles: {
    pagosLuzPurgados: number;
    pagosAguaPurgados: number;
    novedadesMinutaPurgadas: number;
    tareasEmpleadoPurgadas: number;
    ticketsMantenimientoPurgados: number;
  };
  errores: string[];
}

/**
 * Purga de UploadThing y de la base de datos las evidencias operativas y comprobantes
 * de servicios públicos que hayan superado el tiempo de retención configurado (por defecto 90 días).
 *
 * Criterios de protección:
 * - NUNCA toca: Contrato.documentoUrl, Empleado.contratoUrl, Unidad.imagenes, Pago.comprobanteUrl, TransaccionFinanciera.comprobanteUrl, TransaccionPago.comprobanteUrl.
 * - Pago (Luz/Agua): Solo se purga si el servicio específico está marcado como solvente.
 * - TareaEmpleado: Solo se purga si la tarea está COMPLETADA o CANCELADA.
 * - TicketMantenimiento: Solo se purga si el ticket está RESUELTO o CANCELADO (tanto fotos de avería como finiquito).
 * - NovedadMinuta: Se purgan las fotos de rondas/incidencias con más de N días.
 */
export async function purgarArchivosTransitorios(
  opciones: OpcionesLimpieza = {}
): Promise<ResultadoLimpieza> {
  const { diasAntiguedad = 90, dryRun = false } = opciones;
  const fechaCorte = new Date(Date.now() - diasAntiguedad * 24 * 60 * 60 * 1000);

  const resultado: ResultadoLimpieza = {
    diasAntiguedad,
    fechaCorte: fechaCorte.toISOString(),
    dryRun,
    archivosDetectados: 0,
    archivosEliminadosFisicamente: 0,
    detalles: {
      pagosLuzPurgados: 0,
      pagosAguaPurgados: 0,
      novedadesMinutaPurgadas: 0,
      tareasEmpleadoPurgadas: 0,
      ticketsMantenimientoPurgados: 0,
    },
    errores: [],
  };

  const urlsParaEliminar: string[] = [];

  try {
    // 1. Comprobantes de luz solventes con más de 90 días
    const pagosLuz = await prisma.pago.findMany({
      where: {
        createdAt: { lte: fechaCorte },
        luzSolvente: true,
        luzComprobanteUrl: { not: null },
      },
      select: { id: true, luzComprobanteUrl: true },
    });

    for (const pago of pagosLuz) {
      if (pago.luzComprobanteUrl) {
        urlsParaEliminar.push(pago.luzComprobanteUrl);
      }
    }
    resultado.detalles.pagosLuzPurgados = pagosLuz.length;

    // 2. Comprobantes de agua solventes con más de 90 días
    const pagosAgua = await prisma.pago.findMany({
      where: {
        createdAt: { lte: fechaCorte },
        aguaSolvente: true,
        aguaComprobanteUrl: { not: null },
      },
      select: { id: true, aguaComprobanteUrl: true },
    });

    for (const pago of pagosAgua) {
      if (pago.aguaComprobanteUrl) {
        urlsParaEliminar.push(pago.aguaComprobanteUrl);
      }
    }
    resultado.detalles.pagosAguaPurgados = pagosAgua.length;

    // 3. Fotos de novedades de guardia en minutas entregadas y cerradas con más de 90 días
    const novedades = await prisma.novedadMinuta.findMany({
      where: {
        createdAt: { lte: fechaCorte },
        fotos: { isEmpty: false },
        minuta: {
          estado: "ENTREGADO",
        },
      },
      select: { id: true, fotos: true },
    });

    for (const novedad of novedades) {
      urlsParaEliminar.push(...novedad.fotos);
    }
    resultado.detalles.novedadesMinutaPurgadas = novedades.length;

    // 4. Evidencias de tareas de empleados completadas o canceladas con más de 90 días
    const tareas = await prisma.tareaEmpleado.findMany({
      where: {
        createdAt: { lte: fechaCorte },
        estado: { in: ["COMPLETADA", "CANCELADA"] },
        evidencias: { isEmpty: false },
      },
      select: { id: true, evidencias: true },
    });

    for (const tarea of tareas) {
      urlsParaEliminar.push(...tarea.evidencias);
    }
    resultado.detalles.tareasEmpleadoPurgadas = tareas.length;

    // 5. Fotos de tickets resueltos o cancelados con más de 90 días
    const tickets = await prisma.ticketMantenimiento.findMany({
      where: {
        createdAt: { lte: fechaCorte },
        estado: { in: ["RESUELTO", "CANCELADO"] },
        OR: [
          { fotosAveria: { isEmpty: false } },
          { fotosFiniquito: { isEmpty: false } },
        ],
      },
      select: { id: true, fotosAveria: true, fotosFiniquito: true },
    });

    for (const ticket of tickets) {
      urlsParaEliminar.push(...ticket.fotosAveria);
      urlsParaEliminar.push(...ticket.fotosFiniquito);
    }
    resultado.detalles.ticketsMantenimientoPurgados = tickets.length;

    // Filtrar duplicados o vacíos
    const urlsUnicas = Array.from(new Set(urlsParaEliminar.filter(Boolean)));
    resultado.archivosDetectados = urlsUnicas.length;

    if (dryRun) {
      return resultado;
    }

    // 6. Eliminación física en UploadThing en lotes seguros de 50 archivos
    const BATCH_SIZE = 50;
    for (let i = 0; i < urlsUnicas.length; i += BATCH_SIZE) {
      const lote = urlsUnicas.slice(i, i + BATCH_SIZE);
      const resEliminar = await eliminarArchivosUploadThing(lote);
      if (resEliminar.success && typeof resEliminar.count === "number") {
        resultado.archivosEliminadosFisicamente += resEliminar.count;
      } else if (!resEliminar.success) {
        resultado.errores.push(`Error en lote ${i / BATCH_SIZE + 1}: ${String(resEliminar.error)}`);
      }
    }

    // 7. Actualización en base de datos para desvincular URLs purgadas
    if (pagosLuz.length > 0) {
      await prisma.pago.updateMany({
        where: { id: { in: pagosLuz.map((p) => p.id) } },
        data: { luzComprobanteUrl: null },
      });
    }

    if (pagosAgua.length > 0) {
      await prisma.pago.updateMany({
        where: { id: { in: pagosAgua.map((p) => p.id) } },
        data: { aguaComprobanteUrl: null },
      });
    }

    if (novedades.length > 0) {
      await prisma.novedadMinuta.updateMany({
        where: { id: { in: novedades.map((n) => n.id) } },
        data: { fotos: [] },
      });
    }

    if (tareas.length > 0) {
      await prisma.tareaEmpleado.updateMany({
        where: { id: { in: tareas.map((t) => t.id) } },
        data: { evidencias: [] },
      });
    }

    if (tickets.length > 0) {
      await prisma.ticketMantenimiento.updateMany({
        where: { id: { in: tickets.map((t) => t.id) } },
        data: { fotosAveria: [], fotosFiniquito: [] },
      });
    }

    return resultado;
  } catch (error) {
    console.error("Error al ejecutar purga de archivos transitorios:", error);
    resultado.errores.push(error instanceof Error ? error.message : String(error));
    return resultado;
  }
}

// Opciones para la conciliación de archivos huérfanos en UploadThing
export interface OpcionesLimpiezaHuerfanos {
  dryRun?: boolean;
  minAntiguedadHoras?: number;
}

// Resumen por app de UploadThing tras la conciliación
export interface DetalleHuerfanosApp {
  app: string;
  totalArchivos: number;
  huerfanosDetectados: number;
  huerfanosEliminados: number;
  bytesHuerfanos: number;
}

// Resultado completo de la conciliación de huérfanos entre BD y UploadThing
export interface ResultadoLimpiezaHuerfanos {
  dryRun: boolean;
  minAntiguedadHoras: number;
  archivosEnUsoBD: number;
  huerfanosDetectados: number;
  huerfanosEliminados: number;
  bytesLiberados: number;
  porApp: DetalleHuerfanosApp[];
  errores: string[];
}

/**
 * Recopila todas las claves (fileKey) referenciadas actualmente en los modelos de la base de datos.
 */
export async function obtenerFileKeysEnUsoBD(): Promise<Set<string>> {
  const [
    unidades,
    contratos,
    pagos,
    transaccionesPago,
    transaccionesFinancieras,
    empleados,
    tareas,
    novedades,
    tickets,
  ] = await Promise.all([
    prisma.unidad.findMany({ where: { imagenes: { isEmpty: false } }, select: { imagenes: true } }),
    prisma.contrato.findMany({
      where: {
        OR: [
          { documentoUrl: { not: null } },
          { depositoComprobanteUrl: { not: null } },
          { depositoComprobanteLiquidacionUrl: { not: null } },
        ],
      },
      select: { documentoUrl: true, depositoComprobanteUrl: true, depositoComprobanteLiquidacionUrl: true },
    }),
    prisma.pago.findMany({
      where: {
        OR: [
          { comprobanteUrl: { not: null } },
          { luzComprobanteUrl: { not: null } },
          { aguaComprobanteUrl: { not: null } },
        ],
      },
      select: { comprobanteUrl: true, luzComprobanteUrl: true, aguaComprobanteUrl: true },
    }),
    prisma.transaccionPago.findMany({ where: { comprobanteUrl: { not: null } }, select: { comprobanteUrl: true } }),
    prisma.transaccionFinanciera.findMany({ where: { comprobanteUrl: { not: null } }, select: { comprobanteUrl: true } }),
    prisma.empleado.findMany({ where: { contratoUrl: { not: null } }, select: { contratoUrl: true } }),
    prisma.tareaEmpleado.findMany({ where: { evidencias: { isEmpty: false } }, select: { evidencias: true } }),
    prisma.novedadMinuta.findMany({ where: { fotos: { isEmpty: false } }, select: { fotos: true } }),
    prisma.ticketMantenimiento.findMany({
      where: { OR: [{ fotosAveria: { isEmpty: false } }, { fotosFiniquito: { isEmpty: false } }] },
      select: { fotosAveria: true, fotosFiniquito: true },
    }),
  ]);

  const keys = new Set<string>();
  const registrarUrl = (url: string | null | undefined) => {
    if (!url) return;
    const key = extraerFileKey(url);
    if (key) keys.add(key);
  };

  for (const u of unidades) u.imagenes.forEach(registrarUrl);
  for (const c of contratos) {
    registrarUrl(c.documentoUrl);
    registrarUrl(c.depositoComprobanteUrl);
    registrarUrl(c.depositoComprobanteLiquidacionUrl);
  }
  for (const p of pagos) {
    registrarUrl(p.comprobanteUrl);
    registrarUrl(p.luzComprobanteUrl);
    registrarUrl(p.aguaComprobanteUrl);
  }
  for (const tp of transaccionesPago) registrarUrl(tp.comprobanteUrl);
  for (const tf of transaccionesFinancieras) registrarUrl(tf.comprobanteUrl);
  for (const e of empleados) registrarUrl(e.contratoUrl);
  for (const t of tareas) t.evidencias.forEach(registrarUrl);
  for (const n of novedades) n.fotos.forEach(registrarUrl);
  for (const tk of tickets) {
    tk.fotosAveria.forEach(registrarUrl);
    tk.fotosFiniquito.forEach(registrarUrl);
  }

  return keys;
}

/**
 * Detecta y elimina archivos huérfanos en UploadThing (no referenciados en ninguna tabla de la BD).
 */
export async function limpiarArchivosHuerfanosUploadThing(
  opciones: OpcionesLimpiezaHuerfanos = {}
): Promise<ResultadoLimpiezaHuerfanos> {
  const { dryRun = false, minAntiguedadHoras = 24 } = opciones;
  const resultado: ResultadoLimpiezaHuerfanos = {
    dryRun,
    minAntiguedadHoras,
    archivosEnUsoBD: 0,
    huerfanosDetectados: 0,
    huerfanosEliminados: 0,
    bytesLiberados: 0,
    porApp: [],
    errores: [],
  };

  try {
    const instancias = obtenerInstanciasUploadThing();
    if (instancias.length === 0) {
      resultado.errores.push("No hay tokens de UploadThing configurados.");
      return resultado;
    }

    const keysEnUso = await obtenerFileKeysEnUsoBD();
    resultado.archivosEnUsoBD = keysEnUso.size;
    const fechaCorteMs = Date.now() - minAntiguedadHoras * 60 * 60 * 1000;
    const BATCH_SIZE = 50;

    for (const instancia of instancias) {
      const archivos = await listarTodosArchivosUploadThing(instancia.api);
      const huerfanos = archivos.filter((archivo) => {
        if (keysEnUso.has(archivo.key)) return false;
        return minAntiguedadHoras <= 0 || archivo.uploadedAt <= fechaCorteMs;
      });

      const bytesHuerfanos = huerfanos.reduce((acc, f) => acc + (f.size || 0), 0);
      let eliminadosApp = 0;

      if (!dryRun && huerfanos.length > 0) {
        const keysHuerfanos = huerfanos.map((h) => h.key);
        for (let i = 0; i < keysHuerfanos.length; i += BATCH_SIZE) {
          const lote = keysHuerfanos.slice(i, i + BATCH_SIZE);
          const resDelete = await instancia.api.deleteFiles(lote);
          if (resDelete.success) {
            eliminadosApp += resDelete.deletedCount ?? 0;
          } else {
            resultado.errores.push(`UploadThing rechazó la eliminación en [${instancia.nombre}] (lote ${i / BATCH_SIZE + 1}).`);
          }
        }
      }

      resultado.huerfanosDetectados += huerfanos.length;
      resultado.huerfanosEliminados += eliminadosApp;
      if (!dryRun && eliminadosApp > 0) {
        resultado.bytesLiberados += bytesHuerfanos;
      }

      resultado.porApp.push({
        app: instancia.nombre,
        totalArchivos: archivos.length,
        huerfanosDetectados: huerfanos.length,
        huerfanosEliminados: eliminadosApp,
        bytesHuerfanos,
      });
    }

    return resultado;
  } catch (error) {
    console.error("Error al conciliar archivos huérfanos en UploadThing:", error);
    resultado.errores.push(error instanceof Error ? error.message : String(error));
    return resultado;
  }
}
