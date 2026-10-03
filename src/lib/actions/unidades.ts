"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { EstadoUnidad, TipoUnidad } from "@prisma/client";
import { eliminarArchivosUploadThing } from "@/lib/uploadthing-server";

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

// Proyección mínima y optimizada: solo trae los campos necesarios para la UI y la gestión de unidades
const UNIDAD_SELECT = {
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
} as const;

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

// Eliminar una unidad y sus archivos físicos en UploadThing
export async function deleteUnidad(id: string) {
  try {
    // Buscar fotos de la unidad antes de borrar el registro
    const unidad = await prisma.unidad.findUnique({
      where: { id },
      select: { imagenes: true },
    });

    await prisma.unidad.delete({
      where: { id },
    });

    // Borrado físico de imágenes en UploadThing para liberar almacenamiento
    if (unidad?.imagenes && unidad.imagenes.length > 0) {
      await eliminarArchivosUploadThing(unidad.imagenes);
    }

    revalidatePath("/admin/propiedades");
    return { success: true };
  } catch (error) {
    console.error("Error al eliminar unidad:", error);
    return { success: false, error: "No se pudo eliminar la unidad" };
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
