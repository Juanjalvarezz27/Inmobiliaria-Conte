"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { auth } from "@/auth";
import {
  CargoEmpleado,
  EstadoAsistencia,
  PrioridadTarea,
  EstadoTarea,
  Rol,
  Prisma,
} from "@prisma/client";
import { PaginationParams, PaginatedResult } from "@/types/pagination";
import { resolvePagination, createPaginatedResponse } from "@/lib/pagination-helper";
import type {
  PersonalDashboardData,
  EmpleadoItem,
  RegistroAsistenciaItem,
  TareaEmpleadoItem,
  PropiedadOpcion,
} from "@/app/admin/personal/types";
import { enviarNotificacionNuevaTarea } from "@/lib/email-templates/notificacion-tarea";

// Esquema de validación para registrar un empleado
const createEmpleadoSchema = z.object({
  nombre: z.string().min(2, "El nombre es requerido").trim(),
  apellido: z.string().optional().nullable(),
  cedula: z.string().min(3, "La cédula es requerida").trim().toUpperCase(),
  telefono: z.string().min(6, "El teléfono de contacto es requerido").trim(),
  email: z.string().email("Correo electrónico inválido").optional().nullable().or(z.literal("")),
  direccion: z.string().optional().nullable(),
  cargo: z.nativeEnum(CargoEmpleado).default(CargoEmpleado.CONSERJE),
  cargoPersonalizado: z.string().optional().nullable(),
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

// Cierre perezoso (Just-In-Time) de jornadas anteriores olvidadas para un empleado específico
export async function cerrarJornadasIncompletasEmpleado(empleadoId: string): Promise<number> {
  try {
    const ahora = new Date();
    const inicioHoy = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate(), 0, 0, 0, 0);

    const res = await prisma.registroAsistencia.updateMany({
      where: {
        empleadoId,
        horaSalida: null,
        fecha: { lt: inicioHoy },
        estado: { in: [EstadoAsistencia.PRESENTE, EstadoAsistencia.RETARDO] },
      },
      data: {
        horaSalida: new Date(inicioHoy.getTime() - 1000),
        ubicacionSalida: "Cierre Automático",
        observaciones: "Salida no registrada por el trabajador. Cierre automático por inicio de nuevo turno.",
      },
    });

    return res.count;
  } catch (error) {
    console.error("Error en cerrarJornadasIncompletasEmpleado:", error);
    return 0;
  }
}

// Cierre masivo en 1 sola consulta atómica (sin bucle N+1)
export async function cerrarJornadasIncompletasPasadas(): Promise<{ cerradas: number }> {
  try {
    const ahora = new Date();
    const inicioHoy = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate(), 0, 0, 0, 0);

    const res = await prisma.registroAsistencia.updateMany({
      where: {
        horaSalida: null,
        fecha: { lt: inicioHoy },
        estado: { in: [EstadoAsistencia.PRESENTE, EstadoAsistencia.RETARDO] },
      },
      data: {
        horaSalida: new Date(inicioHoy.getTime() - 1000),
        ubicacionSalida: "Cierre Automático",
        observaciones: "Salida no registrada por el trabajador. Cierre automático de jornada.",
      },
    });

    return { cerradas: res.count };
  } catch (error) {
    console.error("Error en cerrarJornadasIncompletasPasadas:", error);
    return { cerradas: 0 };
  }
}

// Helper para calcular días hábiles (Lunes a Viernes) transcurridos
function calcularDiasLaborables(desde: Date, hasta: Date): number {
  let count = 0;
  const cursor = new Date(desde.getFullYear(), desde.getMonth(), desde.getDate(), 0, 0, 0, 0);
  const fin = new Date(hasta.getFullYear(), hasta.getMonth(), hasta.getDate(), 0, 0, 0, 0);
  while (cursor < fin) {
    const day = cursor.getDay();
    if (day !== 0 && day !== 6) {
      count++;
    }
    cursor.setDate(cursor.getDate() + 1);
  }
  return count;
}


// Sincronización automática de inasistencias para días laborales pasados no registrados
export async function sincronizarInasistenciasPasadas(): Promise<{ sincronizadas: number }> {
  try {
    // Primero cerramos automáticamente cualquier jornada anterior que haya quedado abierta
    await cerrarJornadasIncompletasPasadas();
    const ahora = new Date();
    const inicioHoy = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate(), 0, 0, 0, 0);
    const finAyer = new Date(inicioHoy.getTime() - 1);

    // Ventana de evaluación: desde el inicio del mes actual o hasta 30 días atrás
    const inicioMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1, 0, 0, 0, 0);
    const limite30Dias = new Date(ahora.getTime() - 30 * 24 * 60 * 60 * 1000);
    const fechaInicioRango = inicioMes > limite30Dias ? inicioMes : limite30Dias;

    if (fechaInicioRango >= inicioHoy) {
      return { sincronizadas: 0 };
    }

    // 1. Obtener empleados activos con fecha de ingreso y de creación en el sistema
    const empleadosActivos = await prisma.empleado.findMany({
      where: { activo: true },
      select: { id: true, fechaIngreso: true, createdAt: true },
    });

    if (empleadosActivos.length === 0) {
      return { sincronizadas: 0 };
    }

    // 2. Traer registros existentes en esa ventana para empleados activos
    const registrosExistentes = await prisma.registroAsistencia.findMany({
      where: {
        empleadoId: { in: empleadosActivos.map((e) => e.id) },
        fecha: {
          gte: fechaInicioRango,
          lte: finAyer,
        },
      },
      select: {
        empleadoId: true,
        fecha: true,
      },
    });

    // Mapear registros existentes: `${empleadoId}_${YYYY-MM-DD}`
    const registrosSet = new Set<string>();
    for (const r of registrosExistentes) {
      const d = new Date(r.fecha);
      const k = `${r.empleadoId}_${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      registrosSet.add(k);
    }

    // 3. Generar inasistencias solo para días hábiles (Lunes a Viernes, excluyendo Sábados y Domingos)
    const faltasACrear: Array<{
      empleadoId: string;
      fecha: Date;
      horaEntrada: Date;
      horaSalida: Date | null;
      estado: EstadoAsistencia;
      observaciones: string;
    }> = [];

    for (const emp of empleadosActivos) {
      // El control de asistencia digital inicia a partir del momento en que el trabajador
      // es dado de alta en la plataforma (createdAt), o su fecha de ingreso si entra a futuro.
      // Jamás se generan inasistencias retroactivas para días anteriores a su creación en el sistema.
      const fechaBaseControl = emp.createdAt > emp.fechaIngreso ? emp.createdAt : emp.fechaIngreso;
      const inicioEmpleado = fechaBaseControl > fechaInicioRango ? fechaBaseControl : fechaInicioRango;
      const cursorDia = new Date(
        inicioEmpleado.getFullYear(),
        inicioEmpleado.getMonth(),
        inicioEmpleado.getDate(),
        0,
        0,
        0,
        0
      );

      while (cursorDia < inicioHoy) {
        // Excluir fines de semana (0 = Domingo, 6 = Sábado)
        if (cursorDia.getDay() !== 0 && cursorDia.getDay() !== 6) {
          const diaStr = `${cursorDia.getFullYear()}-${String(cursorDia.getMonth() + 1).padStart(2, "0")}-${String(cursorDia.getDate()).padStart(2, "0")}`;
          const key = `${emp.id}_${diaStr}`;

          if (!registrosSet.has(key)) {
            faltasACrear.push({
              empleadoId: emp.id,
              fecha: new Date(cursorDia.getFullYear(), cursorDia.getMonth(), cursorDia.getDate(), 12, 0, 0),
              horaEntrada: new Date(cursorDia.getFullYear(), cursorDia.getMonth(), cursorDia.getDate(), 8, 0, 0),
              horaSalida: null,
              estado: EstadoAsistencia.FALTA_INJUSTIFICADA,
              observaciones: "Inasistencia automática - Jornada sin registro de entrada",
            });
            registrosSet.add(key);
          }
        }
        cursorDia.setDate(cursorDia.getDate() + 1);
      }
    }

    if (faltasACrear.length > 0) {
      await prisma.registroAsistencia.createMany({
        data: faltasACrear,
        skipDuplicates: true,
      });
    }

    // Depuración de inasistencias automáticas que pudieran existir en fines de semana
    const autoInasistenciasFinde = await prisma.registroAsistencia.findMany({
      where: {
        observaciones: "Inasistencia automática - Jornada sin registro de entrada",
        estado: EstadoAsistencia.FALTA_INJUSTIFICADA,
      },
      select: { id: true, fecha: true },
    });
    const idsFinde = autoInasistenciasFinde
      .filter((r) => {
        const dia = new Date(r.fecha).getDay();
        return dia === 0 || dia === 6;
      })
      .map((r) => r.id);

    if (idsFinde.length > 0) {
      await prisma.registroAsistencia.deleteMany({
        where: { id: { in: idsFinde } },
      });
    }

    // Normalización preventiva de registros con estado RETARDO hacia PRESENTE
    await prisma.registroAsistencia.updateMany({
      where: { estado: EstadoAsistencia.RETARDO },
      data: { estado: EstadoAsistencia.PRESENTE },
    });

    return { sincronizadas: faltasACrear.length };
  } catch (error) {
    console.error("Error al sincronizar inasistencias pasadas:", error);
    return { sincronizadas: 0 };
  }
}

// Obtención integral de datos para el módulo de personal
export async function getPersonalData(): Promise<PersonalDashboardData> {
  const hoy = new Date();
  const inicioDia = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate(), 0, 0, 0);
  const finDia = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate(), 23, 59, 59);
  const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1, 0, 0, 0);

  // getPersonalData es 100% de solo lectura (sin escrituras automáticas que consuman Neon)

  // Consultas paralelas optimizadas para Neon Cloud
  const [
    empleadosRaw,
    asistenciasHoyRaw,
    tareasRaw,
    propiedadesRaw,
    tareasCompletadasMesCount,
    asistenciasStatsRaw,
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
    prisma.registroAsistencia.groupBy({
      by: ["empleadoId", "estado"],
      _count: { id: true },
    }),
  ]);

  // Mapa de estadísticas de asistencia e inasistencia por empleado
  const conteoAsistenciasMap = new Map<string, { asistencias: number; inasistencias: number }>();
  for (const item of asistenciasStatsRaw) {
    if (!conteoAsistenciasMap.has(item.empleadoId)) {
      conteoAsistenciasMap.set(item.empleadoId, { asistencias: 0, inasistencias: 0 });
    }
    const record = conteoAsistenciasMap.get(item.empleadoId)!;
    if (
      item.estado === EstadoAsistencia.PRESENTE ||
      item.estado === EstadoAsistencia.RETARDO ||
      item.estado === EstadoAsistencia.PERMISO
    ) {
      record.asistencias += item._count.id;
    } else if (
      item.estado === EstadoAsistencia.FALTA_JUSTIFICADA ||
      item.estado === EstadoAsistencia.FALTA_INJUSTIFICADA
    ) {
      record.inasistencias += item._count.id;
    }
  }

  // Transformación serializable para Client Components (con cálculo virtual de inasistencias en memoria)
  const empleados: EmpleadoItem[] = empleadosRaw.map((emp) => {
    const stats = conteoAsistenciasMap.get(emp.id) || {
      asistencias: emp._count.asistencias,
      inasistencias: 0,
    };

    // Cálculo virtual de inasistencias en memoria sin escrituras en Neon
    const fechaBase = emp.createdAt > emp.fechaIngreso ? emp.createdAt : emp.fechaIngreso;
    const inicioCalculo = fechaBase > inicioMes ? fechaBase : inicioMes;
    const diasHabiles = inicioCalculo < inicioDia ? calcularDiasLaborables(inicioCalculo, inicioDia) : 0;
    const inasistenciasVirtuales = Math.max(0, diasHabiles - stats.asistencias - stats.inasistencias);
    const inasistenciasTotal = stats.inasistencias + inasistenciasVirtuales;

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
      cargoPersonalizado: emp.cargoPersonalizado,
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
      asistenciasCount: stats.asistencias,
      inasistenciasCount: inasistenciasTotal,
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
    requiereEvidencia: t.requiereEvidencia ?? false,
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

    // Crear cuenta de acceso para el portal del empleado si se indicó correo
    const debeCrearUsuario = (validated.crearUsuario ?? true) && Boolean(validated.email && validated.email.trim() !== "");
    if (debeCrearUsuario && validated.email) {
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
        cargoPersonalizado:
          validated.cargo === CargoEmpleado.OTRO
            ? validated.cargoPersonalizado?.trim() || null
            : null,
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

    // Actualizar cuenta existente o crear una nueva si se ingresó correo
    if (usuarioId) {
      const usuarioUpdateData: { passwordHash?: string; email?: string } = {};

      if (validated.passwordTemporal && validated.passwordTemporal.trim().length >= 6) {
        usuarioUpdateData.passwordHash = await bcrypt.hash(validated.passwordTemporal.trim(), 10);
      }

      if (validated.email && validated.email.trim() !== "") {
        const usuarioActual = await prisma.usuario.findUnique({ where: { id: usuarioId } });
        if (usuarioActual && usuarioActual.email !== validated.email) {
          const existeEmail = await prisma.usuario.findUnique({
            where: { email: validated.email },
          });
          if (existeEmail) {
            return {
              success: false,
              error: "El nuevo correo ya está registrado para otro usuario.",
            };
          }
          usuarioUpdateData.email = validated.email;
        }
      }

      if (Object.keys(usuarioUpdateData).length > 0) {
        await prisma.usuario.update({
          where: { id: usuarioId },
          data: usuarioUpdateData,
        });
      }
    } else if (validated.email && validated.email.trim() !== "") {
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
        ...(validated.cargo && {
          cargo: validated.cargo,
          cargoPersonalizado:
            validated.cargo === CargoEmpleado.OTRO
              ? validated.cargoPersonalizado?.trim() || null
              : null,
        }),
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

    let inicioDia: Date;
    let finDia: Date;
    let baseFecha: Date;

    if (validated.fecha && validated.fecha.includes("-")) {
      const [y, m, d] = validated.fecha.split("-").map(Number);
      baseFecha = new Date(y, m - 1, d, 12, 0, 0);
      inicioDia = new Date(y, m - 1, d, 0, 0, 0);
      finDia = new Date(y, m - 1, d, 23, 59, 59, 999);
    } else {
      const ahora = new Date();
      baseFecha = ahora;
      inicioDia = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate(), 0, 0, 0);
      finDia = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate(), 23, 59, 59, 999);
    }

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

    // Cierre perezoso (Just-In-Time) de turnos olvidados anteriores de este empleado
    await cerrarJornadasIncompletasEmpleado(validated.empleadoId);

    // Crear nuevo registro
    const nuevo = await prisma.registroAsistencia.create({
      data: {
        empleadoId: validated.empleadoId,
        fecha: baseFecha,
        horaEntrada,
        horaSalida,
        estado: validated.estado,
        ubicacionEntrada: validated.ubicacionEntrada || null,
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
  prioridad: z.nativeEnum(PrioridadTarea).default(PrioridadTarea.NORMAL).optional(),
  fechaLimite: z.string().optional().nullable(),
  requiereEvidencia: z.boolean().default(false).optional(),
});

export type CreateTareaInput = z.infer<typeof createTareaSchema>;

// Crear nueva orden de tarea
export async function crearTareaAction(rawInput: CreateTareaInput) {
  try {
    const validated = createTareaSchema.parse(rawInput);

    let fechaLimite: Date | null = null;
    if (validated.fechaLimite) {
      if (validated.fechaLimite.includes("-")) {
        const [y, m, d] = validated.fechaLimite.split("-").map(Number);
        fechaLimite = new Date(y, m - 1, d, 12, 0, 0);
      } else {
        fechaLimite = new Date(validated.fechaLimite);
      }
    }

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
        requiereEvidencia: Boolean(validated.requiereEvidencia),
      },
    });

    // Enviar notificación por correo (no bloqueante en caso de error SMTP)
    try {
      const [empleado, prop] = await Promise.all([
        prisma.empleado.findUnique({
          where: { id: validated.empleadoId },
          select: {
            nombre: true,
            apellido: true,
            email: true,
            usuario: { select: { email: true } },
          },
        }),
        nuevaTarea.propiedadId
          ? prisma.propiedad.findUnique({
              where: { id: nuevaTarea.propiedadId },
              select: { nombre: true },
            })
          : Promise.resolve(null),
      ]);

      const empleadoEmail = empleado?.email || empleado?.usuario?.email;
      let emailEnviado = false;

      if (empleado && empleadoEmail) {
        const nombreCompleto = `${empleado.nombre} ${empleado.apellido || ""}`.trim();
        console.log(`📨 [NOTIFICACIÓN] Enviando correo de nueva tarea a: ${empleadoEmail} (Tarea: "${nuevaTarea.titulo}")`);

        const resEmail = await enviarNotificacionNuevaTarea({
          empleadoNombre: nombreCompleto,
          empleadoEmail,
          tareaTitulo: nuevaTarea.titulo,
          tareaDescripcion: nuevaTarea.descripcion,
          propiedadNombre: prop?.nombre || null,
          prioridad: nuevaTarea.prioridad,
          fechaLimite: nuevaTarea.fechaLimite,
          requiereEvidencia: nuevaTarea.requiereEvidencia,
        });

        if (resEmail.success) {
          emailEnviado = true;
          console.log(`✅ [NOTIFICACIÓN] Correo entregado exitosamente a Gmail SMTP. ID: ${resEmail.messageId}`);
        } else {
          console.warn(`⚠️ [NOTIFICACIÓN] No se pudo entregar el correo: ${resEmail.error}`);
        }
      } else {
        console.log(`ℹ️ [NOTIFICACIÓN] El empleado ${validated.empleadoId} no tiene un correo configurado.`);
      }

      revalidatePath("/admin/personal");
      const feedbackMsg = emailEnviado
        ? `Tarea asignada y notificación enviada a ${empleadoEmail}.`
        : "Tarea asignada exitosamente.";

      return { success: true, data: nuevaTarea, message: feedbackMsg };
    } catch (emailErr) {
      console.error("Error no bloqueante al enviar email de tarea:", emailErr);
      revalidatePath("/admin/personal");
      return { success: true, data: nuevaTarea, message: "Tarea asignada exitosamente." };
    }
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

    const evidenciasFinales = nuevasEvidencias !== undefined
      ? nuevasEvidencias
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

// Obtener historial completo de asistencias e inasistencias de un trabajador
export async function obtenerHistorialAsistenciaEmpleadoAction(
  empleadoId: string,
  params?: PaginationParams
) {
  try {
    const { page, pageSize, skip, take } = resolvePagination(params, 50);

    const [empleado, total, registros] = await Promise.all([
      prisma.empleado.findUnique({
        where: { id: empleadoId },
        select: { fechaIngreso: true, createdAt: true },
      }),
      prisma.registroAsistencia.count({ where: { empleadoId } }),
      prisma.registroAsistencia.findMany({
        where: { empleadoId },
        orderBy: { fecha: "desc" },
        skip: params?.page ? skip : 0,
        take: params?.pageSize ? take : undefined,
      }),
    ]);

    const data: RegistroAsistenciaItem[] = registros.map((r) => ({
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

    // Generar inasistencias virtuales para días laborales pasados que no tienen registro en BD
    if (empleado) {
      const registrosFechasSet = new Set<string>();
      for (const r of registros) {
        const d = new Date(r.fecha);
        registrosFechasSet.add(
          `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
        );
      }

      const ahora = new Date();
      const inicioHoy = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate(), 0, 0, 0, 0);
      const limite30Dias = new Date(ahora.getTime() - 30 * 24 * 60 * 60 * 1000);
      const fechaBase = empleado.createdAt > empleado.fechaIngreso ? empleado.createdAt : empleado.fechaIngreso;
      const inicioRango = fechaBase > limite30Dias ? fechaBase : limite30Dias;

      const cursor = new Date(inicioRango.getFullYear(), inicioRango.getMonth(), inicioRango.getDate(), 0, 0, 0, 0);
      while (cursor < inicioHoy) {
        if (cursor.getDay() !== 0 && cursor.getDay() !== 6) {
          const diaStr = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}-${String(cursor.getDate()).padStart(2, "0")}`;
          if (!registrosFechasSet.has(diaStr)) {
            const fechaDia = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate(), 12, 0, 0);
            data.push({
              id: `virtual-falta-${empleadoId}-${diaStr}`,
              empleadoId,
              fecha: fechaDia.toISOString(),
              horaEntrada: new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate(), 8, 0, 0).toISOString(),
              horaSalida: null,
              estado: EstadoAsistencia.FALTA_INJUSTIFICADA,
              ubicacionEntrada: "Sin Marcaje",
              ubicacionSalida: null,
              observaciones: "Inasistencia automática (Jornada laboral sin marcaje)",
              createdAt: fechaDia.toISOString(),
            });
          }
        }
        cursor.setDate(cursor.getDate() + 1);
      }

      data.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
    }

    return {
      success: true,
      data,
      total,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    };
  } catch (error: unknown) {
    console.error("Error en obtenerHistorialAsistenciaEmpleadoAction:", error);
    const msg = error instanceof Error ? error.message : "Error al cargar el historial";
    return { success: false, error: msg, data: [], total: 0, page: 1, pageSize: 50, totalPages: 1 };
  }
}

// Acción invocable desde el cliente para forzar sincronización de inasistencias
export async function sincronizarInasistenciasAction() {
  try {
    const res = await sincronizarInasistenciasPasadas();
    revalidatePath("/admin/personal");
    return { success: true, count: res.sincronizadas };
  } catch (error: unknown) {
    console.error("Error en sincronizarInasistenciasAction:", error);
    const msg = error instanceof Error ? error.message : "Error al sincronizar";
    return { success: false, error: msg };
  }
}

// Filtros para consulta paginada de asistencias
export interface FiltrosAsistenciaPersonal extends PaginationParams {
  empleadoId?: string;
  estado?: EstadoAsistencia;
  fecha?: string;
}

// Consulta paginada real en servidor para historial de asistencias
export async function getAsistenciasPaginadasAction(
  filtros: FiltrosAsistenciaPersonal = {}
): Promise<PaginatedResult<RegistroAsistenciaItem>> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("No autenticado");

  const { page, pageSize, skip, take } = resolvePagination(filtros, 15);
  const where: Prisma.RegistroAsistenciaWhereInput = {};

  if (filtros.empleadoId && filtros.empleadoId !== "TODOS") {
    where.empleadoId = filtros.empleadoId;
  }

  if (filtros.estado) {
    where.estado = filtros.estado;
  }

  if (filtros.fecha) {
    const [y, m, d] = filtros.fecha.split("-").map(Number);
    if (y && m && d) {
      const inicio = new Date(y, m - 1, d, 0, 0, 0);
      const fin = new Date(y, m - 1, d, 23, 59, 59, 999);
      where.fecha = { gte: inicio, lte: fin };
    }
  }

  if (filtros.search && filtros.search.trim()) {
    const q = filtros.search.trim();
    where.empleado = {
      OR: [
        { nombre: { contains: q, mode: "insensitive" } },
        { apellido: { contains: q, mode: "insensitive" } },
        { cedula: { contains: q, mode: "insensitive" } },
      ],
    };
  }

  const [total, registros] = await prisma.$transaction([
    prisma.registroAsistencia.count({ where }),
    prisma.registroAsistencia.findMany({
      where,
      skip,
      take,
      orderBy: [{ fecha: "desc" }, { horaEntrada: "desc" }],
      include: {
        empleado: {
          select: {
            nombre: true,
            apellido: true,
            cargo: true,
          },
        },
      },
    }),
  ]);

  const items: RegistroAsistenciaItem[] = registros.map((r) => ({
    id: r.id,
    empleadoId: r.empleadoId,
    empleadoNombre: `${r.empleado.nombre} ${r.empleado.apellido || ""}`.trim(),
    empleadoCargo: r.empleado.cargo,
    fecha: r.fecha.toISOString(),
    horaEntrada: r.horaEntrada.toISOString(),
    horaSalida: r.horaSalida ? r.horaSalida.toISOString() : null,
    estado: r.estado,
    ubicacionEntrada: r.ubicacionEntrada,
    ubicacionSalida: r.ubicacionSalida,
    observaciones: r.observaciones,
    createdAt: r.createdAt.toISOString(),
  }));

  return createPaginatedResponse(items, total, page, pageSize);
}

// Filtros para consulta paginada de tareas
export interface FiltrosTareasPersonal extends PaginationParams {
  empleadoId?: string;
  propiedadId?: string;
  estado?: EstadoTarea;
  prioridad?: PrioridadTarea;
}

// Consulta paginada real en servidor para tareas asignadas
export async function getTareasPaginadasAction(
  filtros: FiltrosTareasPersonal = {}
): Promise<PaginatedResult<TareaEmpleadoItem>> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("No autenticado");

  const { page, pageSize, skip, take } = resolvePagination(filtros, 15);
  const where: Prisma.TareaEmpleadoWhereInput = {};

  if (filtros.empleadoId && filtros.empleadoId !== "TODOS") {
    where.empleadoId = filtros.empleadoId;
  }

  if (filtros.propiedadId && filtros.propiedadId !== "TODAS") {
    where.propiedadId = filtros.propiedadId;
  }

  if (filtros.estado) {
    where.estado = filtros.estado;
  }

  if (filtros.prioridad) {
    where.prioridad = filtros.prioridad;
  }

  if (filtros.search && filtros.search.trim()) {
    const q = filtros.search.trim();
    where.OR = [
      { titulo: { contains: q, mode: "insensitive" } },
      { descripcion: { contains: q, mode: "insensitive" } },
      { empleado: { nombre: { contains: q, mode: "insensitive" } } },
    ];
  }

  const [total, tareasRaw] = await prisma.$transaction([
    prisma.tareaEmpleado.count({ where }),
    prisma.tareaEmpleado.findMany({
      where,
      skip,
      take,
      orderBy: [{ estado: "asc" }, { createdAt: "desc" }],
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
    }),
  ]);

  const items: TareaEmpleadoItem[] = tareasRaw.map((t) => ({
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
    fechaLimite: t.fechaLimite ? t.fechaLimite.toISOString() : null,
    fechaCompletada: t.fechaCompletada ? t.fechaCompletada.toISOString() : null,
    evidencias: t.evidencias,
    notasResolucion: t.notasResolucion,
    requiereEvidencia: t.requiereEvidencia,
    createdAt: t.createdAt.toISOString(),
  }));

  return createPaginatedResponse(items, total, page, pageSize);
}
