"use server";

import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import {
  Rol,
  CargoEmpleado,
  EstadoAsistencia,
  EstadoTarea,
  PrioridadTarea,
  CategoriaTicket,
  UrgenciaTicket,
  EstadoTicket,
} from "@prisma/client";
import { RegistroAsistenciaItem } from "@/app/admin/personal/types";
import { cerrarJornadasIncompletasEmpleado } from "./personal";

// Helper interno para resolver el empleado autenticado de forma estricta en el servidor
async function getEmpleadoAutenticado() {
  const session = await auth();
  if (!session?.user?.id) {
    return null;
  }

  // Buscar por usuarioId vinculado
  let empleado = await prisma.empleado.findFirst({
    where: { usuarioId: session.user.id },
    include: { propiedad: { select: { id: true, nombre: true } } },
  });

  // Si no se encuentra por usuarioId, buscar por email
  if (!empleado && session.user.email) {
    empleado = await prisma.empleado.findFirst({
      where: { email: session.user.email },
      include: { propiedad: { select: { id: true, nombre: true } } },
    });
  }

  // Modo auditoría/prueba: si un ADMIN ingresa al portal de empleados pero no tiene ficha vinculada
  if (!empleado && session.user.rol === Rol.ADMIN) {
    empleado = await prisma.empleado.findFirst({
      where: { activo: true },
      include: { propiedad: { select: { id: true, nombre: true } } },
    });
  }

  return empleado;
}

export interface TicketMantenimientoItemDashboard {
  id: string;
  codigo: string;
  titulo: string;
  descripcion: string;
  categoria: CategoriaTicket;
  categoriaPersonalizada: string | null;
  urgencia: UrgenciaTicket;
  estado: EstadoTicket;
  propiedadNombre: string;
  unidadCodigo: string | null;
  unidadPiso: string | null;
  fotosAveriaCount: number;
  createdAt: string;
}

export interface PortalEmpleadoData {
  empleado: {
    id: string;
    nombre: string;
    apellido: string | null;
    cedula: string;
    telefono: string;
    email: string | null;
    cargo: CargoEmpleado;
    cargoPersonalizado: string | null;
    propiedadId: string | null;
    propiedadNombre: string | null;
    fechaIngreso: string;
  };
  asistenciaHoy: {
    id: string;
    fecha: string;
    horaEntrada: string;
    horaSalida: string | null;
    estado: EstadoAsistencia;
    ubicacionEntrada: string | null;
    ubicacionSalida: string | null;
    observaciones: string | null;
    esGuardia24h?: boolean;
    horasEnCurso?: number;
  } | null;
  compañerosSeguridad?: Array<{
    id: string;
    nombre: string;
    cedula: string;
  }>;
  tareas: Array<{
    id: string;
    titulo: string;
    descripcion: string | null;
    propiedadNombre: string | null;
    prioridad: PrioridadTarea;
    estado: EstadoTarea;
    fechaLimite: string | null;
    fechaCompletada: string | null;
    evidencias: string[];
    notasResolucion: string | null;
    requiereEvidencia: boolean;
    createdAt: string;
  }>;
  ticketsMantenimiento: TicketMantenimientoItemDashboard[];
  metricas: {
    tareasPendientes: number;
    tareasEnProceso: number;
    tareasCompletadasMes: number;
    asistenciasMes: number;
    ticketsActivos: number;
    ticketsResueltosMes: number;
  };
}

// Carga inicial del Hub del Empleado
export async function getPortalEmpleadoData(): Promise<{ success: boolean; data?: PortalEmpleadoData; error?: string }> {
  try {
    const empleado = await getEmpleadoAutenticado();
    if (!empleado) {
      return { success: false, error: "No se encontró ficha de empleado activa para esta cuenta." };
    }

    const ahora = new Date();
    const inicioHoy = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate(), 0, 0, 0);
    const finHoy = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate(), 23, 59, 59, 999);
    const inicioMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1, 0, 0, 0);
    const esSeguridad = empleado.cargo === CargoEmpleado.SEGURIDAD;
    const limite30Horas = new Date(ahora.getTime() - 30 * 60 * 60 * 1000);

    // Consulta paralela de solo lectura
    const [
      asistenciaHoyRaw,
      asistenciaGuardiaAbierta,
      compañerosSeguridadRaw,
      tareas,
      completadasMesCount,
      asistenciasMesCount,
      ticketsMantenimiento,
      ticketsResueltosMesCount,
    ] = await Promise.all([
      // Asistencia del día civil actual
      prisma.registroAsistencia.findFirst({
        where: {
          empleadoId: empleado.id,
          fecha: { gte: inicioHoy, lte: finHoy },
        },
        orderBy: { horaEntrada: "desc" },
      }),
      // Para seguridad: buscar si tiene una guardia abierta de hasta 30h atrás
      esSeguridad
        ? prisma.registroAsistencia.findFirst({
            where: {
              empleadoId: empleado.id,
              horaSalida: null,
              horaEntrada: { gte: limite30Horas },
              estado: { in: [EstadoAsistencia.PRESENTE, EstadoAsistencia.RETARDO] },
            },
            orderBy: { horaEntrada: "desc" },
          })
        : Promise.resolve(null),
      // Compañeros de seguridad en el mismo inmueble para relevo de turno
      esSeguridad && empleado.propiedadId
        ? prisma.empleado.findMany({
            where: {
              id: { not: empleado.id },
              cargo: CargoEmpleado.SEGURIDAD,
              activo: true,
              propiedadId: empleado.propiedadId,
            },
            select: { id: true, nombre: true, apellido: true, cedula: true },
            orderBy: { nombre: "asc" },
          })
        : Promise.resolve([]),
      prisma.tareaEmpleado.findMany({
        where: { empleadoId: empleado.id },
        include: { propiedad: { select: { nombre: true } } },
        orderBy: [{ estado: "asc" }, { prioridad: "desc" }, { createdAt: "desc" }],
        take: 50,
      }),
      prisma.tareaEmpleado.count({
        where: {
          empleadoId: empleado.id,
          estado: EstadoTarea.COMPLETADA,
          fechaCompletada: { gte: inicioMes },
        },
      }),
      prisma.registroAsistencia.count({
        where: {
          empleadoId: empleado.id,
          fecha: { gte: inicioMes },
          estado: { in: [EstadoAsistencia.PRESENTE, EstadoAsistencia.RETARDO] },
        },
      }),
      prisma.ticketMantenimiento.findMany({
        where: { empleadoId: empleado.id },
        include: {
          propiedad: { select: { nombre: true } },
          unidad: { select: { codigo: true, tipo: true, piso: true } },
        },
        orderBy: [{ estado: "asc" }, { createdAt: "desc" }],
        take: 20,
      }),
      prisma.ticketMantenimiento.count({
        where: {
          empleadoId: empleado.id,
          estado: EstadoTicket.RESUELTO,
          fechaFiniquito: { gte: inicioMes },
        },
      }),
    ]);

    // Determinar la asistencia activa: si hay guardia de 24h abierta del día anterior, esa es la vigente
    const registroAsistenciaActivo = asistenciaGuardiaAbierta || asistenciaHoyRaw;

    let esGuardia24hActiva = false;
    let horasEnCurso = 0;
    if (registroAsistenciaActivo) {
      const entradaMs = new Date(registroAsistenciaActivo.horaEntrada).getTime();
      const salidaMs = registroAsistenciaActivo.horaSalida
        ? new Date(registroAsistenciaActivo.horaSalida).getTime()
        : ahora.getTime();
      horasEnCurso = Math.max(0, Math.floor((salidaMs - entradaMs) / (1000 * 60 * 60)));
      if (esSeguridad || horasEnCurso >= 12) {
        esGuardia24hActiva = true;
      }
    }

    const compañerosSeguridad = (compañerosSeguridadRaw || []).map((c) => ({
      id: c.id,
      nombre: `${c.nombre} ${c.apellido || ""}`.trim(),
      cedula: c.cedula,
    }));

    const tareasPendientes = tareas.filter((t) => t.estado === EstadoTarea.PENDIENTE).length;
    const tareasEnProceso = tareas.filter((t) => t.estado === EstadoTarea.EN_PROCESO).length;
    const ticketsActivos = ticketsMantenimiento.filter(
      (t) => t.estado !== EstadoTicket.RESUELTO && t.estado !== EstadoTicket.CANCELADO
    ).length;

    return {
      success: true,
      data: {
        empleado: {
          id: empleado.id,
          nombre: empleado.nombre,
          apellido: empleado.apellido,
          cedula: empleado.cedula,
          telefono: empleado.telefono,
          email: empleado.email,
          cargo: empleado.cargo,
          cargoPersonalizado: empleado.cargoPersonalizado,
          propiedadId: empleado.propiedadId,
          propiedadNombre: empleado.propiedad?.nombre || null,
          fechaIngreso: empleado.fechaIngreso.toISOString(),
        },
        asistenciaHoy: registroAsistenciaActivo
          ? {
              id: registroAsistenciaActivo.id,
              fecha: registroAsistenciaActivo.fecha.toISOString(),
              horaEntrada: registroAsistenciaActivo.horaEntrada.toISOString(),
              horaSalida: registroAsistenciaActivo.horaSalida ? registroAsistenciaActivo.horaSalida.toISOString() : null,
              estado: registroAsistenciaActivo.estado,
              ubicacionEntrada: registroAsistenciaActivo.ubicacionEntrada,
              ubicacionSalida: registroAsistenciaActivo.ubicacionSalida,
              observaciones: registroAsistenciaActivo.observaciones,
              esGuardia24h: esGuardia24hActiva,
              horasEnCurso,
            }
          : null,
        compañerosSeguridad,
        tareas: tareas.map((t) => ({
          id: t.id,
          titulo: t.titulo,
          descripcion: t.descripcion,
          propiedadNombre: t.propiedad?.nombre || null,
          prioridad: t.prioridad,
          estado: t.estado,
          fechaLimite: t.fechaLimite ? t.fechaLimite.toISOString() : null,
          fechaCompletada: t.fechaCompletada ? t.fechaCompletada.toISOString() : null,
          evidencias: t.evidencias,
          notasResolucion: t.notasResolucion,
          requiereEvidencia: t.requiereEvidencia,
          createdAt: t.createdAt.toISOString(),
        })),
        ticketsMantenimiento: ticketsMantenimiento.map((t) => ({
          id: t.id,
          codigo: t.codigo,
          titulo: t.titulo,
          descripcion: t.descripcion,
          categoria: t.categoria,
          categoriaPersonalizada: t.categoriaPersonalizada,
          urgencia: t.urgencia,
          estado: t.estado,
          propiedadNombre: t.propiedad.nombre,
          unidadCodigo: t.unidad?.codigo || null,
          unidadPiso: t.unidad?.piso || null,
          fotosAveriaCount: t.fotosAveria.length,
          createdAt: t.createdAt.toISOString(),
        })),
        metricas: {
          tareasPendientes,
          tareasEnProceso,
          tareasCompletadasMes: completadasMesCount,
          asistenciasMes: asistenciasMesCount,
          ticketsActivos,
          ticketsResueltosMes: ticketsResueltosMesCount,
        },
      },
    };
  } catch (error: unknown) {
    console.error("Error en getPortalEmpleadoData:", error);
    const msg = error instanceof Error ? error.message : "Error al obtener datos del portal de empleado";
    return { success: false, error: msg };
  }
}

export interface EntregaGuardiaInput {
  ubicacion?: string;
  guardiaRelevoId?: string;
  guardiaRelevoNombre?: string;
  observacionesEntrega?: string;
}

// Marcaje de jornada de 1 toque o entrega de guardia 24h
export async function marcarEntradaSalidaEmpleadoAction(input?: string | EntregaGuardiaInput): Promise<{
  success: boolean;
  tipo?: "ENTRADA" | "SALIDA" | "YA_COMPLETADA";
  message: string;
  esGuardia24h?: boolean;
  horasLaboradas?: number;
  error?: string;
}> {
  try {
    const empleado = await getEmpleadoAutenticado();
    if (!empleado) {
      return { success: false, error: "No autorizado o sin ficha de empleado asignada.", message: "" };
    }

    const payload: EntregaGuardiaInput = typeof input === "string" ? { ubicacion: input } : input || {};
    const ahora = new Date();
    const esSeguridad = empleado.cargo === CargoEmpleado.SEGURIDAD;
    const limite30Horas = new Date(ahora.getTime() - 30 * 60 * 60 * 1000);
    const inicioHoy = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate(), 0, 0, 0);
    const finHoy = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate(), 23, 59, 59, 999);

    // Cierre perezoso (Just-In-Time) de turnos olvidados anteriores de este trabajador
    await cerrarJornadasIncompletasEmpleado(empleado.id);

    // 1. Buscar si tiene una guardia/turno abierto pendiente de salida
    // Si es seguridad, busca hasta 30 horas hacia atrás (permite cerrar guardia de ayer)
    let asistenciaPendienteSalida = await prisma.registroAsistencia.findFirst({
      where: {
        empleadoId: empleado.id,
        horaSalida: null,
        horaEntrada: esSeguridad ? { gte: limite30Horas } : { gte: inicioHoy, lte: finHoy },
        estado: { in: [EstadoAsistencia.PRESENTE, EstadoAsistencia.RETARDO] },
      },
      orderBy: { horaEntrada: "desc" },
    });

    const nombreLugar = payload.ubicacion || empleado.propiedad?.nombre || "Marcaje Móvil";

    // 2. Si no tiene turno abierto: REGISTRAR ENTRADA
    if (!asistenciaPendienteSalida) {
      // Verificar si ya completó un turno hoy (para empleados regulares no seguridad)
      if (!esSeguridad) {
        const yaCompletadaHoy = await prisma.registroAsistencia.findFirst({
          where: {
            empleadoId: empleado.id,
            fecha: { gte: inicioHoy, lte: finHoy },
            horaSalida: { not: null },
          },
        });
        if (yaCompletadaHoy) {
          return {
            success: true,
            tipo: "YA_COMPLETADA",
            message: "Ya completaste tu jornada de trabajo del día de hoy.",
          };
        }
      }

      await prisma.registroAsistencia.create({
        data: {
          empleadoId: empleado.id,
          fecha: ahora,
          horaEntrada: ahora,
          estado: EstadoAsistencia.PRESENTE,
          ubicacionEntrada: nombreLugar,
          observaciones: esSeguridad ? "Inicio de Guardia de Seguridad (24 Horas)" : null,
        },
      });

      revalidatePath("/empleado/dashboard");
      revalidatePath("/empleado/asistencia");
      revalidatePath("/admin/personal");

      return {
        success: true,
        tipo: "ENTRADA",
        message: esSeguridad
          ? `Guardia iniciada con éxito a las ${ahora.toLocaleTimeString("es-VE", { hour: "2-digit", minute: "2-digit" })}.`
          : `Entrada registrada con éxito a las ${ahora.toLocaleTimeString("es-VE", { hour: "2-digit", minute: "2-digit" })}.`,
      };
    }

    // 3. Si tiene turno abierto: REGISTRAR SALIDA / ENTREGA DE GUARDIA
    const entradaMs = new Date(asistenciaPendienteSalida.horaEntrada).getTime();
    const salidaMs = ahora.getTime();
    const diffHoras = Math.max(0, Math.round((salidaMs - entradaMs) / (1000 * 60 * 60) * 10) / 10);
    const esGuardia24h = esSeguridad || diffHoras >= 12;

    let notaFinal = asistenciaPendienteSalida.observaciones || "";
    if (payload.guardiaRelevoNombre) {
      notaFinal = notaFinal
        ? `${notaFinal} | Relevo: Entregado a ${payload.guardiaRelevoNombre}`
        : `Relevo: Entregado a ${payload.guardiaRelevoNombre}`;
    }
    if (payload.observacionesEntrega) {
      notaFinal = notaFinal
        ? `${notaFinal} | Nota: ${payload.observacionesEntrega}`
        : payload.observacionesEntrega;
    }

    const nombreVigilanteSaliente = `${empleado.nombre} ${empleado.apellido || ""}`.trim();

    // Transacción atómica: 
    // a) Liquidar la guardia de 24h del vigilante saliente (A)
    // b) Si seleccionó relevo (B), aperturar automáticamente la guardia del vigilante entrante (B)
    await prisma.$transaction(async (tx) => {
      // 1. Cerrar guardia de A
      await tx.registroAsistencia.update({
        where: { id: asistenciaPendienteSalida.id },
        data: {
          horaSalida: ahora,
          ubicacionSalida: nombreLugar,
          observaciones: notaFinal || (esGuardia24h ? `Guardia finalizada (${diffHoras}h de servicio)` : null),
        },
      });

      // 2. Si hay un compañero relevo identificado: Iniciar automáticamente la guardia de B
      if (payload.guardiaRelevoId || payload.guardiaRelevoNombre) {
        // Buscar el empleado relevo (por ID o por nombre)
        const empleadoRelevo = payload.guardiaRelevoId
          ? await tx.empleado.findUnique({
              where: { id: payload.guardiaRelevoId },
              select: { id: true, nombre: true, cargo: true, propiedadId: true },
            })
          : await tx.empleado.findFirst({
              where: {
                nombre: { startsWith: payload.guardiaRelevoNombre?.split(" ")[0] },
                propiedadId: empleado.propiedadId,
                cargo: CargoEmpleado.SEGURIDAD,
                activo: true,
              },
              select: { id: true, nombre: true, cargo: true, propiedadId: true },
            });

        if (empleadoRelevo && empleadoRelevo.id !== empleado.id) {
          // Verificar si B ya tiene un turno abierto para no duplicar
          const turnoAbiertoRelevo = await tx.registroAsistencia.findFirst({
            where: {
              empleadoId: empleadoRelevo.id,
              horaSalida: null,
              horaEntrada: { gte: limite30Horas },
            },
          });

          if (!turnoAbiertoRelevo) {
            await tx.registroAsistencia.create({
              data: {
                empleadoId: empleadoRelevo.id,
                fecha: ahora,
                horaEntrada: ahora,
                estado: EstadoAsistencia.PRESENTE,
                ubicacionEntrada: nombreLugar,
                observaciones: `Inicio de guardia automática por relevo (Recibido de ${nombreVigilanteSaliente})`,
              },
            });
          }
        }
      }
    });

    revalidatePath("/empleado/dashboard");
    revalidatePath("/empleado/asistencia");
    revalidatePath("/admin/personal");

    const mensajeSalida = esGuardia24h
      ? (payload.guardiaRelevoNombre
          ? `Guardia de 24h entregada con éxito a ${payload.guardiaRelevoNombre} a las ${ahora.toLocaleTimeString("es-VE", { hour: "2-digit", minute: "2-digit" })}. ¡Excelente labor!`
          : `Guardia de 24h concluida con éxito a las ${ahora.toLocaleTimeString("es-VE", { hour: "2-digit", minute: "2-digit" })} (${diffHoras}h). ¡Buen descanso!`)
      : `Salida registrada con éxito a las ${ahora.toLocaleTimeString("es-VE", { hour: "2-digit", minute: "2-digit" })}. ¡Buen descanso!`;

    return {
      success: true,
      tipo: "SALIDA",
      esGuardia24h,
      horasLaboradas: diffHoras,
      message: mensajeSalida,
    };
  } catch (error: unknown) {
    console.error("Error en marcarEntradaSalidaEmpleadoAction:", error);
    const msg = error instanceof Error ? error.message : "Error al procesar el marcaje";
    return { success: false, error: msg, message: msg };
  }
}

// Iniciar una tarea (pasa a EN_PROCESO)
export async function iniciarTareaEmpleadoAction(tareaId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const empleado = await getEmpleadoAutenticado();
    if (!empleado) {
      return { success: false, error: "No autorizado." };
    }

    const tarea = await prisma.tareaEmpleado.findUnique({ where: { id: tareaId } });
    if (!tarea || tarea.empleadoId !== empleado.id) {
      return { success: false, error: "La tarea no existe o no te pertenece." };
    }

    await prisma.tareaEmpleado.update({
      where: { id: tareaId },
      data: { estado: EstadoTarea.EN_PROCESO },
    });

    revalidatePath("/empleado/tareas");
    revalidatePath("/empleado/dashboard");
    revalidatePath("/admin/personal");

    return { success: true };
  } catch (error: unknown) {
    console.error("Error en iniciarTareaEmpleadoAction:", error);
    const msg = error instanceof Error ? error.message : "Error al iniciar la tarea";
    return { success: false, error: msg };
  }
}

// Completar una tarea con evidencias fotográficas y notas
export async function completarTareaEmpleadoAction(
  tareaId: string,
  notasResolucion?: string | null,
  evidencias?: string[]
): Promise<{ success: boolean; error?: string }> {
  try {
    const empleado = await getEmpleadoAutenticado();
    if (!empleado) {
      return { success: false, error: "No autorizado." };
    }

    const tarea = await prisma.tareaEmpleado.findUnique({ where: { id: tareaId } });
    if (!tarea || tarea.empleadoId !== empleado.id) {
      return { success: false, error: "La tarea no existe o no te pertenece." };
    }

    const fotosFinales = evidencias || [];
    if (tarea.requiereEvidencia && fotosFinales.length === 0) {
      return { success: false, error: "Esta labor requiere al menos una fotografía de evidencia para poder finalizarse." };
    }

    await prisma.tareaEmpleado.update({
      where: { id: tareaId },
      data: {
        estado: EstadoTarea.COMPLETADA,
        fechaCompletada: new Date(),
        notasResolucion: notasResolucion?.trim() || null,
        evidencias: fotosFinales,
      },
    });

    revalidatePath("/empleado/tareas");
    revalidatePath("/empleado/dashboard");
    revalidatePath("/admin/personal");

    return { success: true };
  } catch (error: unknown) {
    console.error("Error en completarTareaEmpleadoAction:", error);
    const msg = error instanceof Error ? error.message : "Error al finalizar la tarea";
    return { success: false, error: msg };
  }
}

// Historial detallado de asistencia para la vista /empleado/asistencia
export async function getHistorialAsistenciaEmpleadoAction(): Promise<{
  success: boolean;
  data?: RegistroAsistenciaItem[];
  error?: string;
}> {
  try {
    const empleado = await getEmpleadoAutenticado();
    if (!empleado) {
      return { success: false, error: "No autorizado.", data: [] };
    }

    const registros = await prisma.registroAsistencia.findMany({
      where: { empleadoId: empleado.id },
      orderBy: { fecha: "desc" },
      take: 60,
    });

    const items: RegistroAsistenciaItem[] = registros.map((r) => ({
      id: r.id,
      empleadoId: r.empleadoId,
      fecha: r.fecha.toISOString(),
      horaEntrada: r.horaEntrada.toISOString(),
      horaSalida: r.horaSalida ? r.horaSalida.toISOString() : null,
      estado: r.estado,
      ubicacionEntrada: r.ubicacionEntrada,
      ubicacionSalida: r.ubicacionSalida,
      observaciones: r.observaciones,
      createdAt: r.createdAt.toISOString(),
    }));

    return { success: true, data: items };
  } catch (error: unknown) {
    console.error("Error en getHistorialAsistenciaEmpleadoAction:", error);
    const msg = error instanceof Error ? error.message : "Error al consultar historial";
    return { success: false, error: msg, data: [] };
  }
}

// Cambio de contraseña para el perfil del empleado
export async function cambiarPasswordEmpleadoAction(
  passwordActual: string,
  passwordNueva: string
): Promise<{ success: boolean; message: string; error?: string }> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "No autorizado.", message: "" };
    }

    if (!passwordActual || !passwordNueva) {
      return { success: false, error: "Debes ingresar tu contraseña actual y la nueva.", message: "" };
    }

    if (passwordNueva.length < 6) {
      return { success: false, error: "La nueva contraseña debe tener al menos 6 caracteres.", message: "" };
    }

    const usuario = await prisma.usuario.findUnique({
      where: { id: session.user.id },
      select: { id: true, passwordHash: true },
    });

    if (!usuario) {
      return { success: false, error: "Usuario no encontrado.", message: "" };
    }

    const coinciden = await bcrypt.compare(passwordActual, usuario.passwordHash);
    if (!coinciden) {
      return { success: false, error: "La contraseña actual no es correcta.", message: "" };
    }

    const nuevoHash = await bcrypt.hash(passwordNueva, 10);
    await prisma.usuario.update({
      where: { id: usuario.id },
      data: { passwordHash: nuevoHash },
    });

    return { success: true, message: "Contraseña actualizada exitosamente." };
  } catch (error: unknown) {
    console.error("Error en cambiarPasswordEmpleadoAction:", error);
    const msg = error instanceof Error ? error.message : "Error al actualizar contraseña";
    return { success: false, error: msg, message: msg };
  }
}
