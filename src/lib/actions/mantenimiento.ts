"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { z } from "zod";
import {
  EstadoTicket,
  UrgenciaTicket,
  CategoriaTicket,
  Prisma,
} from "@prisma/client";
import { enviarNotificacionTicketReportadoAdmin } from "@/lib/email-templates/notificacion-ticket-reportado";
import { enviarNotificacionTicketAsignado } from "@/lib/email-templates/notificacion-ticket-asignado";
import { enviarNotificacionTicketResuelto } from "@/lib/email-templates/notificacion-ticket-resuelto";
import { CATEGORIAS_TICKET } from "@/lib/constants/mantenimiento";

/**
 * Helper para despachar tareas asíncronas secundarias en segundo plano (emails)
 */
function ejecutarEnSegundoPlano(tarea: () => Promise<unknown>) {
  try {
    after(async () => {
      try {
        await tarea();
      } catch (err) {
        console.error("Error en tarea de segundo plano (mantenimiento):", err);
      }
    });
  } catch {
    tarea().catch((err) => {
      console.error("Error en tarea de segundo plano fallback (mantenimiento):", err);
    });
  }
}

// Interfaces de serialización seguras para componentes cliente
export interface TicketItem {
  id: string;
  codigo: string;
  titulo: string;
  descripcion: string;
  categoria: CategoriaTicket;
  categoriaPersonalizada: string | null;
  urgencia: UrgenciaTicket;
  estado: EstadoTicket;
  fotosAveria: string[];
  fotosFiniquito: string[];
  notasAdmin: string | null;
  notasCierre: string | null;
  motivoCancelacion: string | null;
  fechaAsignacion: string | null;
  fechaInicio: string | null;
  fechaFiniquito: string | null;
  createdAt: string;
  updatedAt: string;
  propiedadId: string;
  unidadId: string | null;
  inquilinoId: string | null;
  empleadoId: string | null;
  propiedad: {
    id: string;
    nombre: string;
    ciudad: string;
    direccion: string;
  };
  unidad: {
    id: string;
    codigo: string;
    tipo: string;
    piso: string | null;
  } | null;
  inquilino: {
    id: string;
    nombre: string;
    apellido: string | null;
    telefono: string;
    email: string | null;
    documentoIdentidad: string;
  } | null;
  empleado: {
    id: string;
    nombre: string;
    apellido: string | null;
    telefono: string;
    email: string | null;
    cargo: string;
  } | null;
}

export interface EstadisticasMantenimiento {
  totalActivos: number;
  totalUrgentes: number;
  totalEnProceso: number;
  resueltosMes: number;
  porcentajeResueltos: number;
}

export interface TecnicoDisponible {
  id: string;
  nombre: string;
  apellido: string | null;
  cargo: string;
  telefono: string;
  ticketsActivosCount: number;
}

// -------------------------------------------------------------
// 1. OBTENER TICKETS PARA EL ADMINISTRADOR (Bandeja Ejecutiva)
// -------------------------------------------------------------
export async function getTicketsAdmin({
  propiedadId,
  estado,
  urgencia,
  categoria,
  busqueda,
  pagina = 1,
}: {
  propiedadId?: string;
  estado?: EstadoTicket | "TODOS";
  urgencia?: UrgenciaTicket | "TODAS";
  categoria?: CategoriaTicket | "TODAS";
  busqueda?: string;
  pagina?: number;
}) {
  try {
    const session = await auth();
    if (!session?.user?.id || session.user.rol !== "ADMIN") {
      throw new Error("Acceso denegado: Se requiere rol de Administrador.");
    }

    const PAGE_SIZE = 15;
    const whereAnd: Prisma.TicketMantenimientoWhereInput[] = [];

    if (propiedadId && propiedadId !== "TODAS") {
      whereAnd.push({ propiedadId });
    }

    if (estado && estado !== "TODOS") {
      whereAnd.push({ estado });
    }

    if (urgencia && urgencia !== "TODAS") {
      whereAnd.push({ urgencia });
    }

    if (categoria && categoria !== "TODAS") {
      whereAnd.push({ categoria });
    }

    if (busqueda && busqueda.trim()) {
      const q = busqueda.trim();
      whereAnd.push({
        OR: [
          { codigo: { contains: q, mode: "insensitive" } },
          { titulo: { contains: q, mode: "insensitive" } },
          { descripcion: { contains: q, mode: "insensitive" } },
          {
            unidad: {
              codigo: { contains: q, mode: "insensitive" },
            },
          },
          {
            propiedad: {
              nombre: { contains: q, mode: "insensitive" },
            },
          },
          {
            inquilino: {
              nombre: { contains: q, mode: "insensitive" },
            },
          },
        ],
      });
    }

    const where: Prisma.TicketMantenimientoWhereInput =
      whereAnd.length > 0 ? { AND: whereAnd } : {};

    const ahora = new Date();
    const inicioMes = new Date(Date.UTC(ahora.getFullYear(), ahora.getMonth(), 1));

    // Consultas paralelas para máxima velocidad
    const [
      registros,
      totalRegistros,
      activosCount,
      urgentesCount,
      enProcesoCount,
      resueltosMesCount,
      empleadosDisponibles,
      propiedadesActivas,
    ] = await Promise.all([
      prisma.ticketMantenimiento.findMany({
        where,
        orderBy: [{ estado: "asc" }, { urgencia: "desc" }, { createdAt: "desc" }],
        skip: (Math.max(1, pagina) - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
        include: {
          propiedad: {
            select: { id: true, nombre: true, ciudad: true, direccion: true },
          },
          unidad: {
            select: { id: true, codigo: true, tipo: true, piso: true },
          },
          inquilino: {
            select: {
              id: true,
              nombre: true,
              apellido: true,
              telefono: true,
              email: true,
              documentoIdentidad: true,
            },
          },
          empleado: {
            select: {
              id: true,
              nombre: true,
              apellido: true,
              telefono: true,
              email: true,
              cargo: true,
            },
          },
        },
      }),
      prisma.ticketMantenimiento.count({ where }),
      prisma.ticketMantenimiento.count({
        where: {
          estado: { in: [EstadoTicket.PENDIENTE, EstadoTicket.EN_PROCESO] },
        },
      }),
      prisma.ticketMantenimiento.count({
        where: {
          urgencia: UrgenciaTicket.URGENTE,
          estado: { notIn: [EstadoTicket.RESUELTO, EstadoTicket.CANCELADO] },
        },
      }),
      prisma.ticketMantenimiento.count({
        where: { estado: EstadoTicket.EN_PROCESO },
      }),
      prisma.ticketMantenimiento.count({
        where: {
          estado: EstadoTicket.RESUELTO,
          fechaFiniquito: { gte: inicioMes },
        },
      }),
      prisma.empleado.findMany({
        where: { activo: true },
        select: {
          id: true,
          nombre: true,
          apellido: true,
          cargo: true,
          telefono: true,
          ticketsMantenimiento: {
            where: {
              estado: EstadoTicket.EN_PROCESO,
            },
            select: { id: true },
          },
        },
        orderBy: [{ cargo: "asc" }, { nombre: "asc" }],
      }),
      prisma.propiedad.findMany({
        where: { activo: true },
        select: { id: true, nombre: true, ciudad: true },
        orderBy: { nombre: "asc" },
      }),
    ]);

    const totalPaginas = Math.max(1, Math.ceil(totalRegistros / PAGE_SIZE));
    const totalHistorico = activosCount + resueltosMesCount;
    const porcentajeResueltos =
      totalHistorico > 0 ? Number(((resueltosMesCount / totalHistorico) * 100).toFixed(1)) : 100;

    const estadisticas: EstadisticasMantenimiento = {
      totalActivos: activosCount,
      totalUrgentes: urgentesCount,
      totalEnProceso: enProcesoCount,
      resueltosMes: resueltosMesCount,
      porcentajeResueltos,
    };

    const tecnicos: TecnicoDisponible[] = empleadosDisponibles.map((e) => ({
      id: e.id,
      nombre: e.nombre,
      apellido: e.apellido,
      cargo: e.cargo,
      telefono: e.telefono,
      ticketsActivosCount: e.ticketsMantenimiento.length,
    }));

    const tickets: TicketItem[] = registros.map((t) => ({
      id: t.id,
      codigo: t.codigo,
      titulo: t.titulo,
      descripcion: t.descripcion,
      categoria: t.categoria,
      categoriaPersonalizada: t.categoriaPersonalizada,
      urgencia: t.urgencia,
      estado: t.estado,
      fotosAveria: t.fotosAveria,
      fotosFiniquito: t.fotosFiniquito,
      notasAdmin: t.notasAdmin,
      notasCierre: t.notasCierre,
      motivoCancelacion: t.motivoCancelacion,
      fechaAsignacion: t.fechaAsignacion ? t.fechaAsignacion.toISOString() : null,
      fechaInicio: t.fechaInicio ? t.fechaInicio.toISOString() : null,
      fechaFiniquito: t.fechaFiniquito ? t.fechaFiniquito.toISOString() : null,
      createdAt: t.createdAt.toISOString(),
      updatedAt: t.updatedAt.toISOString(),
      propiedadId: t.propiedadId,
      unidadId: t.unidadId,
      inquilinoId: t.inquilinoId,
      empleadoId: t.empleadoId,
      propiedad: t.propiedad,
      unidad: t.unidad,
      inquilino: t.inquilino,
      empleado: t.empleado,
    }));

    return {
      success: true,
      tickets,
      estadisticas,
      tecnicos,
      propiedades: propiedadesActivas,
      totalRegistros,
      totalPaginas,
      paginaActual: pagina,
    };
  } catch (error) {
    console.error("Error al obtener tickets en administración:", error);
    return {
      success: false,
      error: "Error al cargar la bandeja de averías y mantenimiento.",
      tickets: [],
      estadisticas: {
        totalActivos: 0,
        totalUrgentes: 0,
        totalEnProceso: 0,
        resueltosMes: 0,
        porcentajeResueltos: 0,
      },
      tecnicos: [],
      propiedades: [],
      totalRegistros: 0,
      totalPaginas: 1,
      paginaActual: 1,
    };
  }
}

// -------------------------------------------------------------
// 2. OBTENER TICKETS PARA EL INQUILINO (`/inquilino/mantenimiento`)
// -------------------------------------------------------------
export async function getTicketsInquilino() {
  try {
    const session = await auth();
    if (!session?.user?.id) throw new Error("No autenticado");

    let inquilino = await prisma.inquilino.findUnique({
      where: { usuarioId: session.user.id },
      include: {
        contratos: {
          where: { estado: { in: ["ACTIVO", "POR_VENCER"] } },
          include: {
            unidad: { include: { propiedad: true } },
          },
        },
      },
    });

    if (!inquilino && session.user.email) {
      inquilino = await prisma.inquilino.findFirst({
        where: { email: session.user.email },
        include: {
          contratos: {
            where: { estado: { in: ["ACTIVO", "POR_VENCER"] } },
            include: {
              unidad: { include: { propiedad: true } },
            },
          },
        },
      });
    }

    if (!inquilino) {
      return {
        success: true,
        tickets: [],
        locales: [],
        propiedades: [],
        inquilinoNombre: session.user.nombre || "Inquilino",
      };
    }

    const [ticketsRegistrados] = await Promise.all([
      prisma.ticketMantenimiento.findMany({
        where: { inquilinoId: inquilino.id },
        orderBy: { createdAt: "desc" },
        include: {
          propiedad: { select: { id: true, nombre: true, ciudad: true, direccion: true } },
          unidad: { select: { id: true, codigo: true, tipo: true, piso: true } },
          empleado: { select: { id: true, nombre: true, apellido: true, cargo: true, telefono: true } },
        },
      }),
    ]);

    // Extraer locales arrendados elegibles para reportar fallas
    const locales = inquilino.contratos.map((c) => ({
      unidadId: c.unidad.id,
      unidadCodigo: c.unidad.codigo,
      propiedadId: c.unidad.propiedad.id,
      propiedadNombre: c.unidad.propiedad.nombre,
      piso: c.unidad.piso,
    }));

    // Propiedades únicas
    const propiedadesMap = new Map<string, { id: string; nombre: string }>();
    for (const l of locales) {
      propiedadesMap.set(l.propiedadId, { id: l.propiedadId, nombre: l.propiedadNombre });
    }

    const tickets: TicketItem[] = ticketsRegistrados.map((t) => ({
      id: t.id,
      codigo: t.codigo,
      titulo: t.titulo,
      descripcion: t.descripcion,
      categoria: t.categoria,
      categoriaPersonalizada: t.categoriaPersonalizada,
      urgencia: t.urgencia,
      estado: t.estado,
      fotosAveria: t.fotosAveria,
      fotosFiniquito: t.fotosFiniquito,
      notasAdmin: t.notasAdmin,
      notasCierre: t.notasCierre,
      motivoCancelacion: t.motivoCancelacion,
      fechaAsignacion: t.fechaAsignacion ? t.fechaAsignacion.toISOString() : null,
      fechaInicio: t.fechaInicio ? t.fechaInicio.toISOString() : null,
      fechaFiniquito: t.fechaFiniquito ? t.fechaFiniquito.toISOString() : null,
      createdAt: t.createdAt.toISOString(),
      updatedAt: t.updatedAt.toISOString(),
      propiedadId: t.propiedadId,
      unidadId: t.unidadId,
      inquilinoId: t.inquilinoId,
      empleadoId: t.empleadoId,
      propiedad: t.propiedad,
      unidad: t.unidad,
      inquilino: {
        id: inquilino.id,
        nombre: inquilino.nombre,
        apellido: inquilino.apellido,
        telefono: inquilino.telefono,
        email: inquilino.email,
        documentoIdentidad: inquilino.documentoIdentidad,
      },
      empleado: t.empleado
        ? {
            id: t.empleado.id,
            nombre: t.empleado.nombre,
            apellido: t.empleado.apellido,
            cargo: t.empleado.cargo,
            telefono: t.empleado.telefono,
            email: null,
          }
        : null,
    }));

    return {
      success: true,
      tickets,
      locales,
      propiedades: Array.from(propiedadesMap.values()),
      inquilinoNombre: `${inquilino.nombre} ${inquilino.apellido || ""}`.trim(),
    };
  } catch (error) {
    console.error("Error al obtener tickets del inquilino:", error);
    return {
      success: false,
      error: "No se pudieron cargar tus solicitudes de mantenimiento.",
      tickets: [],
      locales: [],
      propiedades: [],
      inquilinoNombre: "",
    };
  }
}

// -------------------------------------------------------------
// 3. OBTENER TICKETS PARA EL EMPLEADO/TÉCNICO (`/empleado/mantenimiento`)
// -------------------------------------------------------------
export async function getTicketsEmpleado() {
  try {
    const session = await auth();
    if (!session?.user?.id) throw new Error("No autenticado");

    let empleado = await prisma.empleado.findUnique({
      where: { usuarioId: session.user.id },
      include: { propiedad: true },
    });

    if (!empleado && session.user.email) {
      empleado = await prisma.empleado.findFirst({
        where: { email: session.user.email },
        include: { propiedad: true },
      });
    }

    if (!empleado) {
      return {
        success: true,
        tickets: [],
        empleado: null,
      };
    }

    const registros = await prisma.ticketMantenimiento.findMany({
      where: { empleadoId: empleado.id },
      orderBy: [{ estado: "asc" }, { urgencia: "desc" }, { createdAt: "desc" }],
      include: {
        propiedad: { select: { id: true, nombre: true, ciudad: true, direccion: true } },
        unidad: { select: { id: true, codigo: true, tipo: true, piso: true } },
        inquilino: {
          select: {
            id: true,
            nombre: true,
            apellido: true,
            telefono: true,
            email: true,
            documentoIdentidad: true,
          },
        },
      },
    });

    const tickets: TicketItem[] = registros.map((t) => ({
      id: t.id,
      codigo: t.codigo,
      titulo: t.titulo,
      descripcion: t.descripcion,
      categoria: t.categoria,
      categoriaPersonalizada: t.categoriaPersonalizada,
      urgencia: t.urgencia,
      estado: t.estado,
      fotosAveria: t.fotosAveria,
      fotosFiniquito: t.fotosFiniquito,
      notasAdmin: t.notasAdmin,
      notasCierre: t.notasCierre,
      motivoCancelacion: t.motivoCancelacion,
      fechaAsignacion: t.fechaAsignacion ? t.fechaAsignacion.toISOString() : null,
      fechaInicio: t.fechaInicio ? t.fechaInicio.toISOString() : null,
      fechaFiniquito: t.fechaFiniquito ? t.fechaFiniquito.toISOString() : null,
      createdAt: t.createdAt.toISOString(),
      updatedAt: t.updatedAt.toISOString(),
      propiedadId: t.propiedadId,
      unidadId: t.unidadId,
      inquilinoId: t.inquilinoId,
      empleadoId: t.empleadoId,
      propiedad: t.propiedad,
      unidad: t.unidad,
      inquilino: t.inquilino,
      empleado: {
        id: empleado.id,
        nombre: empleado.nombre,
        apellido: empleado.apellido,
        cargo: empleado.cargo,
        telefono: empleado.telefono,
        email: empleado.email,
      },
    }));

    return {
      success: true,
      tickets,
      empleado: {
        id: empleado.id,
        nombre: empleado.nombre,
        apellido: empleado.apellido,
        cargo: empleado.cargo,
        telefono: empleado.telefono,
        propiedadNombre: empleado.propiedad?.nombre || null,
      },
    };
  } catch (error) {
    console.error("Error al obtener tickets del empleado:", error);
    return {
      success: false,
      error: "No se pudieron cargar tus asignaciones de mantenimiento.",
      tickets: [],
      empleado: null,
    };
  }
}

// -------------------------------------------------------------
// 4. ACCIÓN: CREAR TICKET POR EL INQUILINO
// -------------------------------------------------------------
const crearTicketInquilinoSchema = z.object({
  propiedadId: z.string().min(1, "Debes seleccionar un inmueble"),
  unidadId: z.string().optional().nullable(),
  titulo: z.string().min(4, "El título debe tener al menos 4 caracteres"),
  descripcion: z.string().min(10, "Describe la incidencia con al menos 10 caracteres"),
  categoria: z.nativeEnum(CategoriaTicket),
  categoriaPersonalizada: z.string().optional().nullable(),
  urgencia: z.nativeEnum(UrgenciaTicket).optional().default(UrgenciaTicket.MEDIA),
  fotosAveria: z.array(z.string().url()).max(2, "Máximo 2 fotos de evidencia").default([]),
});

export type CrearTicketInquilinoInput = z.input<typeof crearTicketInquilinoSchema>;

export async function crearTicketInquilinoAction(input: CrearTicketInquilinoInput) {
  try {
    const session = await auth();
    if (!session?.user?.id) throw new Error("No autenticado");

    const validacion = crearTicketInquilinoSchema.safeParse(input);
    if (!validacion.success) {
      return { success: false, error: validacion.error.issues[0]?.message || "Datos inválidos" };
    }

    const {
      propiedadId,
      unidadId,
      titulo,
      descripcion,
      categoria,
      categoriaPersonalizada,
      urgencia,
      fotosAveria,
    } = validacion.data;

    let inquilino = await prisma.inquilino.findUnique({
      where: { usuarioId: session.user.id },
    });

    if (!inquilino && session.user.email) {
      inquilino = await prisma.inquilino.findFirst({
        where: { email: session.user.email },
      });
    }

    if (!inquilino) {
      return { success: false, error: "No se encontró el perfil de inquilino asociado." };
    }

    // Generar código único correlativo: TCK-YYYY-XXX
    const anoActual = new Date().getFullYear();
    const countTickets = await prisma.ticketMantenimiento.count({
      where: {
        createdAt: {
          gte: new Date(Date.UTC(anoActual, 0, 1)),
        },
      },
    });
    const codigo = `TCK-${anoActual}-${String(countTickets + 1).padStart(3, "0")}`;

    const ticketCreado = await prisma.ticketMantenimiento.create({
      data: {
        codigo,
        titulo: titulo.trim(),
        descripcion: descripcion.trim(),
        categoria,
        categoriaPersonalizada:
          categoria === CategoriaTicket.OTRO && categoriaPersonalizada?.trim()
            ? categoriaPersonalizada.trim()
            : null,
        urgencia,
        estado: EstadoTicket.PENDIENTE,
        fotosAveria,
        propiedadId,
        unidadId: unidadId || null,
        inquilinoId: inquilino.id,
      },
      include: {
        propiedad: true,
        unidad: true,
      },
    });

    // Notificación en segundo plano al Administrador (< 150 ms)
    ejecutarEnSegundoPlano(async () => {
      await enviarNotificacionTicketReportadoAdmin({
        ticketCodigo: ticketCreado.codigo,
        ticketTitulo: ticketCreado.titulo,
        categoriaLabel: CATEGORIAS_TICKET[ticketCreado.categoria]?.label || ticketCreado.categoria,
        urgencia: ticketCreado.urgencia,
        propiedadNombre: ticketCreado.propiedad.nombre,
        unidadCodigo: ticketCreado.unidad?.codigo || "Área Común",
        solicitanteNombre: `${inquilino.nombre} ${inquilino.apellido || ""}`.trim(),
        solicitanteTelefono: inquilino.telefono,
        solicitanteEmail: inquilino.email,
        descripcion: ticketCreado.descripcion,
        fotosCount: ticketCreado.fotosAveria.length,
      });
    });

    revalidatePath("/inquilino/mantenimiento");
    revalidatePath("/admin/mantenimiento");

    return {
      success: true,
      message: `¡Incidencia reportada con éxito! Ticket #${ticketCreado.codigo} registrado.`,
      ticketId: ticketCreado.id,
    };
  } catch (error) {
    console.error("Error al crear ticket de inquilino:", error);
    return { success: false, error: "Ocurrió un error al reportar la avería." };
  }
}

// -------------------------------------------------------------
// 5. ACCIÓN: CREAR TICKET POR EL ADMINISTRADOR
// -------------------------------------------------------------
const crearTicketAdminSchema = z.object({
  propiedadId: z.string().min(1, "Debes seleccionar un inmueble"),
  unidadId: z.string().optional().nullable(),
  inquilinoId: z.string().optional().nullable(),
  empleadoId: z.string().optional().nullable(),
  titulo: z.string().min(4, "El título debe tener al menos 4 caracteres"),
  descripcion: z.string().min(8, "Describe la incidencia"),
  categoria: z.nativeEnum(CategoriaTicket),
  categoriaPersonalizada: z.string().optional().nullable(),
  urgencia: z.nativeEnum(UrgenciaTicket).default(UrgenciaTicket.MEDIA),
  fotosAveria: z.array(z.string().url()).default([]),
  notasAdmin: z.string().optional().nullable(),
});

export type CrearTicketAdminInput = z.input<typeof crearTicketAdminSchema>;

export async function crearTicketAdminAction(input: CrearTicketAdminInput) {
  try {
    const session = await auth();
    if (!session?.user?.id || session.user.rol !== "ADMIN") {
      throw new Error("Acceso denegado: Se requiere rol de Administrador.");
    }

    const validacion = crearTicketAdminSchema.safeParse(input);
    if (!validacion.success) {
      return { success: false, error: validacion.error.issues[0]?.message || "Datos inválidos" };
    }

    const {
      propiedadId,
      unidadId,
      inquilinoId,
      empleadoId,
      titulo,
      descripcion,
      categoria,
      categoriaPersonalizada,
      urgencia,
      fotosAveria,
      notasAdmin,
    } = validacion.data;

    const anoActual = new Date().getFullYear();
    const countTickets = await prisma.ticketMantenimiento.count({
      where: {
        createdAt: {
          gte: new Date(Date.UTC(anoActual, 0, 1)),
        },
      },
    });
    const codigo = `TCK-${anoActual}-${String(countTickets + 1).padStart(3, "0")}`;

    const estadoInicial = empleadoId ? EstadoTicket.EN_PROCESO : EstadoTicket.PENDIENTE;

    const ticketCreado = await prisma.ticketMantenimiento.create({
      data: {
        codigo,
        titulo: titulo.trim(),
        descripcion: descripcion.trim(),
        categoria,
        categoriaPersonalizada:
          categoria === CategoriaTicket.OTRO && categoriaPersonalizada?.trim()
            ? categoriaPersonalizada.trim()
            : null,
        urgencia,
        estado: estadoInicial,
        fotosAveria,
        propiedadId,
        unidadId: unidadId || null,
        inquilinoId: inquilinoId || null,
        empleadoId: empleadoId || null,
        notasAdmin: notasAdmin?.trim() || null,
        fechaAsignacion: empleadoId ? new Date() : null,
      },
      include: {
        propiedad: true,
        unidad: true,
        empleado: true,
      },
    });

    if (ticketCreado.empleado && ticketCreado.empleado.email) {
      ejecutarEnSegundoPlano(async () => {
        await enviarNotificacionTicketAsignado({
          empleadoNombre: `${ticketCreado.empleado!.nombre} ${ticketCreado.empleado!.apellido || ""}`.trim(),
          empleadoEmail: ticketCreado.empleado!.email!,
          ticketCodigo: ticketCreado.codigo,
          ticketTitulo: ticketCreado.titulo,
          propiedadNombre: ticketCreado.propiedad.nombre,
          unidadCodigo: ticketCreado.unidad?.codigo || "Área Común",
          categoriaLabel: CATEGORIAS_TICKET[ticketCreado.categoria]?.label || ticketCreado.categoria,
          urgencia: ticketCreado.urgencia,
          descripcion: ticketCreado.descripcion,
          notasAdmin: ticketCreado.notasAdmin,
        });
      });
    }

    revalidatePath("/admin/mantenimiento");
    revalidatePath("/empleado/mantenimiento");
    revalidatePath("/inquilino/mantenimiento");

    return {
      success: true,
      message: `Ticket #${ticketCreado.codigo} creado correctamente.`,
      ticketId: ticketCreado.id,
    };
  } catch (error) {
    console.error("Error al crear ticket de administración:", error);
    return { success: false, error: "No se pudo crear el ticket de mantenimiento." };
  }
}

// -------------------------------------------------------------
// 6. ACCIÓN: ASIGNAR TÉCNICO A UN TICKET (Admin)
// -------------------------------------------------------------
export async function asignarTecnicoAction(
  ticketId: string,
  empleadoId: string,
  notasAdmin?: string,
  urgencia?: UrgenciaTicket
) {
  try {
    const session = await auth();
    if (!session?.user?.id || session.user.rol !== "ADMIN") {
      throw new Error("Acceso denegado: Se requiere rol de Administrador.");
    }

    const [ticket, empleado] = await Promise.all([
      prisma.ticketMantenimiento.findUnique({
        where: { id: ticketId },
        include: { propiedad: true, unidad: true },
      }),
      prisma.empleado.findUnique({ where: { id: empleadoId } }),
    ]);

    if (!ticket) return { success: false, error: "El ticket no existe." };
    if (!empleado) return { success: false, error: "El colaborador seleccionado no existe." };

    const nuevoEstado =
      ticket.estado === EstadoTicket.PENDIENTE
        ? EstadoTicket.EN_PROCESO
        : ticket.estado;

    await prisma.ticketMantenimiento.update({
      where: { id: ticketId },
      data: {
        empleadoId,
        estado: nuevoEstado,
        fechaAsignacion: new Date(),
        notasAdmin: notasAdmin?.trim() || ticket.notasAdmin,
        ...(urgencia ? { urgencia } : {}),
      },
    });

    if (empleado.email && empleado.email.includes("@")) {
      ejecutarEnSegundoPlano(async () => {
        await enviarNotificacionTicketAsignado({
          empleadoNombre: `${empleado.nombre} ${empleado.apellido || ""}`.trim(),
          empleadoEmail: empleado.email!,
          ticketCodigo: ticket.codigo,
          ticketTitulo: ticket.titulo,
          propiedadNombre: ticket.propiedad.nombre,
          unidadCodigo: ticket.unidad?.codigo || "Área Común",
          categoriaLabel: CATEGORIAS_TICKET[ticket.categoria]?.label || ticket.categoria,
          urgencia: ticket.urgencia,
          descripcion: ticket.descripcion,
          notasAdmin: notasAdmin?.trim() || ticket.notasAdmin,
        });
      });
    }

    revalidatePath("/admin/mantenimiento");
    revalidatePath("/empleado/mantenimiento");
    revalidatePath("/inquilino/mantenimiento");

    return {
      success: true,
      message: `Ticket asignado a ${empleado.nombre} (${empleado.cargo}).`,
    };
  } catch (error) {
    console.error("Error al asignar técnico:", error);
    return { success: false, error: "No se pudo asignar el técnico al ticket." };
  }
}

// -------------------------------------------------------------
// 7. ACCIÓN: INICIAR REPARACIÓN (Empleado pasa a EN_PROCESO)
// -------------------------------------------------------------
export async function iniciarReparacionAction(ticketId: string) {
  try {
    const session = await auth();
    if (!session?.user?.id) throw new Error("No autenticado");

    const ticket = await prisma.ticketMantenimiento.findUnique({
      where: { id: ticketId },
    });
    if (!ticket) return { success: false, error: "El ticket no existe." };

    await prisma.ticketMantenimiento.update({
      where: { id: ticketId },
      data: {
        estado: EstadoTicket.EN_PROCESO,
        fechaInicio: new Date(),
      },
    });

    revalidatePath("/empleado/mantenimiento");
    revalidatePath("/admin/mantenimiento");
    revalidatePath("/inquilino/mantenimiento");

    return { success: true, message: "Trabajo marcado como En Reparación." };
  } catch (error) {
    console.error("Error al iniciar reparación:", error);
    return { success: false, error: "No se pudo actualizar el estado del ticket." };
  }
}

// -------------------------------------------------------------
// 8. ACCIÓN: FINIQUITAR / RESOLVER TICKET (Empleado o Admin)
// -------------------------------------------------------------
const resolverTicketSchema = z.object({
  ticketId: z.string().min(1, "ID de ticket requerido"),
  fotosFiniquito: z.array(z.string().url()).min(1, "Debes adjuntar al menos 1 fotografía de la reparación terminada"),
  notasCierre: z.string().min(5, "Ingresa un resumen o informe de cierre técnico"),
});

export type ResolverTicketInput = z.infer<typeof resolverTicketSchema>;

export async function resolverTicketAction(input: ResolverTicketInput) {
  try {
    const session = await auth();
    if (!session?.user?.id) throw new Error("No autenticado");

    const validacion = resolverTicketSchema.safeParse(input);
    if (!validacion.success) {
      return { success: false, error: validacion.error.issues[0]?.message || "Datos inválidos" };
    }

    const { ticketId, fotosFiniquito, notasCierre } = validacion.data;

    const ticketActual = await prisma.ticketMantenimiento.findUnique({
      where: { id: ticketId },
      include: {
        propiedad: true,
        unidad: true,
        inquilino: true,
        empleado: true,
      },
    });

    if (!ticketActual) {
      return { success: false, error: "El ticket no existe." };
    }

    const ahora = new Date();

    const resultado = await prisma.ticketMantenimiento.update({
      where: { id: ticketId },
      data: {
        estado: EstadoTicket.RESUELTO,
        fotosFiniquito,
        notasCierre: notasCierre.trim(),
        fechaFiniquito: ahora,
      },
    });

    // Notificar al inquilino que su ticket fue solventado con éxito
    if (ticketActual.inquilino?.email) {
      ejecutarEnSegundoPlano(async () => {
        await enviarNotificacionTicketResuelto({
          inquilinoNombre: `${ticketActual.inquilino!.nombre} ${ticketActual.inquilino!.apellido || ""}`.trim(),
          inquilinoEmail: ticketActual.inquilino!.email!,
          ticketCodigo: ticketActual.codigo,
          ticketTitulo: ticketActual.titulo,
          propiedadNombre: ticketActual.propiedad.nombre,
          unidadCodigo: ticketActual.unidad?.codigo || "Área Común",
          tecnicoNombre: ticketActual.empleado ? `${ticketActual.empleado.nombre}` : null,
          notasCierre,
          fotosFiniquitoCount: fotosFiniquito.length,
        });
      });
    }

    revalidatePath("/admin/mantenimiento");
    revalidatePath("/empleado/mantenimiento");
    revalidatePath("/inquilino/mantenimiento");

    return {
      success: true,
      message: `¡Ticket #${resultado.codigo} finiquitado como Resuelto!`,
    };
  } catch (error) {
    console.error("Error al resolver ticket:", error);
    return { success: false, error: "No se pudo finiquitar el ticket de mantenimiento." };
  }
}

// -------------------------------------------------------------
// 9. ACCIÓN: CANCELAR TICKET (Admin)
// -------------------------------------------------------------
export async function cancelarTicketAction(ticketId: string, motivo: string) {
  try {
    const session = await auth();
    if (!session?.user?.id || session.user.rol !== "ADMIN") {
      throw new Error("Acceso denegado: Se requiere rol de Administrador.");
    }

    if (!motivo || !motivo.trim()) {
      return { success: false, error: "Debes indicar el motivo de la cancelación." };
    }

    await prisma.ticketMantenimiento.update({
      where: { id: ticketId },
      data: {
        estado: EstadoTicket.CANCELADO,
        motivoCancelacion: motivo.trim(),
      },
    });

    revalidatePath("/admin/mantenimiento");
    revalidatePath("/empleado/mantenimiento");
    revalidatePath("/inquilino/mantenimiento");

    return { success: true, message: "Ticket cancelado correctamente." };
  } catch (error) {
    console.error("Error al cancelar ticket:", error);
    return { success: false, error: "No se pudo cancelar el ticket." };
  }
}

// -------------------------------------------------------------
// 10. ACCIÓN: ACTUALIZAR NOTAS ADMINISTRATIVAS (Admin)
// -------------------------------------------------------------
export async function actualizarNotasAdminAction(ticketId: string, notasAdmin?: string) {
  try {
    const session = await auth();
    if (!session?.user?.id || session.user.rol !== "ADMIN") {
      throw new Error("Acceso denegado: Se requiere rol de Administrador.");
    }

    await prisma.ticketMantenimiento.update({
      where: { id: ticketId },
      data: {
        notasAdmin: notasAdmin ? notasAdmin.trim() : null,
      },
    });

    revalidatePath("/admin/mantenimiento");

    return { success: true, message: "Notas actualizadas correctamente." };
  } catch (error) {
    console.error("Error al actualizar notas de ticket:", error);
    return { success: false, error: "No se pudieron guardar las notas administrativas." };
  }
}

// -------------------------------------------------------------
// 11. ACCIÓN: ACTUALIZAR NIVEL DE URGENCIA (Triaje Admin)
// -------------------------------------------------------------
export async function actualizarUrgenciaTicketAction(
  ticketId: string,
  urgencia: UrgenciaTicket
) {
  try {
    const session = await auth();
    if (!session?.user?.id || session.user.rol !== "ADMIN") {
      throw new Error("Acceso denegado: Se requiere rol de Administrador.");
    }

    await prisma.ticketMantenimiento.update({
      where: { id: ticketId },
      data: { urgencia },
    });

    revalidatePath("/admin/mantenimiento");

    return { success: true, message: "Nivel de urgencia actualizado correctamente." };
  } catch (error) {
    console.error("Error al actualizar urgencia del ticket:", error);
    return { success: false, error: "No se pudo actualizar el nivel de urgencia." };
  }
}
