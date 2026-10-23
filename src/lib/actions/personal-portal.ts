"use server";

import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { Rol, CargoEmpleado, EstadoAsistencia, EstadoTarea, PrioridadTarea } from "@prisma/client";
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

  // Modo auditoría/prueba: si un ADMIN ingresa al portal de empleados pero no tiene ficha vinculada
  if (!empleado && session.user.rol === Rol.ADMIN) {
    empleado = await prisma.empleado.findFirst({
      where: { activo: true },
      include: { propiedad: { select: { id: true, nombre: true } } },
    });
  }

  return empleado;
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
  } | null;
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
  metricas: {
    tareasPendientes: number;
    tareasEnProceso: number;
    tareasCompletadasMes: number;
    asistenciasMes: number;
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

    // Consulta paralela de solo lectura
    const [asistenciaHoy, tareas, completadasMesCount, asistenciasMesCount] = await Promise.all([
      prisma.registroAsistencia.findFirst({
        where: {
          empleadoId: empleado.id,
          fecha: { gte: inicioHoy, lte: finHoy },
        },
      }),
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
    ]);

    const tareasPendientes = tareas.filter((t) => t.estado === EstadoTarea.PENDIENTE).length;
    const tareasEnProceso = tareas.filter((t) => t.estado === EstadoTarea.EN_PROCESO).length;

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
        asistenciaHoy: asistenciaHoy
          ? {
              id: asistenciaHoy.id,
              fecha: asistenciaHoy.fecha.toISOString(),
              horaEntrada: asistenciaHoy.horaEntrada.toISOString(),
              horaSalida: asistenciaHoy.horaSalida ? asistenciaHoy.horaSalida.toISOString() : null,
              estado: asistenciaHoy.estado,
              ubicacionEntrada: asistenciaHoy.ubicacionEntrada,
              ubicacionSalida: asistenciaHoy.ubicacionSalida,
            }
          : null,
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
        metricas: {
          tareasPendientes,
          tareasEnProceso,
          tareasCompletadasMes: completadasMesCount,
          asistenciasMes: asistenciasMesCount,
        },
      },
    };
  } catch (error: unknown) {
    console.error("Error en getPortalEmpleadoData:", error);
    const msg = error instanceof Error ? error.message : "Error al obtener datos del portal de empleado";
    return { success: false, error: msg };
  }
}

// Marcaje de jornada de 1 toque (Entrada o Salida) ejecutado con hora de servidor atómica
export async function marcarEntradaSalidaEmpleadoAction(ubicacion?: string): Promise<{
  success: boolean;
  tipo?: "ENTRADA" | "SALIDA" | "YA_COMPLETADA";
  message: string;
  error?: string;
}> {
  try {
    const empleado = await getEmpleadoAutenticado();
    if (!empleado) {
      return { success: false, error: "No autorizado o sin ficha de empleado asignada.", message: "" };
    }

    const ahora = new Date();
    const inicioHoy = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate(), 0, 0, 0);
    const finHoy = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate(), 23, 59, 59, 999);

    // Cierre perezoso (Just-In-Time) de turnos olvidados anteriores de este trabajador
    await cerrarJornadasIncompletasEmpleado(empleado.id);

    const asistenciaHoy = await prisma.registroAsistencia.findFirst({
      where: {
        empleadoId: empleado.id,
        fecha: { gte: inicioHoy, lte: finHoy },
      },
    });

    const nombreLugar = ubicacion || empleado.propiedad?.nombre || "Marcaje Móvil";

    // Si aún no ha marcado entrada hoy: Registrar ENTRADA
    if (!asistenciaHoy) {
      await prisma.registroAsistencia.create({
        data: {
          empleadoId: empleado.id,
          fecha: ahora,
          horaEntrada: ahora,
          estado: EstadoAsistencia.PRESENTE,
          ubicacionEntrada: nombreLugar,
        },
      });

      revalidatePath("/empleado/dashboard");
      revalidatePath("/empleado/asistencia");
      revalidatePath("/admin/personal");

      return {
        success: true,
        tipo: "ENTRADA",
        message: `Entrada registrada con éxito a las ${ahora.toLocaleTimeString("es-VE", { hour: "2-digit", minute: "2-digit" })}.`,
      };
    }

    // Si ya marcó entrada pero no ha marcado salida: Registrar SALIDA
    if (!asistenciaHoy.horaSalida) {
      await prisma.registroAsistencia.update({
        where: { id: asistenciaHoy.id },
        data: {
          horaSalida: ahora,
          ubicacionSalida: nombreLugar,
        },
      });

      revalidatePath("/empleado/dashboard");
      revalidatePath("/empleado/asistencia");
      revalidatePath("/admin/personal");

      return {
        success: true,
        tipo: "SALIDA",
        message: `Salida registrada con éxito a las ${ahora.toLocaleTimeString("es-VE", { hour: "2-digit", minute: "2-digit" })}. ¡Buen descanso!`,
      };
    }

    return {
      success: true,
      tipo: "YA_COMPLETADA",
      message: "Ya completaste tu jornada de trabajo del día de hoy.",
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
