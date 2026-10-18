"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import bcrypt from "bcryptjs";
import {
  CargoEmpleado,
  EstadoAsistencia,
  PrioridadTarea,
  EstadoTarea,
  Rol,
} from "@prisma/client";
import type {
  PersonalDashboardData,
  EmpleadoItem,
  RegistroAsistenciaItem,
  TareaEmpleadoItem,
  PropiedadOpcion,
} from "@/app/admin/personal/types";

// Esquema de validación para registrar un empleado
const createEmpleadoSchema = z.object({
  nombre: z.string().min(2, "El nombre es requerido").trim(),
  apellido: z.string().optional().nullable(),
  cedula: z.string().min(3, "La cédula es requerida").trim().toUpperCase(),
  telefono: z.string().min(6, "El teléfono de contacto es requerido").trim(),
  email: z.string().email("Correo electrónico inválido").optional().nullable().or(z.literal("")),
  direccion: z.string().optional().nullable(),
  cargo: z.nativeEnum(CargoEmpleado).default(CargoEmpleado.CONSERJE),
  fechaIngreso: z.string().optional().nullable(),
  salarioMensual: z.number().optional().nullable(),
  notas: z.string().optional().nullable(),
  propiedadId: z.string().optional().nullable(),
  crearUsuario: z.boolean().optional(),
  passwordTemporal: z.string().optional().nullable(),
});

const updateEmpleadoSchema = createEmpleadoSchema.partial();

export type CreateEmpleadoInput = z.infer<typeof createEmpleadoSchema>;
export type UpdateEmpleadoInput = z.infer<typeof updateEmpleadoSchema>;

// Obtención integral de datos para el módulo de personal
export async function getPersonalData(): Promise<PersonalDashboardData> {
  const hoy = new Date();
  const inicioDia = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate(), 0, 0, 0);
  const finDia = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate(), 23, 59, 59);
  const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1, 0, 0, 0);

  // Consultas paralelas optimizadas para Neon Cloud
  const [
    empleadosRaw,
    asistenciasHoyRaw,
    tareasRaw,
    propiedadesRaw,
    tareasCompletadasMesCount,
  ] = await Promise.all([
    prisma.empleado.findMany({
      include: {
        propiedad: {
          select: {
            id: true,
            nombre: true,
            ciudad: true,
          },
        },
        usuario: {
          select: {
            id: true,
            email: true,
            rol: true,
            activo: true,
          },
        },
        asistencias: {
          where: {
            fecha: {
              gte: inicioDia,
              lte: finDia,
            },
          },
          take: 1,
          orderBy: { horaEntrada: "desc" },
        },
        tareas: {
          where: {
            estado: {
              in: [EstadoTarea.PENDIENTE, EstadoTarea.EN_PROCESO],
            },
          },
          select: { id: true },
        },
        _count: {
          select: {
            tareas: true,
            asistencias: true,
          },
        },
      },
      orderBy: [{ activo: "desc" }, { nombre: "asc" }],
    }),
    prisma.registroAsistencia.findMany({
      where: {
        fecha: {
          gte: inicioDia,
          lte: finDia,
        },
      },
      include: {
        empleado: {
          select: {
            nombre: true,
            apellido: true,
            cargo: true,
          },
        },
      },
      orderBy: { horaEntrada: "desc" },
    }),
    prisma.tareaEmpleado.findMany({
      include: {
        empleado: {
          select: {
            nombre: true,
            apellido: true,
            cargo: true,
          },
        },
        propiedad: {
          select: {
            nombre: true,
          },
        },
      },
      orderBy: [{ estado: "asc" }, { createdAt: "desc" }],
      take: 100,
    }),
    prisma.propiedad.findMany({
      where: { activo: true },
      select: {
        id: true,
        nombre: true,
        tipo: true,
        ciudad: true,
      },
      orderBy: { nombre: "asc" },
    }),
    prisma.tareaEmpleado.count({
      where: {
        estado: EstadoTarea.COMPLETADA,
        fechaCompletada: {
          gte: inicioMes,
        },
      },
    }),
  ]);

  // Transformación serializable para Client Components
  const empleados: EmpleadoItem[] = empleadosRaw.map((emp) => {
    const asistenciaHoy = emp.asistencias[0]
      ? {
          id: emp.asistencias[0].id,
          empleadoId: emp.asistencias[0].empleadoId,
          fecha: emp.asistencias[0].fecha.toISOString(),
          horaEntrada: emp.asistencias[0].horaEntrada.toISOString(),
          horaSalida: emp.asistencias[0].horaSalida?.toISOString() || null,
          estado: emp.asistencias[0].estado,
          ubicacionEntrada: emp.asistencias[0].ubicacionEntrada,
          ubicacionSalida: emp.asistencias[0].ubicacionSalida,
          observaciones: emp.asistencias[0].observaciones,
          createdAt: emp.asistencias[0].createdAt.toISOString(),
        }
      : null;

    return {
      id: emp.id,
      nombre: emp.nombre,
      apellido: emp.apellido,
      cedula: emp.cedula,
      telefono: emp.telefono,
      email: emp.email,
      direccion: emp.direccion,
      cargo: emp.cargo,
      fechaIngreso: emp.fechaIngreso.toISOString(),
      salarioMensual: emp.salarioMensual,
      activo: emp.activo,
      notas: emp.notas,
      propiedadId: emp.propiedadId,
      propiedad: emp.propiedad,
      usuarioId: emp.usuarioId,
      usuario: emp.usuario
        ? {
            id: emp.usuario.id,
            email: emp.usuario.email,
            rol: emp.usuario.rol,
            activo: emp.usuario.activo,
          }
        : null,
      asistenciaHoy,
      _count: emp._count,
      tareasPendientesCount: emp.tareas.length,
    };
  });

  const asistenciasHoy: RegistroAsistenciaItem[] = asistenciasHoyRaw.map((asist) => ({
    id: asist.id,
    empleadoId: asist.empleadoId,
    empleadoNombre: `${asist.empleado.nombre} ${asist.empleado.apellido || ""}`.trim(),
    empleadoCargo: asist.empleado.cargo,
    fecha: asist.fecha.toISOString(),
    horaEntrada: asist.horaEntrada.toISOString(),
    horaSalida: asist.horaSalida?.toISOString() || null,
    estado: asist.estado,
    ubicacionEntrada: asist.ubicacionEntrada,
    ubicacionSalida: asist.ubicacionSalida,
    observaciones: asist.observaciones,
    createdAt: asist.createdAt.toISOString(),
  }));

  const tareas: TareaEmpleadoItem[] = tareasRaw.map((t) => ({
    id: t.id,
    titulo: t.titulo,
    descripcion: t.descripcion,
    empleadoId: t.empleadoId,
    empleadoNombre: `${t.empleado.nombre} ${t.empleado.apellido || ""}`.trim(),
    empleadoCargo: t.empleado.cargo,
    propiedadId: t.propiedadId,
    propiedadNombre: t.propiedad?.nombre || null,
    prioridad: t.prioridad,
    estado: t.estado,
    fechaLimite: t.fechaLimite?.toISOString() || null,
    fechaCompletada: t.fechaCompletada?.toISOString() || null,
    evidencias: t.evidencias,
    notasResolucion: t.notasResolucion,
    createdAt: t.createdAt.toISOString(),
  }));

  const propiedades: PropiedadOpcion[] = propiedadesRaw.map((p) => ({
    id: p.id,
    nombre: p.nombre,
    tipo: p.tipo,
    ciudad: p.ciudad,
  }));

  // Cálculo de métricas ejecutivas
  const totalEmpleados = empleados.length;
  const activosCount = empleados.filter((e) => e.activo).length;
  const asistieronHoyCount = asistenciasHoy.filter(
    (a) => a.estado === EstadoAsistencia.PRESENTE || a.estado === EstadoAsistencia.RETARDO
  ).length;
  const tareasPendientesCount = tareas.filter(
    (t) => t.estado === EstadoTarea.PENDIENTE || t.estado === EstadoTarea.EN_PROCESO
  ).length;
  const tareasUrgentesCount = tareas.filter(
    (t) =>
      (t.estado === EstadoTarea.PENDIENTE || t.estado === EstadoTarea.EN_PROCESO) &&
      t.prioridad === PrioridadTarea.URGENTE
  ).length;

  return {
    empleados,
    asistenciasHoy,
    tareas,
    propiedades,
    metricas: {
      totalEmpleados,
      activosCount,
      asistieronHoyCount,
      tareasPendientesCount,
      tareasUrgentesCount,
      tareasCompletadasMesCount,
    },
  };
}

// Acción para registrar un nuevo empleado con opción de crear credenciales
export async function crearEmpleadoAction(rawInput: CreateEmpleadoInput) {
  try {
    const validated = createEmpleadoSchema.parse(rawInput);

    // Verificar unicidad de cédula
    const existeCedula = await prisma.empleado.findUnique({
      where: { cedula: validated.cedula },
    });
    if (existeCedula) {
      return { success: false, error: "Ya existe un colaborador registrado con esta cédula." };
    }

    let usuarioId: string | null = null;

    // Crear cuenta de acceso opcional para el portal del empleado
    if (validated.crearUsuario && validated.email) {
      const existeEmail = await prisma.usuario.findUnique({
        where: { email: validated.email },
      });

      if (existeEmail) {
        return {
          success: false,
          error: "El correo electrónico ya está registrado para otro usuario del sistema.",
        };
      }

      const pass = validated.passwordTemporal?.trim() || "Conte2026*";
      const passwordHash = await bcrypt.hash(pass, 10);

      const nuevoUsuario = await prisma.usuario.create({
        data: {
          email: validated.email,
          passwordHash,
          nombre: validated.nombre,
          apellido: validated.apellido || null,
          cedula: validated.cedula,
          telefono: validated.telefono,
          direccion: validated.direccion || null,
          rol: Rol.EMPLEADO,
          activo: true,
        },
      });
      usuarioId = nuevoUsuario.id;
    }

    const fechaIngreso = validated.fechaIngreso
      ? new Date(validated.fechaIngreso)
      : new Date();

    const propiedadId =
      validated.propiedadId === "GENERAL" || !validated.propiedadId
        ? null
        : validated.propiedadId;

    const nuevoEmpleado = await prisma.empleado.create({
      data: {
        nombre: validated.nombre,
        apellido: validated.apellido || null,
        cedula: validated.cedula,
        telefono: validated.telefono,
        email: validated.email || null,
        direccion: validated.direccion || null,
        cargo: validated.cargo,
        fechaIngreso,
        salarioMensual: validated.salarioMensual ?? null,
        notas: validated.notas || null,
        propiedadId,
        activo: true,
        usuarioId,
      },
    });

    revalidatePath("/admin/personal");
    return { success: true, data: nuevoEmpleado };
  } catch (error: unknown) {
    console.error("Error en crearEmpleadoAction:", error);
    if (error instanceof z.ZodError) {
      return { success: false, error: error.issues[0]?.message || "Datos inválidos" };
    }
    const msg = error instanceof Error ? error.message : "Error al registrar el empleado";
    return { success: false, error: msg };
  }
}

// Acción para actualizar datos de un empleado
export async function actualizarEmpleadoAction(id: string, rawInput: UpdateEmpleadoInput) {
  try {
    const validated = updateEmpleadoSchema.parse(rawInput);

    const empleadoExistente = await prisma.empleado.findUnique({
      where: { id },
    });
    if (!empleadoExistente) {
      return { success: false, error: "Colaborador no encontrado." };
    }

    // Si se modifica la cédula, validar unicidad
    if (validated.cedula && validated.cedula !== empleadoExistente.cedula) {
      const existeCedula = await prisma.empleado.findUnique({
        where: { cedula: validated.cedula },
      });
      if (existeCedula) {
        return { success: false, error: "Ya existe otro colaborador con esta cédula." };
      }
    }

    let usuarioId = empleadoExistente.usuarioId;

    // Crear cuenta si no tenía y el usuario la solicitó ahora
    if (!usuarioId && validated.crearUsuario && validated.email) {
      const existeEmail = await prisma.usuario.findUnique({
        where: { email: validated.email },
      });
      if (existeEmail) {
        return {
          success: false,
          error: "El correo electrónico ya está registrado para otro usuario.",
        };
      }

      const pass = validated.passwordTemporal?.trim() || "Conte2026*";
      const passwordHash = await bcrypt.hash(pass, 10);

      const nuevoUsuario = await prisma.usuario.create({
        data: {
          email: validated.email,
          passwordHash,
          nombre: validated.nombre || empleadoExistente.nombre,
          apellido: validated.apellido || empleadoExistente.apellido,
          cedula: validated.cedula || empleadoExistente.cedula,
          telefono: validated.telefono || empleadoExistente.telefono,
          direccion: validated.direccion || empleadoExistente.direccion,
          rol: Rol.EMPLEADO,
          activo: true,
        },
      });
      usuarioId = nuevoUsuario.id;
    }

    const empleadoActualizado = await prisma.empleado.update({
      where: { id },
      data: {
        ...(validated.nombre && { nombre: validated.nombre }),
        apellido: validated.apellido !== undefined ? validated.apellido : empleadoExistente.apellido,
        ...(validated.cedula && { cedula: validated.cedula }),
        ...(validated.telefono && { telefono: validated.telefono }),
        email: validated.email !== undefined ? validated.email : empleadoExistente.email,
        direccion: validated.direccion !== undefined ? validated.direccion : empleadoExistente.direccion,
        ...(validated.cargo && { cargo: validated.cargo }),
        ...(validated.fechaIngreso && { fechaIngreso: new Date(validated.fechaIngreso) }),
        salarioMensual:
          validated.salarioMensual !== undefined
            ? validated.salarioMensual
            : empleadoExistente.salarioMensual,
        notas: validated.notas !== undefined ? validated.notas : empleadoExistente.notas,
        ...(validated.propiedadId !== undefined && {
          propiedadId:
            validated.propiedadId === "GENERAL" || !validated.propiedadId
              ? null
              : validated.propiedadId,
        }),
        usuarioId,
      },
    });

    revalidatePath("/admin/personal");
    return { success: true, data: empleadoActualizado };
  } catch (error: unknown) {
    console.error("Error en actualizarEmpleadoAction:", error);
    if (error instanceof z.ZodError) {
      return { success: false, error: error.issues[0]?.message || "Datos inválidos" };
    }
    const msg = error instanceof Error ? error.message : "Error al actualizar el colaborador";
    return { success: false, error: msg };
  }
}

// Acción para activar / suspender un empleado (soft-delete)
export async function toggleEstadoEmpleadoAction(id: string, activo: boolean) {
  try {
    const empleado = await prisma.empleado.findUnique({
      where: { id },
      select: { id: true, usuarioId: true },
    });
    if (!empleado) {
      return { success: false, error: "Colaborador no encontrado" };
    }

    await prisma.empleado.update({
      where: { id },
      data: { activo },
    });

    // Sincronizar estado de la cuenta de usuario vinculada
    if (empleado.usuarioId) {
      await prisma.usuario.update({
        where: { id: empleado.usuarioId },
        data: { activo },
      });
    }

    revalidatePath("/admin/personal");
    return {
      success: true,
      message: activo ? "Colaborador reactivado exitosamente." : "Colaborador desactivado correctamente.",
    };
  } catch (error: unknown) {
    console.error("Error en toggleEstadoEmpleadoAction:", error);
    const msg = error instanceof Error ? error.message : "Error al cambiar estado";
    return { success: false, error: msg };
  }
}

// Esquema para registrar asistencia manual o pase de lista
const registrarAsistenciaSchema = z.object({
  empleadoId: z.string().min(1, "El colaborador es requerido"),
  fecha: z.string().optional(),
  horaEntrada: z.string().optional(),
  horaSalida: z.string().optional().nullable(),
  estado: z.nativeEnum(EstadoAsistencia).default(EstadoAsistencia.PRESENTE),
  ubicacionEntrada: z.string().optional().nullable(),
  ubicacionSalida: z.string().optional().nullable(),
  observaciones: z.string().optional().nullable(),
});

export type RegistrarAsistenciaInput = z.infer<typeof registrarAsistenciaSchema>;

// Registrar asistencia diaria
export async function registrarAsistenciaAction(rawInput: RegistrarAsistenciaInput) {
  try {
    const validated = registrarAsistenciaSchema.parse(rawInput);

    const baseFecha = validated.fecha ? new Date(validated.fecha) : new Date();
    const inicioDia = new Date(baseFecha.getFullYear(), baseFecha.getMonth(), baseFecha.getDate(), 0, 0, 0);
    const finDia = new Date(baseFecha.getFullYear(), baseFecha.getMonth(), baseFecha.getDate(), 23, 59, 59);

    // Parsear horas
    const horaEntrada = validated.horaEntrada ? new Date(validated.horaEntrada) : new Date();
    const horaSalida = validated.horaSalida ? new Date(validated.horaSalida) : null;

    // Buscar si ya tiene asistencia ese día
    const asistenciaExistente = await prisma.registroAsistencia.findFirst({
      where: {
        empleadoId: validated.empleadoId,
        fecha: {
          gte: inicioDia,
          lte: finDia,
        },
      },
    });

    if (asistenciaExistente) {
      // Actualizar registro existente
      const actualizado = await prisma.registroAsistencia.update({
        where: { id: asistenciaExistente.id },
        data: {
          estado: validated.estado,
          horaEntrada,
          horaSalida: horaSalida || asistenciaExistente.horaSalida,
          ubicacionEntrada: validated.ubicacionEntrada ?? asistenciaExistente.ubicacionEntrada,
          ubicacionSalida: validated.ubicacionSalida ?? asistenciaExistente.ubicacionSalida,
          observaciones: validated.observaciones ?? asistenciaExistente.observaciones,
        },
      });
      revalidatePath("/admin/personal");
      return { success: true, data: actualizado, message: "Asistencia actualizada correctamente." };
    }

    // Crear nuevo registro
    const nuevo = await prisma.registroAsistencia.create({
      data: {
        empleadoId: validated.empleadoId,
        fecha: baseFecha,
        horaEntrada,
        horaSalida,
        estado: validated.estado,
        ubicacionEntrada: validated.ubicacionEntrada || "Administración Central",
        ubicacionSalida: validated.ubicacionSalida || null,
        observaciones: validated.observaciones || null,
      },
    });

    revalidatePath("/admin/personal");
    return { success: true, data: nuevo, message: "Asistencia registrada con éxito." };
  } catch (error: unknown) {
    console.error("Error en registrarAsistenciaAction:", error);
    const msg = error instanceof Error ? error.message : "Error al registrar la asistencia";
    return { success: false, error: msg };
  }
}

// Marcar salida de la jornada
export async function marcarSalidaAction(
  asistenciaId: string,
  horaSalidaStr?: string,
  ubicacionSalida?: string
) {
  try {
    const horaSalida = horaSalidaStr ? new Date(horaSalidaStr) : new Date();

    const actualizado = await prisma.registroAsistencia.update({
      where: { id: asistenciaId },
      data: {
        horaSalida,
        ubicacionSalida: ubicacionSalida || "Marcaje Administrativo",
      },
    });

    revalidatePath("/admin/personal");
    return { success: true, data: actualizado, message: "Salida registrada con éxito." };
  } catch (error: unknown) {
    console.error("Error en marcarSalidaAction:", error);
    const msg = error instanceof Error ? error.message : "Error al registrar salida";
    return { success: false, error: msg };
  }
}

// Esquema para asignar tarea a un empleado
const createTareaSchema = z.object({
  empleadoId: z.string().min(1, "El colaborador responsable es requerido"),
  propiedadId: z.string().optional().nullable(),
  titulo: z.string().min(3, "El título o descripción corta es requerido").trim(),
  descripcion: z.string().optional().nullable(),
  prioridad: z.nativeEnum(PrioridadTarea).default(PrioridadTarea.NORMAL),
  fechaLimite: z.string().optional().nullable(),
});

export type CreateTareaInput = z.infer<typeof createTareaSchema>;

// Crear nueva orden de tarea
export async function crearTareaAction(rawInput: CreateTareaInput) {
  try {
    const validated = createTareaSchema.parse(rawInput);

    const fechaLimite = validated.fechaLimite ? new Date(validated.fechaLimite) : null;

    const nuevaTarea = await prisma.tareaEmpleado.create({
      data: {
        empleadoId: validated.empleadoId,
        propiedadId: validated.propiedadId === "GENERAL" || !validated.propiedadId ? null : validated.propiedadId,
        titulo: validated.titulo,
        descripcion: validated.descripcion || null,
        prioridad: validated.prioridad,
        estado: EstadoTarea.PENDIENTE,
        fechaLimite,
        evidencias: [],
      },
    });

    revalidatePath("/admin/personal");
    return { success: true, data: nuevaTarea, message: "Tarea asignada exitosamente." };
  } catch (error: unknown) {
    console.error("Error en crearTareaAction:", error);
    if (error instanceof z.ZodError) {
      return { success: false, error: error.issues[0]?.message || "Datos inválidos" };
    }
    const msg = error instanceof Error ? error.message : "Error al asignar la tarea";
    return { success: false, error: msg };
  }
}

// Actualizar estado de una tarea y registrar evidencias
export async function actualizarEstadoTareaAction(
  tareaId: string,
  estado: EstadoTarea,
  notasResolucion?: string | null,
  nuevasEvidencias?: string[]
) {
  try {
    const tareaExistente = await prisma.tareaEmpleado.findUnique({
      where: { id: tareaId },
    });
    if (!tareaExistente) {
      return { success: false, error: "Tarea no encontrada." };
    }

    const evidenciasFinales = nuevasEvidencias
      ? Array.from(new Set([...tareaExistente.evidencias, ...nuevasEvidencias]))
      : tareaExistente.evidencias;

    const fechaCompletada =
      estado === EstadoTarea.COMPLETADA
        ? tareaExistente.fechaCompletada || new Date()
        : null;

    const actualizada = await prisma.tareaEmpleado.update({
      where: { id: tareaId },
      data: {
        estado,
        fechaCompletada,
        notasResolucion: notasResolucion !== undefined ? notasResolucion : tareaExistente.notasResolucion,
        evidencias: evidenciasFinales,
      },
    });

    revalidatePath("/admin/personal");
    return { success: true, data: actualizada, message: "Estado de la tarea actualizado." };
  } catch (error: unknown) {
    console.error("Error en actualizarEstadoTareaAction:", error);
    const msg = error instanceof Error ? error.message : "Error al actualizar la tarea";
    return { success: false, error: msg };
  }
}

// Eliminar tarea
export async function eliminarTareaAction(tareaId: string) {
  try {
    await prisma.tareaEmpleado.delete({
      where: { id: tareaId },
    });

    revalidatePath("/admin/personal");
    return { success: true, message: "Tarea eliminada correctamente." };
  } catch (error: unknown) {
    console.error("Error en eliminarTareaAction:", error);
    const msg = error instanceof Error ? error.message : "Error al eliminar la tarea";
    return { success: false, error: msg };
  }
}
