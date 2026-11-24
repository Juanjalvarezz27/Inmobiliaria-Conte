"use server";

import { prisma } from "@/lib/prisma";
import { requireAdminSession, assertAdminSession } from "@/lib/auth-guard";
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
): Promise<PaginatedResult<unknown>> {
  await assertAdminSession();
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
  const authCheck = await requireAdminSession();
  if (!authCheck.ok) return [];

  try {
    return await prisma.unidad.findMany({
      where: propiedadId ? { propiedadId } : undefined,
      orderBy: { createdAt: "desc" },
      select: UNIDAD_SELECT,
      take: 500,
    });
  } catch (error) {
    console.error("Error al obtener unidades:", error);
    return [];
  }
}

// Obtener una unidad por ID optimizado
export async function getUnidadById(id: string) {
  const authCheck = await requireAdminSession();
  if (!authCheck.ok) return null;

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
  const authCheck = await requireAdminSession();
  if (!authCheck.ok) {
    return {
      totalPropiedades: 0,
      totalUnidades: 0,
      disponibles: 0,
      ocupadas: 0,
      tasaOcupacion: 0,
    };
  }

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
  const authCheck = await requireAdminSession();
  if (!authCheck.ok) return { success: false, error: authCheck.error };

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
  const authCheck = await requireAdminSession();
  if (!authCheck.ok) return { success: false, error: authCheck.error };

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

    // Si se intenta pasar a DISPONIBLE, validar que no sea una matriz con subunidades ocupadas
    if (data.estado === EstadoUnidad.DISPONIBLE) {
      const actual = await prisma.unidad.findUnique({
        where: { id },
        select: { codigo: true, propiedadId: true },
      });
      if (actual) {
        const subunidadesOcupadas = await prisma.unidad.findMany({
          where: {
            propiedadId: actual.propiedadId,
            id: { not: id },
            AND: [
              {
                OR: [
                  { codigo: { startsWith: `${actual.codigo}-` } },
                  { codigo: { startsWith: `${actual.codigo} -` } },
                  { codigo: { startsWith: `${actual.codigo} ` } },
                ],
              },
              {
                OR: [
                  { estado: EstadoUnidad.OCUPADO },
                  {
                    contratos: {
                      some: { estado: { in: [EstadoContrato.ACTIVO, EstadoContrato.POR_VENCER] } },
                    },
                  },
                ],
              },
            ],
          },
          select: { codigo: true },
        });

        if (subunidadesOcupadas.length > 0) {
          const codigos = subunidadesOcupadas.map((s) => s.codigo).join(", ");
          return {
            success: false,
            error: `No es posible reactivar "${actual.codigo}" a DISPONIBLE porque sus subunidades (${codigos}) están ocupadas. Para que el arrendatario ocupe el local completo, utiliza la opción "Expandir Arrendatario".`,
          };
        }
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
  const authCheck = await requireAdminSession();
  if (!authCheck.ok) return { success: false, error: authCheck.error };

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
  const authCheck = await requireAdminSession();
  if (!authCheck.ok) return { success: false };

  try {
    await eliminarArchivosUploadThing(url);
    return { success: true };
  } catch (error) {
    console.error("Error al eliminar imagen de UploadThing:", error);
    return { success: false };
  }
}

export interface InquilinoExpansionInfo {
  inquilinoId: string;
  inquilinoNombre: string;
  documentoIdentidad: string;
  telefono: string;
  contratoId: string;
  contratoCodigo: string;
  subunidadId: string;
  subunidadCodigo: string;
  canonActual: number;
  canonSugeridoMatriz: number;
  areaTotalMatriz: number | null;
  matrizId: string;
  matrizCodigo: string;
}

export interface DiagnosticoSubdivision {
  esMatriz: boolean;
  esSubunidad: boolean;
  matriz?: {
    id: string;
    codigo: string;
    estado: EstadoUnidad;
    areaMt2: number | null;
    precioAlquiler: number | null;
  } | null;
  subunidades: Array<{
    id: string;
    codigo: string;
    estado: EstadoUnidad;
    areaMt2: number | null;
    precioAlquiler: number | null;
    inquilinoNombre?: string | null;
    contratoCodigo?: string | null;
  }>;
  puedeExpandir: boolean;
  inquilinoParaExpandir: InquilinoExpansionInfo | null;
  todasSubunidadesLibres: boolean;
  subunidadesOcupadasCount: number;
}

/**
 * Consulta el historial cronológico completo de contratos e inquilinos de una unidad (Fase 26)
 * Si la unidad es matriz (ej. Local 50), incluye también los contratos de sus subunidades (ej. Local 50-A, 50-B).
 * Incluye diagnóstico de subdivisión y elegibilidad para expansión comercial o reunificación.
 */
export async function getHistorialInquilinosUnidadAction(unidadId: string) {
  try {
    const authCheck = await requireAdminSession();
    if (!authCheck.ok) {
      return {
        success: false,
        error: authCheck.error,
        contratos: [],
        diagnostico: null,
      };
    }

    const unidad = await prisma.unidad.findUnique({
      where: { id: unidadId },
      select: {
        id: true,
        codigo: true,
        propiedadId: true,
        estado: true,
        areaMt2: true,
        precioAlquiler: true,
      },
    });

    if (!unidad) {
      return {
        success: false,
        error: "No se encontró el espacio especificado.",
        contratos: [],
        diagnostico: null,
      };
    }

    // 1. Detectar si la unidad consultada es una subunidad (ej: "Local 50-A" -> matriz "Local 50")
    const matchSub = unidad.codigo.match(/^(.+?)[-\s]+([A-Za-z0-9]+)$/);
    const candidatePadreCodigo = matchSub ? matchSub[1].trim() : null;

    let matriz: {
      id: string;
      codigo: string;
      estado: EstadoUnidad;
      areaMt2: number | null;
      precioAlquiler: number | null;
    } | null = null;

    if (candidatePadreCodigo) {
      const matrizEncontrada = await prisma.unidad.findFirst({
        where: {
          propiedadId: unidad.propiedadId,
          codigo: candidatePadreCodigo,
        },
        select: {
          id: true,
          codigo: true,
          estado: true,
          areaMt2: true,
          precioAlquiler: true,
        },
      });
      if (matrizEncontrada) {
        matriz = matrizEncontrada;
      }
    }

    const esSubunidad = !!matriz;
    const codigoBase = matriz ? matriz.codigo : unidad.codigo;

    // 2. Buscar todas las subunidades asociadas al código base
    const subunidadesDB = await prisma.unidad.findMany({
      where: {
        propiedadId: unidad.propiedadId,
        OR: [
          { codigo: { startsWith: `${codigoBase}-` } },
          { codigo: { startsWith: `${codigoBase} -` } },
          { codigo: { startsWith: `${codigoBase} ` } },
        ],
        NOT: { codigo: codigoBase },
      },
      include: {
        contratos: {
          where: { estado: { in: [EstadoContrato.ACTIVO, EstadoContrato.POR_VENCER] } },
          include: { inquilino: true },
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
    });

    const esMatriz = !esSubunidad && subunidadesDB.length > 0;

    // Subunidades con contrato activo o marcadas como ocupadas
    const subunidadesOcupadas = subunidadesDB.filter(
      (s) => s.contratos.length > 0 || s.estado === EstadoUnidad.OCUPADO
    );
    const subunidadesOcupadasCount = subunidadesOcupadas.length;
    const todasSubunidadesLibres = subunidadesDB.length > 0 && subunidadesOcupadasCount === 0;

    // Determinar si aplica la opción de expansión
    let puedeExpandir = false;
    let inquilinoParaExpandir: InquilinoExpansionInfo | null = null;

    if (subunidadesDB.length > 1 && subunidadesOcupadasCount === 1) {
      const subOcupada = subunidadesOcupadas[0];
      const contratoActivo = subOcupada.contratos[0];
      const targetMatriz = esMatriz ? unidad : matriz;

      if (contratoActivo && targetMatriz) {
        puedeExpandir = true;
        inquilinoParaExpandir = {
          inquilinoId: contratoActivo.inquilino.id,
          inquilinoNombre: contratoActivo.inquilino.apellido
            ? `${contratoActivo.inquilino.nombre} ${contratoActivo.inquilino.apellido}`
            : contratoActivo.inquilino.nombre,
          documentoIdentidad: contratoActivo.inquilino.documentoIdentidad,
          telefono: contratoActivo.inquilino.telefono,
          contratoId: contratoActivo.id,
          contratoCodigo: contratoActivo.codigo,
          subunidadId: subOcupada.id,
          subunidadCodigo: subOcupada.codigo,
          canonActual: contratoActivo.montoAlquiler,
          canonSugeridoMatriz: targetMatriz.precioAlquiler || contratoActivo.montoAlquiler * 2,
          areaTotalMatriz: targetMatriz.areaMt2,
          matrizId: targetMatriz.id,
          matrizCodigo: targetMatriz.codigo,
        };
      }
    }

    const diagnostico: DiagnosticoSubdivision = {
      esMatriz,
      esSubunidad,
      matriz,
      subunidades: subunidadesDB.map((s) => ({
        id: s.id,
        codigo: s.codigo,
        estado: s.estado,
        areaMt2: s.areaMt2,
        precioAlquiler: s.precioAlquiler,
        inquilinoNombre: s.contratos[0]
          ? s.contratos[0].inquilino.apellido
            ? `${s.contratos[0].inquilino.nombre} ${s.contratos[0].inquilino.apellido}`
            : s.contratos[0].inquilino.nombre
          : null,
        contratoCodigo: s.contratos[0]?.codigo || null,
      })),
      puedeExpandir,
      inquilinoParaExpandir,
      todasSubunidadesLibres,
      subunidadesOcupadasCount,
    };

    // 3. Buscar historial de contratos relacionados (de la unidad, matriz y subunidades)
    const unidadIds = Array.from(
      new Set([
        unidad.id,
        ...(matriz ? [matriz.id] : []),
        ...subunidadesDB.map((s) => s.id),
      ])
    );

    const contratos = await prisma.contrato.findMany({
      where: { unidadId: { in: unidadIds } },
      orderBy: { fechaInicio: "desc" },
      select: {
        id: true,
        codigo: true,
        estado: true,
        fechaInicio: true,
        fechaFin: true,
        montoAlquiler: true,
        moneda: true,
        documentoUrl: true,
        notas: true,
        unidad: {
          select: {
            id: true,
            codigo: true,
          },
        },
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
      take: 100,
    });

    return {
      success: true,
      contratos: contratos.map((c) => ({
        ...c,
        fechaInicio: c.fechaInicio.toISOString(),
        fechaFin: c.fechaFin.toISOString(),
      })),
      diagnostico,
    };
  } catch (error) {
    console.error("Error al obtener historial y diagnóstico de unidad:", error);
    return {
      success: false,
      error: "No se pudo cargar el historial de ocupación.",
      contratos: [],
      diagnostico: null,
    };
  }
}

export interface OperacionMatrizResponse {
  success: boolean;
  data?: unknown;
  subunidadesAfectadas?: string[];
  message?: string;
  error?: string;
}

export interface ExpandirInquilinoInput {
  unidadMatrizId: string;
  contratoId: string;
  nuevoCanon?: number;
}

/**
 * Expande el contrato de un arrendatario desde una subunidad al espacio matriz completo (Fase 26)
 * - Mueve el contrato activo a la unidad matriz con el nuevo canon
 * - Actualiza la unidad matriz a estado OCUPADO
 * - Inactiva todas las subunidades para no ofertarlas por duplicado
 */
export async function expandirInquilinoALocalCompletoAction(
  input: ExpandirInquilinoInput
): Promise<OperacionMatrizResponse> {
  const authCheck = await requireAdminSession();
  if (!authCheck.ok) return { success: false, error: authCheck.error };

  try {
    const resTx = await prisma.$transaction(async (tx) => {
      const matriz = await tx.unidad.findUnique({
        where: { id: input.unidadMatrizId },
      });
      if (!matriz) return { success: false, error: "Espacio matriz no encontrado." };

      const contrato = await tx.contrato.findUnique({
        where: { id: input.contratoId },
        include: {
          inquilino: true,
          unidad: true,
        },
      });
      if (!contrato) return { success: false, error: "Contrato vigente no encontrado." };
      if (contrato.estado !== EstadoContrato.ACTIVO && contrato.estado !== EstadoContrato.POR_VENCER) {
        return { success: false, error: "Solo se pueden expandir contratos vigentes." };
      }
      if (contrato.unidad.propiedadId !== matriz.propiedadId) {
        return { success: false, error: "El contrato no pertenece a esta propiedad." };
      }

      // Buscar subunidades asociadas a la matriz
      const subunidades = await tx.unidad.findMany({
        where: {
          propiedadId: matriz.propiedadId,
          OR: [
            { codigo: { startsWith: `${matriz.codigo}-` } },
            { codigo: { startsWith: `${matriz.codigo} -` } },
            { codigo: { startsWith: `${matriz.codigo} ` } },
          ],
          id: { not: matriz.id },
        },
        include: {
          contratos: {
            where: {
              id: { not: contrato.id },
              estado: { in: [EstadoContrato.ACTIVO, EstadoContrato.POR_VENCER] },
            },
          },
        },
      });

      // Verificar que ninguna otra subunidad tenga otro contrato activo
      const subConOtros = subunidades.filter((s) => s.contratos.length > 0);
      if (subConOtros.length > 0) {
        return {
          success: false,
          error: `No se puede expandir: la subunidad "${subConOtros[0].codigo}" está arrendada a otro inquilino.`,
        };
      }

      const canonFinal =
        input.nuevoCanon && input.nuevoCanon > 0
          ? input.nuevoCanon
          : matriz.precioAlquiler || contrato.montoAlquiler;

      const hoyStr = new Date().toLocaleDateString("es-VE");
      const inqNombre = contrato.inquilino.apellido
        ? `${contrato.inquilino.nombre} ${contrato.inquilino.apellido}`
        : contrato.inquilino.nombre;

      const notaAuditoria = `[${hoyStr}] EXPANSION: Arrendatario "${inqNombre}" expandió su contrato al local matriz completo ${matriz.codigo} (${matriz.areaMt2 ? matriz.areaMt2 + " m²" : "matriz"}). Unidad anterior: ${contrato.unidad.codigo}. Canon actualizado: $${canonFinal} USD.`;

      // 1. Actualizar el contrato vigente para apuntar a la matriz y con el nuevo canon
      await tx.contrato.update({
        where: { id: contrato.id },
        data: {
          unidadId: matriz.id,
          montoAlquiler: canonFinal,
          notas: contrato.notas ? `${contrato.notas}\n\n${notaAuditoria}` : notaAuditoria,
        },
      });

      // 2. Activar la matriz en estado OCUPADO
      const matrizActualizada = await tx.unidad.update({
        where: { id: matriz.id },
        data: {
          estado: EstadoUnidad.OCUPADO,
          precioAlquiler: canonFinal,
        },
        select: UNIDAD_SELECT,
      });

      // 3. Inactivar todas las subunidades
      for (const sub of subunidades) {
        await tx.unidad.update({
          where: { id: sub.id },
          data: { estado: EstadoUnidad.INACTIVO },
        });
      }

      return {
        success: true,
        data: matrizActualizada,
        subunidadesAfectadas: subunidades.map((s) => s.id),
        message: `¡Expansión exitosa! "${inqNombre}" ahora arrienda el espacio completo "${matriz.codigo}" por $${canonFinal} USD/mes.`,
      };
    });

    if (resTx.success) {
      revalidatePath("/admin/propiedades");
      revalidatePath("/admin/contratos");
    }
    return resTx;
  } catch (error) {
    console.error("Error al expandir inquilino al local completo:", error);
    return { success: false, error: "Ocurrió un error al procesar la expansión del local." };
  }
}

/**
 * Reunifica y reactiva una unidad matriz cuando todas sus subunidades están libres (Fase 26)
 * - Pone la matriz en DISPONIBLE
 * - Inactiva las subunidades para que no se arrienden duplicadas
 */
export async function reunificarYReactivarMatrizAction(
  unidadMatrizId: string
): Promise<OperacionMatrizResponse> {
  const authCheck = await requireAdminSession();
  if (!authCheck.ok) return { success: false, error: authCheck.error };

  try {
    const resTx = await prisma.$transaction(async (tx) => {
      const matriz = await tx.unidad.findUnique({
        where: { id: unidadMatrizId },
      });
      if (!matriz) return { success: false, error: "Espacio matriz no encontrado." };

      const subunidades = await tx.unidad.findMany({
        where: {
          propiedadId: matriz.propiedadId,
          OR: [
            { codigo: { startsWith: `${matriz.codigo}-` } },
            { codigo: { startsWith: `${matriz.codigo} -` } },
            { codigo: { startsWith: `${matriz.codigo} ` } },
          ],
          id: { not: matriz.id },
        },
        include: {
          contratos: {
            where: { estado: { in: [EstadoContrato.ACTIVO, EstadoContrato.POR_VENCER] } },
          },
        },
      });

      const subOcupada = subunidades.find(
        (s) => s.contratos.length > 0 || s.estado === EstadoUnidad.OCUPADO
      );
      if (subOcupada) {
        return {
          success: false,
          error: `No se puede reactivar: la subunidad "${subOcupada.codigo}" se encuentra ocupada con contrato vigente.`,
        };
      }

      // Inactivar todas las subunidades
      for (const sub of subunidades) {
        await tx.unidad.update({
          where: { id: sub.id },
          data: { estado: EstadoUnidad.INACTIVO },
        });
      }

      // Activar matriz en DISPONIBLE
      const matrizActualizada = await tx.unidad.update({
        where: { id: matriz.id },
        data: { estado: EstadoUnidad.DISPONIBLE },
        select: UNIDAD_SELECT,
      });

      return {
        success: true,
        data: matrizActualizada,
        subunidadesAfectadas: subunidades.map((s) => s.id),
        message: `Espacio "${matriz.codigo}" reunificado y reactivado como DISPONIBLE. Sus subunidades han sido inactivadas.`,
      };
    });

    if (resTx.success) {
      revalidatePath("/admin/propiedades");
      revalidatePath("/admin/contratos");
    }
    return resTx;
  } catch (error) {
    console.error("Error al reunificar y reactivar matriz:", error);
    return { success: false, error: "Error al reunificar y reactivar el espacio." };
  }
}

export interface SubunidadParteInput {
  codigo: string;
  areaMt2?: number | null;
  precioAlquiler?: number | null;
  descripcion?: string | null;
}

export interface SubdividirUnidadInput {
  unidadMatrizId: string;
  partes: SubunidadParteInput[];
}

export interface SubdividirUnidadResponse {
  success: boolean;
  data?: {
    matriz: unknown;
    subunidades: unknown[];
  };
  message?: string;
  error?: string;
}

// Subdivide un espacio matriz estrictamente en dos subunidades comerciales independientes (A y B)
export async function subdividirUnidadAction(
  input: SubdividirUnidadInput
): Promise<SubdividirUnidadResponse> {
  const authCheck = await requireAdminSession();
  if (!authCheck.ok) return { success: false, error: authCheck.error };

  if (!input.unidadMatrizId) {
    return { success: false, error: "Debes especificar la unidad a subdividir." };
  }

  if (!input.partes || input.partes.length !== 2) {
    return { success: false, error: "La división comercial debe realizarse en un máximo de dos partes (Subunidad A y Subunidad B)." };
  }

  const codigos = input.partes.map((p) => (p.codigo || "").trim());
  if (!codigos[0] || !codigos[1]) {
    return { success: false, error: "Ambas subunidades deben tener un código asignado." };
  }

  if (codigos[0].toUpperCase() === codigos[1].toUpperCase()) {
    return { success: false, error: "Los códigos de las subunidades no pueden ser idénticos." };
  }

  try {
    const resTx = await prisma.$transaction(async (tx) => {
      const matriz = await tx.unidad.findUnique({
        where: { id: input.unidadMatrizId },
        include: {
          contratos: {
            where: { estado: { in: [EstadoContrato.ACTIVO, EstadoContrato.POR_VENCER] } },
            include: { inquilino: true },
            orderBy: { createdAt: "desc" },
            take: 1,
          },
        },
      });

      if (!matriz) {
        return { success: false, error: "El espacio matriz seleccionado no existe." };
      }

      // Validar que la unidad no sea en sí misma una subunidad derivada de otro local
      const matchSub = matriz.codigo.match(/^(.+?)[-\s]+([A-Za-z0-9]+)$/);
      if (matchSub) {
        const candidatePadreCodigo = matchSub[1].trim();
        const matrizPadre = await tx.unidad.findFirst({
          where: {
            propiedadId: matriz.propiedadId,
            codigo: candidatePadreCodigo,
          },
          select: { id: true, codigo: true },
        });

        if (matrizPadre) {
          return {
            success: false,
            error: `El espacio "${matriz.codigo}" es una subunidad de "${matrizPadre.codigo}". Una subunidad no puede volver a subdividirse.`,
          };
        }
      }

      // Validar que el local no haya sido ya subdividido previamente
      const subunidadesExistentes = await tx.unidad.findMany({
        where: {
          propiedadId: matriz.propiedadId,
          OR: [
            { codigo: { startsWith: `${matriz.codigo}-` } },
            { codigo: { startsWith: `${matriz.codigo} -` } },
            { codigo: { startsWith: `${matriz.codigo} ` } },
          ],
          id: { not: matriz.id },
        },
        select: { id: true, codigo: true },
      });

      if (subunidadesExistentes.length > 0) {
        const hijosStr = subunidadesExistentes.map((s) => s.codigo).join(", ");
        return {
          success: false,
          error: `El local "${matriz.codigo}" ya se encuentra subdividido en: ${hijosStr}. Un local ya subdividido no puede volver a ser dividido.`,
        };
      }

      const existentes = await tx.unidad.findMany({
        where: {
          propiedadId: matriz.propiedadId,
          codigo: { in: codigos },
        },
        select: { codigo: true },
      });

      if (existentes.length > 0) {
        return {
          success: false,
          error: `Ya existe(n) unidad(es) con el código: ${existentes.map((e) => e.codigo).join(", ")} en esta propiedad.`,
        };
      }

      const contratoActivo = matriz.contratos.length > 0 ? matriz.contratos[0] : null;
      const subunidadesCreadas = [];

      // 1. Crear Subunidad A (hereda contrato activo si existía en la matriz)
      const parteA = input.partes[0];
      const nuevaSubunidadA = await tx.unidad.create({
        data: {
          codigo: parteA.codigo.trim(),
          tipo: matriz.tipo,
          piso: matriz.piso,
          areaMt2: typeof parteA.areaMt2 === "number" && !isNaN(parteA.areaMt2) ? parteA.areaMt2 : null,
          precioAlquiler:
            typeof parteA.precioAlquiler === "number" && !isNaN(parteA.precioAlquiler)
              ? parteA.precioAlquiler
              : null,
          descripcion:
            parteA.descripcion?.trim() ||
            `Subunidad A creada a partir de la división del espacio matriz ${matriz.codigo}.`,
          estado: contratoActivo ? EstadoUnidad.OCUPADO : EstadoUnidad.DISPONIBLE,
          imagenes: matriz.imagenes || [],
          propiedadId: matriz.propiedadId,
        },
        select: UNIDAD_SELECT,
      });
      subunidadesCreadas.push(nuevaSubunidadA);

      // Si la matriz tenía arrendatario, reasignar su contrato a la Subunidad A
      if (contratoActivo) {
        const canonAjustado =
          parteA.precioAlquiler && parteA.precioAlquiler > 0
            ? parteA.precioAlquiler
            : contratoActivo.montoAlquiler / 2;

        const hoy = new Date().toLocaleDateString("es-VE");
        const inqNombre = contratoActivo.inquilino.apellido
          ? `${contratoActivo.inquilino.nombre} ${contratoActivo.inquilino.apellido}`
          : contratoActivo.inquilino.nombre;

        const notaTransferencia = `[${hoy}] SUBDIVISIÓN: Arrendatario "${inqNombre}" reasignado a Subunidad A (${nuevaSubunidadA.codigo}) tras la división del local ${matriz.codigo}. Canon mensual ajustado a $${canonAjustado} USD.`;

        await tx.contrato.update({
          where: { id: contratoActivo.id },
          data: {
            unidadId: nuevaSubunidadA.id,
            montoAlquiler: canonAjustado,
            notas: contratoActivo.notas
              ? `${contratoActivo.notas}\n\n${notaTransferencia}`
              : notaTransferencia,
          },
        });
      }

      // 2. Crear Subunidad B (siempre DISPONIBLE)
      const parteB = input.partes[1];
      const nuevaSubunidadB = await tx.unidad.create({
        data: {
          codigo: parteB.codigo.trim(),
          tipo: matriz.tipo,
          piso: matriz.piso,
          areaMt2: typeof parteB.areaMt2 === "number" && !isNaN(parteB.areaMt2) ? parteB.areaMt2 : null,
          precioAlquiler:
            typeof parteB.precioAlquiler === "number" && !isNaN(parteB.precioAlquiler)
              ? parteB.precioAlquiler
              : null,
          descripcion:
            parteB.descripcion?.trim() ||
            `Subunidad B creada a partir de la división del espacio matriz ${matriz.codigo}.`,
          estado: EstadoUnidad.DISPONIBLE,
          imagenes: matriz.imagenes || [],
          propiedadId: matriz.propiedadId,
        },
        select: UNIDAD_SELECT,
      });
      subunidadesCreadas.push(nuevaSubunidadB);

      // 3. Inactivar la unidad matriz original con nota de trazabilidad
      const hoyStr = new Date().toLocaleDateString("es-VE");
      const notaAuditoria = `[${hoyStr}] SUBDIVISIÓN: Local dividido en 2 subunidades (${nuevaSubunidadA.codigo} y ${nuevaSubunidadB.codigo}). Inactivado para prevenir duplicidad.`;

      const descFinal = matriz.descripcion
        ? `${matriz.descripcion}\n\n${notaAuditoria}`
        : notaAuditoria;

      const matrizActualizada = await tx.unidad.update({
        where: { id: matriz.id },
        data: {
          estado: EstadoUnidad.INACTIVO,
          descripcion: descFinal,
        },
        select: UNIDAD_SELECT,
      });

      return {
        success: true,
        data: {
          matriz: matrizActualizada,
          subunidades: subunidadesCreadas,
        },
        message: `¡Espacio "${matriz.codigo}" dividido con éxito en 2 subunidades (${nuevaSubunidadA.codigo} y ${nuevaSubunidadB.codigo})!`,
      };
    });

    if (resTx.success) {
      revalidatePath("/admin/propiedades");
      revalidatePath("/admin/contratos");
    }
    return resTx;
  } catch (error) {
    console.error("Error al subdividir unidad:", error);
    return { success: false, error: "Ocurrió un error inesperado al procesar la división del local." };
  }
}

