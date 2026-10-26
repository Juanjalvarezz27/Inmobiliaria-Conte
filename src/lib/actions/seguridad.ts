"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  CategoriaNovedad,
  type GuardiaDiarioData,
  type IncidenciaItem,
  type SeguridadDashboardData,
} from "@/lib/types/seguridad";
import { formatearHora12, formatearFechaCorta } from "@/lib/date-utils";

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

  if (!usuario) {
    throw new Error("Usuario no encontrado");
  }

  const esAdmin = usuario.rol === "ADMIN";

  if (!esAdmin && !usuario.empleado) {
    throw new Error("No se encontró perfil de trabajador asociado a esta cuenta");
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

  return {
    propiedadAsignada,
    propiedades,
    incidencias,
    incidenciasHoy,
    fechaHoy: inicioHoy.toISOString(),
    esAdmin,
  };
}

// 2. Registrar una nueva novedad en la Bitácora de Seguridad
export async function registrarIncidenciaAction(formData: {
  propiedadId: string;
  categoria: CategoriaNovedad;
  titulo: string;
  descripcion: string;
  fotos?: string[];
}): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    const { empleado, esAdmin } = await getEmpleadoAutenticado();

    const parsed = registrarIncidenciaSchema.safeParse(formData);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message || "Datos del reporte inválidos",
      };
    }

    let { propiedadId, categoria, titulo, descripcion, fotos } = parsed.data;

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

    // Obtener el inicio del día para agrupar la bitácora de seguridad
    const ahora = new Date();
    const inicioHoy = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate(), 0, 0, 0);

    // Contenedor diario para el inmueble (se crea una sola vez por día si no existe)
    let minutaDiaria = await prisma.minutaGuardia.findFirst({
      where: {
        propiedadId,
        fecha: {
          gte: inicioHoy,
          lt: new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate() + 1, 0, 0, 0),
        },
      },
    });

    if (!minutaDiaria) {
      const empleadoIdParaMinuta =
        empleado?.id || (await prisma.empleado.findFirst({ select: { id: true } }))?.id;

      if (!empleadoIdParaMinuta) {
        return {
          success: false,
          error: "Debe existir al menos un empleado registrado para aperturar la minuta diaria.",
        };
      }

      minutaDiaria = await prisma.minutaGuardia.create({
        data: {
          propiedadId,
          empleadoId: empleadoIdParaMinuta,
          fecha: inicioHoy,
          horaInicio: ahora,
        },
      });
    }

    // Insertar la novedad/incidencia en el libro
    await prisma.novedadMinuta.create({
      data: {
        minutaId: minutaDiaria.id,
        hora: ahora,
        categoria,
        titulo,
        descripcion,
        fotos: fotos || [],
      },
    });

    revalidatePath("/empleado/minuta");
    revalidatePath("/admin/seguridad");

    return {
      success: true,
      message: "Novedad registrada correctamente en la Bitácora de Seguridad.",
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
    const session = await auth();
    if (!session?.user?.id || session.user.rol !== "ADMIN") {
      return {
        success: false,
        error: "No autorizado. Solo los administradores pueden editar registros.",
      };
    }

    const { id, categoria, titulo, descripcion, fotos, propiedadId } = formData;

    const incidenciaExistente = await prisma.novedadMinuta.findUnique({
      where: { id },
      include: { minuta: true },
    });

    if (!incidenciaExistente) {
      return { success: false, error: "No se encontró el reporte a editar." };
    }

    let nuevaMinutaId = incidenciaExistente.minutaId;
    if (propiedadId && propiedadId !== incidenciaExistente.minuta.propiedadId) {
      const fechaMinuta = incidenciaExistente.minuta.fecha;
      let minutaDestino = await prisma.minutaGuardia.findFirst({
        where: {
          propiedadId,
          fecha: fechaMinuta,
        },
      });

      if (!minutaDestino) {
        minutaDestino = await prisma.minutaGuardia.create({
          data: {
            propiedadId,
            empleadoId: incidenciaExistente.minuta.empleadoId,
            fecha: fechaMinuta,
            horaInicio: incidenciaExistente.minuta.horaInicio || new Date(),
          },
        });
      }
      nuevaMinutaId = minutaDestino.id;
    }

    await prisma.novedadMinuta.update({
      where: { id },
      data: {
        minutaId: nuevaMinutaId,
        categoria,
        titulo: titulo.trim(),
        descripcion: descripcion.trim(),
        fotos: fotos || [],
      },
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
    const session = await auth();
    if (!session?.user?.id || session.user.rol !== "ADMIN") {
      return { success: false, error: "No autorizado. Solo los administradores pueden eliminar registros." };
    }

    await prisma.novedadMinuta.delete({
      where: { id },
    });

    revalidatePath("/empleado/minuta");
    revalidatePath("/admin/seguridad");

    return { success: true, message: "Registro eliminado de la Bitácora de Seguridad." };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error al eliminar el registro",
    };
  }
}

// 4. Obtener datos para la vista ejecutiva de Auditoría (Admin)
export async function getSeguridadDashboardDataAction(): Promise<SeguridadDashboardData> {
  const session = await auth();
  if (!session?.user?.id || session.user.rol !== "ADMIN") {
    throw new Error("Acceso restringido para administradores");
  }

  const ahora = new Date();
  const inicioMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1, 0, 0, 0);
  const inicioHoy = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate(), 0, 0, 0);

  const [propiedades, novedades] = await Promise.all([
    prisma.propiedad.findMany({
      where: { activo: true },
      select: { id: true, nombre: true, ciudad: true },
      orderBy: { nombre: "asc" },
    }),
    prisma.novedadMinuta.findMany({
      where: {
        hora: { gte: inicioMes },
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

  const incidencias: IncidenciaItem[] = novedades.map((n) => ({
    id: n.id,
    propiedadId: n.minuta.propiedad?.id || "",
    propiedadNombre: n.minuta.propiedad?.nombre || "Sin Inmueble",
    empleadoId: n.minuta.empleado.id,
    empleadoNombre: `${n.minuta.empleado.nombre} ${n.minuta.empleado.apellido}`,
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

  const incidenciasHoy = incidencias.filter(
    (i) => new Date(i.fecha) >= inicioHoy
  ).length;

  const propiedadesUnicas = new Set(
    incidencias.map((i) => i.propiedadId).filter(Boolean)
  ).size;

  const fotosRegistradas = incidencias.reduce(
    (acc, curr) => acc + (curr.fotos?.length || 0),
    0
  );

  return {
    incidencias,
    metricas: {
      totalIncidenciasMes: incidencias.length,
      incidenciasHoy,
      propiedadesReportadas: propiedadesUnicas,
      fotosRegistradas,
    },
    propiedades,
  };
}
