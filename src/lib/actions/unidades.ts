"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { Prisma, EstadoUnidad, TipoUnidad, EstadoContrato } from "@prisma/client";
import { eliminarArchivosUploadThing } from "@/lib/uploadthing-server";
import { PaginationParams, PaginatedResult } from "@/types/pagination";
import { resolvePagination, createPaginatedResponse } from "@/lib/pagination-helper";

export interface CreateUnidadInput {
  codigo: string;
  tipo?: TipoUnidad;
  piso?: string;
  areaMt2?: number;
  precioAlquiler?: number;
  descripcion?: string;
  estado?: EstadoUnidad;
  imagenes?: string[];
  propiedadId: string;
}

export interface UpdateUnidadInput {
  codigo?: string;
  tipo?: TipoUnidad;
  piso?: string;
  areaMt2?: number;
  precioAlquiler?: number;
  descripcion?: string;
  estado?: EstadoUnidad;
  imagenes?: string[];
  propiedadId?: string;
}

// Proyección mínima y optimizada: incluye contratos activos para vincular inquilinos y contratos con la unidad
const UNIDAD_SELECT = Prisma.validator<Prisma.UnidadSelect>()({
  id: true,
  codigo: true,
  tipo: true,
  piso: true,
  areaMt2: true,
  precioAlquiler: true,
  descripcion: true,
  estado: true,
  imagenes: true,
  propiedadId: true,
  propiedad: {
    select: {
      id: true,
      nombre: true,
      tipo: true,
      ciudad: true,
    },
  },
  contratos: {
    where: {
      estado: { in: [EstadoContrato.ACTIVO, EstadoContrato.POR_VENCER] },
    },
    orderBy: { createdAt: "desc" },
    take: 1,
    select: {
      id: true,
      codigo: true,
      estado: true,
      fechaInicio: true,
      fechaFin: true,
      montoAlquiler: true,
      moneda: true,
      inquilino: {
        select: {
          id: true,
          nombre: true,
          apellido: true,
          tipoPersona: true,
          documentoIdentidad: true,
          telefono: true,
          email: true,
        },
      },
    },
  },
  _count: {
    select: {
      contratos: true,
    },
  },
});

// Filtros para consulta paginada de unidades
export interface FiltrosUnidades extends PaginationParams {
  propiedadId?: string;
  estado?: EstadoUnidad;
  tipo?: TipoUnidad;
}

// Consulta paginada real en servidor para unidades (sin tope de take: 300)
export async function getUnidadesPaginadasAction(
  filtros: FiltrosUnidades = {}
): Promise<PaginatedResult<any>> {
  const { page, pageSize, skip, take } = resolvePagination(filtros, 15);
  const where: Prisma.UnidadWhereInput = {};

  if (filtros.propiedadId && filtros.propiedadId !== "TODAS") {
    where.propiedadId = filtros.propiedadId;
  }
  if (filtros.estado) {
    where.estado = filtros.estado;
  }
  if (filtros.tipo) {
    where.tipo = filtros.tipo;
  }
  if (filtros.search && filtros.search.trim()) {
    const q = filtros.search.trim();
    where.OR = [
      { codigo: { contains: q, mode: "insensitive" } },
      { descripcion: { contains: q, mode: "insensitive" } },
    ];
  }

  const [total, unidades] = await prisma.$transaction([
    prisma.unidad.count({ where }),
    prisma.unidad.findMany({
      where,
      orderBy: { createdAt: "desc" },
      select: UNIDAD_SELECT,
      skip,
      take,
    }),
  ]);

  return createPaginatedResponse(unidades, total, page, pageSize);
}

// Obtener todas las unidades (opcionalmente filtradas por propiedad) optimizado
export async function getUnidades(propiedadId?: string) {
  try {
    return await prisma.unidad.findMany({
      where: propiedadId ? { propiedadId } : undefined,
      orderBy: { createdAt: "desc" },
      select: UNIDAD_SELECT,
    });
  } catch (error) {
    console.error("Error al obtener unidades:", error);
    return [];
  }
}

// Obtener una unidad por ID optimizado
export async function getUnidadById(id: string) {
  try {
    return await prisma.unidad.findUnique({
      where: { id },
      select: UNIDAD_SELECT,
    });
  } catch (error) {
    console.error("Error al obtener unidad:", error);
    return null;
  }
}

// Obtener métricas consolidadas del parque inmobiliario
export async function getEstadisticasPropiedades() {
  try {
    const [totalPropiedades, totalUnidades, disponibles, ocupadas] = await Promise.all([
      prisma.propiedad.count(),
      prisma.unidad.count(),
      prisma.unidad.count({ where: { estado: EstadoUnidad.DISPONIBLE } }),
      prisma.unidad.count({ where: { estado: EstadoUnidad.OCUPADO } }),
    ]);

    const tasaOcupacion = totalUnidades > 0 ? Math.round((ocupadas / totalUnidades) * 100) : 0;

    return {
      totalPropiedades,
      totalUnidades,
      disponibles,
      ocupadas,
      tasaOcupacion,
    };
  } catch (error) {
    console.error("Error al obtener estadísticas inmobiliarias:", error);
    return {
      totalPropiedades: 0,
      totalUnidades: 0,
      disponibles: 0,
      ocupadas: 0,
      tasaOcupacion: 0,
    };
  }
}

// Crear una nueva unidad optimizado
export async function createUnidad(data: CreateUnidadInput) {
  try {
    const nuevaUnidad = await prisma.unidad.create({
      data: {
        codigo: data.codigo.trim(),
        tipo: data.tipo || TipoUnidad.LOCAL,
        piso: data.piso?.trim() || null,
        areaMt2: data.areaMt2 ? Number(data.areaMt2) : null,
        precioAlquiler: data.precioAlquiler ? Number(data.precioAlquiler) : null,
        descripcion: data.descripcion?.trim() || null,
        estado: data.estado || EstadoUnidad.DISPONIBLE,
        imagenes: data.imagenes || [],
        propiedadId: data.propiedadId,
      },
      select: UNIDAD_SELECT,
    });

    revalidatePath("/admin/propiedades");
    return { success: true, data: nuevaUnidad };
  } catch (error) {
    console.error("Error al crear unidad:", error);
    return { success: false, error: "No se pudo registrar la unidad" };
  }
}

// Actualizar datos de una unidad optimizado con limpieza de imágenes huérfanas
export async function updateUnidad(id: string, data: UpdateUnidadInput) {
  try {
    // Si se modifican imágenes, identificar cuáles se eliminaron para borrarlas de UploadThing
    let fotosAEliminar: string[] = [];
    if (data.imagenes !== undefined) {
      const previa = await prisma.unidad.findUnique({
        where: { id },
        select: { imagenes: true },
      });
      if (previa?.imagenes && previa.imagenes.length > 0) {
        fotosAEliminar = previa.imagenes.filter((img) => !data.imagenes?.includes(img));
      }
    }

    const actualizada = await prisma.unidad.update({
      where: { id },
      data: {
        ...(data.codigo && { codigo: data.codigo.trim() }),
        ...(data.tipo && { tipo: data.tipo }),
        ...(data.piso !== undefined && { piso: data.piso?.trim() || null }),
        ...(data.areaMt2 !== undefined && { areaMt2: data.areaMt2 ? Number(data.areaMt2) : null }),
        ...(data.precioAlquiler !== undefined && {
          precioAlquiler: data.precioAlquiler ? Number(data.precioAlquiler) : null,
        }),
        ...(data.descripcion !== undefined && { descripcion: data.descripcion?.trim() || null }),
        ...(data.estado && { estado: data.estado }),
        ...(data.imagenes && { imagenes: data.imagenes }),
        ...(data.propiedadId && { propiedadId: data.propiedadId }),
      },
      select: UNIDAD_SELECT,
    });

    // Limpiar en UploadThing las fotos que fueron retiradas de la unidad
    if (fotosAEliminar.length > 0) {
      await eliminarArchivosUploadThing(fotosAEliminar);
    }

    revalidatePath("/admin/propiedades");
    return { success: true, data: actualizada };
  } catch (error) {
    console.error("Error al actualizar unidad:", error);
    return { success: false, error: "No se pudo actualizar la unidad" };
  }
}

// Eliminar o inactivar una unidad protegiendo claves foráneas e integridad contable
export async function deleteUnidad(id: string) {
  try {
    const unidad = await prisma.unidad.findUnique({
      where: { id },
      select: {
        id: true,
        codigo: true,
        imagenes: true,
        contratos: {
          select: { id: true, estado: true },
        },
      },
    });

    if (!unidad) return { success: false, error: "Espacio no encontrado." };

    const tieneContratosActivos = unidad.contratos.some(
      (c) => c.estado === EstadoContrato.ACTIVO || c.estado === EstadoContrato.POR_VENCER
    );

    if (tieneContratosActivos) {
      return {
        success: false,
        error: `No se puede eliminar el espacio "${unidad.codigo}" porque tiene un contrato de arrendamiento vigente. Primero debes finalizar o rescindir el contrato.`,
      };
    }

    // Si tiene contratos históricos (finalizados o rescindidos), se inactiva para no violar la FK y proteger los libros contables
    if (unidad.contratos.length > 0) {
      const actualizada = await prisma.unidad.update({
        where: { id },
        data: { estado: EstadoUnidad.INACTIVO },
        select: UNIDAD_SELECT,
      });

      revalidatePath("/admin/propiedades");
      revalidatePath("/admin/contratos");

      return {
        success: true,
        inactivada: true,
        data: actualizada,
        message: `El espacio "${unidad.codigo}" posee historial contable y contratos previos. Se ha marcado como INACTIVO para proteger la trazabilidad sin permitir nuevos alquileres.`,
      };
    }

    // Si no tiene ningún contrato en su historial, se elimina limpiamente
    await prisma.unidad.delete({
      where: { id },
    });

    if (unidad.imagenes && unidad.imagenes.length > 0) {
      await eliminarArchivosUploadThing(unidad.imagenes);
    }

    revalidatePath("/admin/propiedades");
    revalidatePath("/admin/contratos");

    return {
      success: true,
      inactivada: false,
      message: `Espacio "${unidad.codigo}" eliminado permanentemente.`,
    };
  } catch (error) {
    console.error("Error al eliminar unidad:", error);
    return { success: false, error: "No se pudo procesar la eliminación del espacio." };
  }
}

// Acción del servidor para eliminar una imagen individual de UploadThing (ej. al quitarla en formulario)
export async function eliminarImagenUploadThingAction(url: string) {
  try {
    await eliminarArchivosUploadThing(url);
    return { success: true };
  } catch (error) {
    console.error("Error al eliminar imagen de UploadThing:", error);
    return { success: false };
  }
}
