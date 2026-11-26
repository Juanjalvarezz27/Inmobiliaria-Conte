"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { z } from "zod";
import { enviarNotificacionIncidenciaCriticaAdmin } from "@/lib/email-templates/notificacion-incidencia-critica";

function ejecutarEnSegundoPlano(tarea: () => Promise<unknown>) {
  try {
    after(async () => {
      try {
        await tarea();
      } catch (err) {
        console.error("Error en tarea de segundo plano (seguridad):", err);
      }
    });
  } catch {
    tarea().catch((err) => console.error("Error en tarea asincrona:", err));
  }
}
import {
  CategoriaNovedad,
  CATEGORIA_NOVEDAD_CONFIG,
  type GuardiaDiarioData,
  type IncidenciaItem,
  type SeguridadDashboardData,
} from "@/lib/types/seguridad";
import { formatearHora12, formatearFechaCorta, getRangosDiaVenezuela, getRangosMesVenezuela } from "@/lib/date-utils";
import { requireAdminSession } from "@/lib/auth-guard";
import { getWhatsAppUrl } from "@/lib/formatters";
import { resolverTelefonoAdmin } from "@/lib/constants/contacto";
import { obtenerTelefonoAdminActivo } from "@/lib/admin-contacto";
import { PaginationParams, PaginatedResult } from "@/types/pagination";
import { resolvePagination, createPaginatedResponse } from "@/lib/pagination-helper";
import { Prisma } from "@prisma/client";

// Esquema de validación para registro de incidencias
const registrarIncidenciaSchema = z.object({
  propiedadId: z.string().min(1, "El inmueble es obligatorio"),
  categoria: z.nativeEnum(CategoriaNovedad),
  titulo: z.string().trim().min(3, "El título debe tener al menos 3 caracteres").max(120),
  descripcion: z.string().trim().min(5, "El detalle debe tener al menos 5 caracteres").max(2000),
  fotos: z.array(z.string().url()).optional().default([]),
});

// Helper de sesión y obtención del perfil de empleado
async function getEmpleadoAutenticado() {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("No autenticado");
  }

  const usuario = await prisma.usuario.findUnique({
    where: { id: session.user.id },
    include: {
      empleado: {
        include: {
          propiedad: {
            select: { id: true, nombre: true, ciudad: true },
          },
        },
      },
    },
  });

  if (!usuario || !usuario.activo) {
    throw new Error("Cuenta inactiva o no encontrada");
  }

  const esAdmin = usuario.rol === "ADMIN";
  if (!esAdmin && usuario.rol !== "EMPLEADO") {
    throw new Error("No autorizado para acceder al módulo de seguridad");
  }

  if (!esAdmin && (!usuario.empleado || !usuario.empleado.activo)) {
    throw new Error("No se encontró perfil de trabajador activo asociado a esta cuenta");
  }

  return { usuario, empleado: usuario.empleado, esAdmin };
}

// 1. Obtener la vista de la Bitácora de Seguridad para el vigilante / personal
export async function getGuardiaDiarioDataAction(
  propiedadIdSeleccionada?: string
): Promise<GuardiaDiarioData> {
  const { empleado, esAdmin } = await getEmpleadoAutenticado();

  let targetPropiedadId = "";
  let propiedadAsignada: { id: string; nombre: string; ciudad: string } | null = null;
  let propiedades: Array<{ id: string; nombre: string; ciudad: string }> = [];

  if (esAdmin) {
    // Modo Administrador: Supervisión global de todas las sedes
    propiedades = await prisma.propiedad.findMany({
      where: { activo: true },
      select: { id: true, nombre: true, ciudad: true },
      orderBy: { nombre: "asc" },
    });

    targetPropiedadId =
      propiedadIdSeleccionada ||
      empleado?.propiedadId ||
      propiedades[0]?.id ||
      "";

    propiedadAsignada =
      propiedades.find((p) => p.id === targetPropiedadId) || null;
  } else {
    // Modo Empleado (Seguridad): Ámbito estrictamente aislado a su inmueble de trabajo
    if (!empleado?.propiedadId || !empleado.propiedad) {
      const ahora = new Date();
      const inicioHoy = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate(), 0, 0, 0);
      return {
        propiedadAsignada: null,
        propiedades: [],
        incidencias: [],
        incidenciasHoy: [],
        fechaHoy: inicioHoy.toISOString(),
        esAdmin: false,
        adminTelefono: resolverTelefonoAdmin(process.env.ADMIN_WHATSAPP_PHONE),
      };
    }

    targetPropiedadId = empleado.propiedadId;
    propiedadAsignada = {
      id: empleado.propiedad.id,
      nombre: empleado.propiedad.nombre,
      ciudad: empleado.propiedad.ciudad,
    };
    propiedades = [propiedadAsignada];
  }

  // Rango para histórico reciente (últimos 60 días) y de hoy
  const ahora = new Date();
  const inicioHoy = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate(), 0, 0, 0);
  const finHoy = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate(), 23, 59, 59);
  const fechaLimite = new Date(ahora.getTime() - 60 * 24 * 60 * 60 * 1000);

  // Consultar el historial de novedades de este inmueble (aislamiento estricto)
  const novedadesRaw = targetPropiedadId
    ? await prisma.novedadMinuta.findMany({
        where: {
          minuta: {
            propiedadId: targetPropiedadId,
          },
          hora: { gte: fechaLimite },
        },
        include: {
          minuta: {
            include: {
              propiedad: { select: { id: true, nombre: true } },
              empleado: { select: { id: true, nombre: true, apellido: true, cedula: true, telefono: true } },
            },
          },
        },
        orderBy: { hora: "desc" },
      })
    : [];

  const incidencias: IncidenciaItem[] = novedadesRaw.map((n) => ({
    id: n.id,
    propiedadId: n.minuta.propiedad?.id || "",
    propiedadNombre: n.minuta.propiedad?.nombre || "Sin Inmueble",
    empleadoId: n.minuta.empleado.id,
    empleadoNombre: `${n.minuta.empleado.nombre} ${n.minuta.empleado.apellido || ""}`.trim(),
    empleadoCedula: n.minuta.empleado.cedula,
    empleadoTelefono: n.minuta.empleado.telefono,
    fecha: n.hora.toISOString(),
    horaFormateada: formatearHora12(n.hora.toISOString()),
    fechaFormateada: formatearFechaCorta(n.hora.toISOString()),
    categoria: n.categoria as CategoriaNovedad,
    titulo: n.titulo,
    descripcion: n.descripcion,
    fotos: n.fotos || [],
    createdAt: n.createdAt.toISOString(),
  }));

  const incidenciasHoy = incidencias.filter((i) => {
    const t = new Date(i.fecha).getTime();
    return t >= inicioHoy.getTime() && t <= finHoy.getTime();
  });

  // Consultar teléfono del administrador para despacho rápido desde la bitácora
  const adminTelefono = await obtenerTelefonoAdminActivo();

  return {
    propiedadAsignada,
    propiedades,
    incidencias,
    incidenciasHoy,
    fechaHoy: inicioHoy.toISOString(),
    esAdmin,
    adminTelefono,
  };
}

// 2. Registrar una nueva novedad en la Bitácora de Seguridad con payload oficial para WhatsApp
export async function registrarIncidenciaAction(formData: {
  propiedadId: string;
  categoria: CategoriaNovedad;
  titulo: string;
  descripcion: string;
  fotos?: string[];
}): Promise<{
  success: boolean;
  message?: string;
  error?: string;
  whatsAppData?: {
    url: string;
    telefono: string;
    texto: string;
    inmuebleNombre: string;
    guardiaNombre: string;
    hora: string;
    categoria: string;
    titulo: string;
    descripcion: string;
  };
}> {
  try {
    const { usuario, empleado, esAdmin } = await getEmpleadoAutenticado();

    const parsed = registrarIncidenciaSchema.safeParse(formData);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message || "Datos del reporte inválidos",
      };
    }

    let propiedadId = parsed.data.propiedadId;
    const { categoria, titulo, descripcion, fotos } = parsed.data;

    // Autorización estricta: El personal solo puede asentar novedades en su inmueble asignado
    if (!esAdmin) {
      if (!empleado?.propiedadId) {
        return {
          success: false,
          error: "No tienes un inmueble asignado. Contacta a administración para registrar novedades.",
        };
      }
      propiedadId = empleado.propiedadId;
    } else {
      const propExiste = await prisma.propiedad.findUnique({
        where: { id: propiedadId },
        select: { id: true, activo: true },
      });
      if (!propExiste || !propExiste.activo) {
        return {
          success: false,
          error: "El inmueble seleccionado no existe o no está activo.",
        };
      }
    }

    // Obtener el inicio del día en hora Venezuela para agrupar la bitácora de seguridad
    const ahora = new Date();
    const { inicioDia: inicioHoy, finDia: finHoy } = getRangosDiaVenezuela(ahora);
    const lockKey = `minuta-${propiedadId}-${inicioHoy.toISOString().slice(0, 10)}`;

    // Crear/reutilizar minuta diaria e insertar novedad atómicamente evitando duplicados por concurrencia
    const errorOrMinuta = await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${lockKey}))`;

      let minutaDiaria = await tx.minutaGuardia.findFirst({
        where: {
          propiedadId,
          fecha: {
            gte: inicioHoy,
            lte: finHoy,
          },
        },
      });

      if (!minutaDiaria) {
        const empleadoIdParaMinuta =
          empleado?.id || (await tx.empleado.findFirst({ where: { activo: true }, select: { id: true } }))?.id;

        if (!empleadoIdParaMinuta) {
          return { error: "Debe existir al menos un empleado registrado para aperturar la minuta diaria." };
        }

        minutaDiaria = await tx.minutaGuardia.create({
          data: {
            propiedadId,
            empleadoId: empleadoIdParaMinuta,
            fecha: inicioHoy,
            horaInicio: ahora,
          },
        });
      }

      await tx.novedadMinuta.create({
        data: {
          minutaId: minutaDiaria.id,
          hora: ahora,
          categoria,
          titulo,
          descripcion,
          fotos: fotos || [],
        },
      });

      return { ok: true };
    });

    if ("error" in errorOrMinuta && errorOrMinuta.error) {
      return { success: false, error: errorOrMinuta.error };
    }

    // Obtener datos del inmueble para el parte
    const prop = await prisma.propiedad.findUnique({
      where: { id: propiedadId },
      select: { nombre: true },
    });
    const nombreInmueble = prop?.nombre || empleado?.propiedad?.nombre || "Inmueble Conté";
    const nombreGuardia = `${usuario.nombre} ${usuario.apellido || ""}`.trim();
    const horaFormateada = formatearHora12(ahora.toISOString());
    const categoriaLabel = CATEGORIA_NOVEDAD_CONFIG[categoria]?.label || categoria;

    // Buscar teléfono del administrador oficial para el despacho
    const adminTelefono = await obtenerTelefonoAdminActivo();

    // Formatear texto oficial para WhatsApp con tono corporativo sobrio (sin emojis)
    const textoParte = [
      "*NOVEDAD DE SEGURIDAD — INMOBILIARIA CONTÉ*",
      `*Inmueble:* ${nombreInmueble}`,
      `*Hora:* ${horaFormateada}`,
      `*Guardia:* ${nombreGuardia}`,
      `*Categoría:* ${categoriaLabel}`,
      `*Asunto:* ${titulo}`,
      `*Detalle:* ${descripcion}`,
    ].join("\n");

    const whatsAppUrl = getWhatsAppUrl(adminTelefono, textoParte);

    // Si la novedad es una incidencia de seguridad o falla grave, notificar inmediatamente al administrador por correo
    if (
      categoria === CategoriaNovedad.INCIDENCIA_SEGURIDAD ||
      categoria === CategoriaNovedad.FALLA_INFRAESTRUCTURA
    ) {
      ejecutarEnSegundoPlano(async () => {
        await enviarNotificacionIncidenciaCriticaAdmin({
          propiedadNombre: nombreInmueble,
          guardiaNombre: nombreGuardia,
          categoriaLabel,
          titulo,
          descripcion,
          hora: horaFormateada,
          fotosCount: fotos?.length || 0,
        });
      });
    }

    revalidatePath("/empleado/minuta");
    revalidatePath("/admin/seguridad");

    return {
      success: true,
      message: "Novedad registrada correctamente en la Bitácora de Seguridad.",
      whatsAppData: {
        url: whatsAppUrl,
        telefono: adminTelefono,
        texto: textoParte,
        inmuebleNombre: nombreInmueble,
        guardiaNombre: nombreGuardia,
        hora: horaFormateada,
        categoria: categoriaLabel,
        titulo,
        descripcion,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error al registrar la incidencia",
    };
  }
}

// 3. Actualizar una incidencia de la bitácora (Solo Administradores)
export async function actualizarIncidenciaAction(formData: {
  id: string;
  propiedadId?: string;
  categoria: CategoriaNovedad;
  titulo: string;
  descripcion: string;
  fotos?: string[];
}): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    const authCheck = await requireAdminSession();
    if (!authCheck.ok) {
      return { success: false, error: authCheck.error };
    }

    const { id, categoria, titulo, descripcion, fotos, propiedadId } = formData;
    if (!titulo?.trim() || titulo.trim().length < 3) {
      return { success: false, error: "El título debe tener al menos 3 caracteres." };
    }
    if (!descripcion?.trim() || descripcion.trim().length < 5) {
      return { success: false, error: "El detalle debe tener al menos 5 caracteres." };
    }

    const incidenciaExistente = await prisma.novedadMinuta.findUnique({
      where: { id },
      include: { minuta: true },
    });

    if (!incidenciaExistente) {
      return { success: false, error: "No se encontró el reporte a editar." };
    }

    await prisma.$transaction(async (tx) => {
      let nuevaMinutaId = incidenciaExistente.minutaId;
      if (propiedadId && propiedadId !== incidenciaExistente.minuta.propiedadId) {
        const propDestino = await tx.propiedad.findUnique({
          where: { id: propiedadId },
          select: { id: true, activo: true },
        });
        if (!propDestino?.activo) {
          throw new Error("El inmueble de destino no existe o está inactivo.");
        }

        const fechaMinuta = incidenciaExistente.minuta.fecha;
        const { inicioDia, finDia } = getRangosDiaVenezuela(fechaMinuta);
        const lockKey = `minuta-${propiedadId}-${inicioDia.toISOString().slice(0, 10)}`;
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${lockKey}))`;

        let minutaDestino = await tx.minutaGuardia.findFirst({
          where: {
            propiedadId,
            fecha: { gte: inicioDia, lte: finDia },
          },
        });

        if (!minutaDestino) {
          minutaDestino = await tx.minutaGuardia.create({
            data: {
              propiedadId,
              empleadoId: incidenciaExistente.minuta.empleadoId,
              fecha: inicioDia,
              horaInicio: incidenciaExistente.minuta.horaInicio || new Date(),
            },
          });
        }
        nuevaMinutaId = minutaDestino.id;
      }

      await tx.novedadMinuta.update({
        where: { id },
        data: {
          minutaId: nuevaMinutaId,
          categoria,
          titulo: titulo.trim(),
          descripcion: descripcion.trim(),
          fotos: fotos || [],
        },
      });
    });

    revalidatePath("/empleado/minuta");
    revalidatePath("/admin/seguridad");

    return {
      success: true,
      message: "Reporte de seguridad actualizado exitosamente.",
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error al actualizar la incidencia",
    };
  }
}

// 4. Eliminar una incidencia de la bitácora (Solo Administradores)
export async function eliminarIncidenciaAction(
  id: string
): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    const authCheck = await requireAdminSession();
    if (!authCheck.ok) {
      return { success: false, error: authCheck.error };
    }

    await prisma.novedadMinuta.delete({
      where: { id },
    });

    revalidatePath("/empleado/minuta");
    revalidatePath("/admin/seguridad");

    return { success: true, message: "Registro eliminado de la Bitácora de Seguridad." };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return { success: false, error: "El registro ya fue eliminado previamente." };
    }
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error al eliminar el registro",
    };
  }
}

// Filtros estructurados para consulta paginada de novedades
export interface FiltrosNovedades extends PaginationParams {
  propiedadId?: string;
  categoria?: CategoriaNovedad;
  fecha?: string;
}

// Consulta paginada real en servidor para bitácora e incidencias
export async function getNovedadesPaginadasAction(
  filtros: FiltrosNovedades = {}
): Promise<PaginatedResult<IncidenciaItem>> {
  const { empleado, esAdmin } = await getEmpleadoAutenticado();

  const { page, pageSize, skip, take } = resolvePagination(filtros, 15);
  const where: Prisma.NovedadMinutaWhereInput = {};

  if (!esAdmin) {
    // Aislamiento estricto por sede asignada para personal no administrador
    if (!empleado?.propiedadId) {
      return createPaginatedResponse([], 0, page, pageSize);
    }
    where.minuta = { propiedadId: empleado.propiedadId };
  } else if (filtros.propiedadId && filtros.propiedadId !== "TODOS") {
    where.minuta = { propiedadId: filtros.propiedadId };
  }

  if (filtros.categoria && (filtros.categoria as string) !== "TODOS") {
    where.categoria = filtros.categoria;
  }

  if (filtros.fecha) {
    const [y, m, d] = filtros.fecha.split("-").map(Number);
    if (y && m && d) {
      const { inicioDia, finDia } = getRangosDiaVenezuela(new Date(Date.UTC(y, m - 1, d, 12, 0, 0)));
      where.hora = { gte: inicioDia, lte: finDia };
    }
  }

  if (filtros.search && filtros.search.trim()) {
    const q = filtros.search.trim();
    where.OR = [
      { titulo: { contains: q, mode: "insensitive" } },
      { descripcion: { contains: q, mode: "insensitive" } },
      { minuta: { empleado: { nombre: { contains: q, mode: "insensitive" } } } },
    ];
  }

  const [total, novedades] = await prisma.$transaction([
    prisma.novedadMinuta.count({ where }),
    prisma.novedadMinuta.findMany({
      where,
      skip,
      take,
      orderBy: { hora: "desc" },
      include: {
        minuta: {
          include: {
            propiedad: { select: { id: true, nombre: true } },
            empleado: { select: { id: true, nombre: true, apellido: true, cedula: true, telefono: true } },
          },
        },
      },
    }),
  ]);

  const items: IncidenciaItem[] = novedades.map((n) => ({
    id: n.id,
    propiedadId: n.minuta.propiedad?.id || "",
    propiedadNombre: n.minuta.propiedad?.nombre || "Sin Inmueble",
    empleadoId: n.minuta.empleado.id,
    empleadoNombre: `${n.minuta.empleado.nombre} ${n.minuta.empleado.apellido || ""}`.trim(),
    empleadoCedula: n.minuta.empleado.cedula,
    empleadoTelefono: n.minuta.empleado.telefono,
    fecha: n.hora.toISOString(),
    horaFormateada: formatearHora12(n.hora.toISOString()),
    fechaFormateada: formatearFechaCorta(n.hora.toISOString()),
    categoria: n.categoria as CategoriaNovedad,
    titulo: n.titulo,
    descripcion: n.descripcion,
    fotos: n.fotos || [],
    createdAt: n.createdAt.toISOString(),
  }));

  return createPaginatedResponse(items, total, page, pageSize);
}

// 4. Obtener datos para la vista ejecutiva de Auditoría (Admin) con métricas en SQL
export async function getSeguridadDashboardDataAction(): Promise<SeguridadDashboardData> {
  const authCheck = await requireAdminSession();
  if (!authCheck.ok) {
    throw new Error(authCheck.error);
  }

  const { inicioMes } = getRangosMesVenezuela();
  const { inicioDia: inicioHoy } = getRangosDiaVenezuela();

  // Ejecución concurrente con conteos delegados a PostgreSQL
  const [propiedades, totalIncidenciasMes, incidenciasHoy, gruposPropiedad, novedadesRecientes] =
    await Promise.all([
      prisma.propiedad.findMany({
        where: { activo: true },
        select: { id: true, nombre: true, ciudad: true },
        orderBy: { nombre: "asc" },
      }),
      prisma.novedadMinuta.count({
        where: { hora: { gte: inicioMes } },
      }),
      prisma.novedadMinuta.count({
        where: { hora: { gte: inicioHoy } },
      }),
      prisma.minutaGuardia.groupBy({
        by: ["propiedadId"],
        where: {
          fecha: { gte: inicioMes },
          propiedadId: { not: null },
        },
      }),
      prisma.novedadMinuta.findMany({
        where: {
          hora: { gte: inicioHoy },
        },
        include: {
          minuta: {
            include: {
              propiedad: { select: { id: true, nombre: true } },
              empleado: { select: { id: true, nombre: true, apellido: true, cedula: true, telefono: true } },
            },
          },
        },
        orderBy: { hora: "desc" },
      }),
    ]);

  const incidencias: IncidenciaItem[] = novedadesRecientes.map((n) => ({
    id: n.id,
    propiedadId: n.minuta.propiedad?.id || "",
    propiedadNombre: n.minuta.propiedad?.nombre || "Sin Inmueble",
    empleadoId: n.minuta.empleado.id,
    empleadoNombre: `${n.minuta.empleado.nombre} ${n.minuta.empleado.apellido || ""}`.trim(),
    empleadoCedula: n.minuta.empleado.cedula,
    empleadoTelefono: n.minuta.empleado.telefono,
    fecha: n.hora.toISOString(),
    horaFormateada: formatearHora12(n.hora.toISOString()),
    fechaFormateada: formatearFechaCorta(n.hora.toISOString()),
    categoria: n.categoria as CategoriaNovedad,
    titulo: n.titulo,
    descripcion: n.descripcion,
    fotos: n.fotos || [],
    createdAt: n.createdAt.toISOString(),
  }));

  const fotosRegistradas = incidencias.reduce(
    (acc, curr) => acc + (curr.fotos?.length || 0),
    0
  );

  return {
    incidencias,
    metricas: {
      totalIncidenciasMes,
      incidenciasHoy,
      propiedadesReportadas: gruposPropiedad.length,
      fotosRegistradas,
    },
    propiedades,
  };
}
