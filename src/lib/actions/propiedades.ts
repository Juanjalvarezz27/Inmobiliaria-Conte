"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath, revalidateTag, unstable_cache } from "next/cache";
import { Prisma, TipoPropiedad, TipoUnidad, EstadoContrato, EstadoUnidad } from "@prisma/client";
import { eliminarArchivosUploadThing } from "@/lib/uploadthing-server";

export interface CreatePropiedadInput {
  nombre: string;
  tipo: TipoPropiedad;
  direccion: string;
  ciudad: string;
  descripcion?: string;
  numPisos?: number;
  areaTotalM2?: number;
  propietario?: string;
  telefonoContacto?: string;
  // Campos opcionales para autogenerar la unidad si es una propiedad independiente
  unidadInicial?: {
    areaMt2?: number;
    precioAlquiler?: number;
    imagenes?: string[];
  };
}

export interface UpdatePropiedadInput {
  nombre?: string;
  tipo?: TipoPropiedad;
  direccion?: string;
  ciudad?: string;
  descripcion?: string;
  numPisos?: number | null;
  areaTotalM2?: number | null;
  propietario?: string | null;
  telefonoContacto?: string | null;
}

// Proyección mínima y optimizada: solo trae los campos necesarios para la UI y la gestión
const PROPIEDAD_SELECT = {
  id: true,
  nombre: true,
  tipo: true,
  direccion: true,
  ciudad: true,
  descripcion: true,
  numPisos: true,
  areaTotalM2: true,
  propietario: true,
  telefonoContacto: true,
  activo: true,
} as const;

// Obtener todas las propiedades con conteo de unidades optimizado
export async function getPropiedades() {
  try {
    return await prisma.propiedad.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        ...PROPIEDAD_SELECT,
        _count: {
          select: { unidades: true },
        },
      },
    });
  } catch (error) {
    console.error("Error al obtener propiedades:", error);
    return [];
  }
}

// Obtener una propiedad por ID con sus unidades optimizadas
export async function getPropiedadById(id: string) {
  try {
    return await prisma.propiedad.findUnique({
      where: { id },
      select: {
        ...PROPIEDAD_SELECT,
        unidades: {
          select: {
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
          },
        },
      },
    });
  } catch (error) {
    console.error("Error al obtener propiedad:", error);
    return null;
  }
}

// Crear una nueva propiedad
export async function createPropiedad(data: CreatePropiedadInput) {
  try {
    const tiposIndividuales: TipoPropiedad[] = [
      TipoPropiedad.CASA,
      TipoPropiedad.APARTAMENTO,
      TipoPropiedad.LOCAL,
      TipoPropiedad.GALPON,
      TipoPropiedad.TERRENO,
    ];
    const esIndividual = tiposIndividuales.includes(data.tipo);

    if (esIndividual && data.unidadInicial) {
      const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
        const propiedad = await tx.propiedad.create({
          data: {
            nombre: data.nombre.trim(),
            tipo: data.tipo,
            direccion: data.direccion.trim(),
            ciudad: data.ciudad.trim(),
            descripcion: data.descripcion?.trim() || null,
            numPisos: data.numPisos ?? null,
            areaTotalM2: data.areaTotalM2 ?? null,
            propietario: data.propietario?.trim() || null,
            telefonoContacto: data.telefonoContacto?.trim() || null,
          },
          select: PROPIEDAD_SELECT,
        });

        await tx.unidad.create({
          data: {
            codigo: "Principal",
            tipo:
              data.tipo === TipoPropiedad.CASA
                ? TipoUnidad.CASA
                : data.tipo === TipoPropiedad.APARTAMENTO
                ? TipoUnidad.APARTAMENTO
                : TipoUnidad.LOCAL,
            areaMt2: data.unidadInicial?.areaMt2 || null,
            precioAlquiler: data.unidadInicial?.precioAlquiler || null,
            imagenes: data.unidadInicial?.imagenes || [],
            propiedadId: propiedad.id,
          },
        });

        return propiedad;
      });

      revalidatePath("/admin/propiedades");
      revalidateTag("propiedades-catalogo", "max");
      return { success: true, data: result };
    }

    const nuevaPropiedad = await prisma.propiedad.create({
      data: {
        nombre: data.nombre.trim(),
        tipo: data.tipo,
        direccion: data.direccion.trim(),
        ciudad: data.ciudad.trim(),
        descripcion: data.descripcion?.trim() || null,
        numPisos: data.numPisos ?? null,
        areaTotalM2: data.areaTotalM2 ?? null,
        propietario: data.propietario?.trim() || null,
        telefonoContacto: data.telefonoContacto?.trim() || null,
      },
      select: PROPIEDAD_SELECT,
    });

    revalidatePath("/admin/propiedades");
    revalidateTag("propiedades-catalogo", "max");
    return { success: true, data: nuevaPropiedad };
  } catch (error) {
    console.error("Error al crear propiedad:", error);
    return { success: false, error: "No se pudo crear la propiedad" };
  }
}

// Actualizar datos de una propiedad
export async function updatePropiedad(id: string, data: UpdatePropiedadInput) {
  try {
    const actualizada = await prisma.propiedad.update({
      where: { id },
      data: {
        ...(data.nombre && { nombre: data.nombre.trim() }),
        ...(data.tipo && { tipo: data.tipo }),
        ...(data.direccion && { direccion: data.direccion.trim() }),
        ...(data.ciudad && { ciudad: data.ciudad.trim() }),
        ...(data.descripcion !== undefined && { descripcion: data.descripcion?.trim() || null }),
        ...(data.numPisos !== undefined && { numPisos: data.numPisos }),
        ...(data.areaTotalM2 !== undefined && { areaTotalM2: data.areaTotalM2 }),
        ...(data.propietario !== undefined && { propietario: data.propietario?.trim() || null }),
        ...(data.telefonoContacto !== undefined && { telefonoContacto: data.telefonoContacto?.trim() || null }),
      },
      select: PROPIEDAD_SELECT,
    });

    revalidatePath("/admin/propiedades");
    revalidateTag("propiedades-catalogo", "max");
    return { success: true, data: actualizada };
  } catch (error) {
    console.error("Error al actualizar propiedad:", error);
    return { success: false, error: "No se pudo actualizar la propiedad" };
  }
}

// Eliminar o archivar una propiedad protegiendo claves foráneas y contratos en sus unidades
export async function deletePropiedad(id: string) {
  try {
    const propiedad = await prisma.propiedad.findUnique({
      where: { id },
      select: {
        id: true,
        nombre: true,
        unidades: {
          select: {
            id: true,
            codigo: true,
            imagenes: true,
            contratos: {
              select: { id: true, estado: true },
            },
          },
        },
      },
    });

    if (!propiedad) return { success: false, error: "Propiedad no encontrada." };

    // 1. Validar si alguna unidad tiene contratos vigentes activos
    const unidadesConContratoActivo = propiedad.unidades.filter((u) =>
      u.contratos.some(
        (c) => c.estado === EstadoContrato.ACTIVO || c.estado === EstadoContrato.POR_VENCER
      )
    );

    if (unidadesConContratoActivo.length > 0) {
      return {
        success: false,
        error: `No se puede eliminar ni archivar la propiedad "${propiedad.nombre}" porque contiene espacios con contratos vigentes activos (${unidadesConContratoActivo.map((u) => u.codigo).join(", ")}). Primero debes finalizar o rescindir sus contratos.`,
      };
    }

    // 2. Validar si alguna unidad tiene contratos históricos
    const unidadesConContratos = propiedad.unidades.filter((u) => u.contratos.length > 0);

    if (unidadesConContratos.length > 0) {
      // SOFT DELETE (ARCHIVADO INTEGRAL)
      await prisma.$transaction([
        prisma.propiedad.update({
          where: { id },
          data: { activo: false },
        }),
        prisma.unidad.updateMany({
          where: { propiedadId: id },
          data: { estado: EstadoUnidad.INACTIVO },
        }),
      ]);

      revalidatePath("/admin/propiedades");
      revalidatePath("/admin/contratos");
      revalidatePath("/admin/cobranza");
      revalidateTag("propiedades-catalogo", "max");

      return {
        success: true,
        archivada: true,
        message: `La propiedad "${propiedad.nombre}" posee contratos en su historial contable. Se ha ARCHIVADO correctamente y todos sus espacios han pasado a estado INACTIVO para preservar la trazabilidad de los libros financieros.`,
      };
    }

    // 3. Si ninguna unidad tiene contratos (propiedad virgen), borrado físico definitivo en cascada
    const todasLasFotos = propiedad.unidades.flatMap((u) => u.imagenes);

    await prisma.propiedad.delete({
      where: { id },
    });

    if (todasLasFotos.length > 0) {
      await eliminarArchivosUploadThing(todasLasFotos);
    }

    revalidatePath("/admin/propiedades");
    revalidatePath("/admin/contratos");
    revalidateTag("propiedades-catalogo", "max");

    return {
      success: true,
      eliminada: true,
      message: `Propiedad "${propiedad.nombre}" eliminada definitivamente.`,
    };
  } catch (error) {
    console.error("Error al eliminar o archivar propiedad:", error);
    return { success: false, error: "No se pudo eliminar la propiedad." };
  }
}

// Reactivar o restaurar una propiedad archivada
export async function reactivarPropiedad(id: string) {
  try {
    await prisma.propiedad.update({
      where: { id },
      data: { activo: true },
    });

    revalidatePath("/admin/propiedades");
    revalidatePath("/admin/contratos");
    revalidateTag("propiedades-catalogo", "max");

    return {
      success: true,
      message: "Propiedad reactivada correctamente.",
    };
  } catch (error) {
    console.error("Error al reactivar propiedad:", error);
    return { success: false, error: "No se pudo reactivar la propiedad." };
  }
}

// Consulta en caché Edge para opciones de inmuebles (1 hora de TTL o revalidación inmediata por tag)
export const getPropiedadesOpcionesCached = unstable_cache(
  async () => {
    return await prisma.propiedad.findMany({
      where: { activo: true },
      select: {
        id: true,
        nombre: true,
        ciudad: true,
        tipo: true,
      },
      orderBy: { nombre: "asc" },
    });
  },
  ["catalogo-propiedades-opciones"],
  {
    revalidate: 3600,
    tags: ["propiedades-catalogo"],
  }
);

// Obtener lista reducida de propiedades para selectores y filtros (ultra ligero con Edge Cache)
export async function getPropiedadesOpciones() {
  try {
    return await getPropiedadesOpcionesCached();
  } catch (error) {
    console.error("Error al obtener opciones de propiedades:", error);
    return [];
  }
}
