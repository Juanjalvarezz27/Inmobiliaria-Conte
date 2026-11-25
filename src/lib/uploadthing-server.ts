import { UTApi } from "uploadthing/server";

// Instancia server-side para imágenes del catálogo (App UploadThing: Inmobiliariaconte)
const tokenPropiedades = process.env.UPLOADTHING_TOKEN_PROPIEDADES || process.env.UPLOADTHING_TOKEN;
export const utapiPropiedades = new UTApi({ token: tokenPropiedades });

// Instancia server-side para PDFs, contratos y operaciones (App UploadThing: conte)
const tokenOperaciones = process.env.UPLOADTHING_TOKEN_OPERACIONES || process.env.UPLOADTHING_TOKEN;
export const utapiOperaciones = new UTApi({ token: tokenOperaciones });

// Instancia por defecto para compatibilidad histórica
export const utapi = utapiPropiedades;

const tokensDistintos = Boolean(tokenPropiedades && tokenOperaciones && tokenPropiedades !== tokenOperaciones);

export interface InstanciaUploadThing {
  nombre: string;
  api: UTApi;
}

export interface ArchivoUploadThing {
  key: string;
  name: string;
  size: number;
  status: string;
  uploadedAt: number;
}

/**
 * Devuelve las instancias únicas de UploadThing configuradas para evitar escaneos duplicados.
 */
export function obtenerInstanciasUploadThing(): InstanciaUploadThing[] {
  const instancias: InstanciaUploadThing[] = [];
  if (tokenPropiedades) {
    instancias.push({ nombre: "PROPIEDADES (Inmobiliariaconte)", api: utapiPropiedades });
  }
  if (tokenOperaciones && tokenOperaciones !== tokenPropiedades) {
    instancias.push({ nombre: "OPERACIONES (conte)", api: utapiOperaciones });
  }
  return instancias;
}

/**
 * Extrae la clave del archivo (fileKey) a partir de una URL completa de UploadThing.
 * Soporta dominios utfs.io, ufs.sh y URLs con estructura /f/{key} o directas.
 */
export function extraerFileKey(url: string): string | null {
  if (!url) return null;
  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    return url;
  }
  try {
    const parsed = new URL(url);
    const pathname = parsed.pathname;
    const matchF = pathname.match(/\/f\/(.+)$/);
    if (matchF && matchF[1]) {
      return matchF[1];
    }
    const parts = pathname.split("/").filter(Boolean);
    return parts.length > 0 ? parts[parts.length - 1] : null;
  } catch {
    const parts = url.split("/");
    return parts[parts.length - 1] || null;
  }
}

/**
 * Lista todos los archivos almacenados en una instancia de UploadThing paginando automáticamente.
 */
export async function listarTodosArchivosUploadThing(apiInstance: UTApi): Promise<ArchivoUploadThing[]> {
  const archivos: ArchivoUploadThing[] = [];
  let offset = 0;
  const limit = 500;

  while (true) {
    const res = await apiInstance.listFiles({ limit, offset });
    archivos.push(...res.files);
    if (!res.hasMore || res.files.length === 0) break;
    offset += res.files.length;
  }

  return archivos;
}

/**
 * Elimina uno o más archivos de imágenes (App UploadThing: Inmobiliariaconte).
 */
export async function eliminarImagenesUploadThing(urls: string[] | string) {
  return eliminarDeApi(urls, utapiPropiedades, "Imágenes (Inmobiliariaconte)");
}

/**
 * Elimina uno o más archivos PDF / contratos (App UploadThing: conte).
 */
export async function eliminarDocumentosUploadThing(urls: string[] | string) {
  return eliminarDeApi(urls, utapiOperaciones, "Documentos PDF (conte)");
}

async function eliminarDeApi(
  urls: string[] | string,
  apiInstance: UTApi,
  cuentaNombre: string
): Promise<{ success: true; count: number } | { success: false; error: unknown; count: 0 }> {
  try {
    const urlArray = Array.isArray(urls) ? urls : [urls];
    const keys = Array.from(new Set(urlArray.map(extraerFileKey).filter(Boolean) as string[]));

    if (keys.length === 0) {
      return { success: true, count: 0 };
    }

    const res = await apiInstance.deleteFiles(keys);
    if (!res.success) {
      return { success: false, error: `UploadThing rechazó la eliminación en [${cuentaNombre}]`, count: 0 };
    }
    return { success: true, count: res.deletedCount ?? 0 };
  } catch (error) {
    console.error(`Error al eliminar archivos físicos de UploadThing [${cuentaNombre}]:`, error);
    return { success: false, error, count: 0 };
  }
}

/**
 * Elimina uno o más archivos de UploadThing enrutando por app y haciendo respaldo en la otra app cuando la URL es ambigua (ej. utfs.io).
 */
export async function eliminarArchivosUploadThing(urls: string[] | string) {
  try {
    const urlArray = Array.from(new Set((Array.isArray(urls) ? urls : [urls]).filter(Boolean)));
    if (urlArray.length === 0) return { success: true, count: 0 };

    const urlsOperacionesSeguras: string[] = [];
    const urlsPropiedadesSeguras: string[] = [];
    const urlsAmbiguasPdf: string[] = [];
    const urlsAmbiguasOtros: string[] = [];

    for (const u of urlArray) {
      const lower = u.toLowerCase();
      if (lower.includes("12p6xoorve")) {
        urlsOperacionesSeguras.push(u);
      } else if (lower.includes("wduy4injzy")) {
        urlsPropiedadesSeguras.push(u);
      } else if (lower.endsWith(".pdf") || lower.includes(".pdf")) {
        urlsAmbiguasPdf.push(u);
      } else {
        urlsAmbiguasOtros.push(u);
      }
    }

    let totalEliminados = 0;

    if (urlsPropiedadesSeguras.length > 0) {
      const res = await eliminarImagenesUploadThing(urlsPropiedadesSeguras);
      if (res.success) totalEliminados += res.count;
    }

    if (urlsOperacionesSeguras.length > 0) {
      const res = await eliminarDocumentosUploadThing(urlsOperacionesSeguras);
      if (res.success) totalEliminados += res.count;
    }

    // Para URLs genéricas (utfs.io o claves directas) intenta primero la app probable y respalda con la otra si faltaron archivos
    const eliminarConRespaldo = async (
      lote: string[],
      primaria: typeof eliminarImagenesUploadThing,
      secundaria: typeof eliminarImagenesUploadThing
    ) => {
      if (lote.length === 0) return 0;
      const res = await primaria(lote);
      let count = res.success ? res.count : 0;
      if (tokensDistintos && count < lote.length) {
        const resFallback = await secundaria(lote);
        if (resFallback.success) count += resFallback.count;
      }
      return count;
    };

    totalEliminados += await eliminarConRespaldo(urlsAmbiguasPdf, eliminarDocumentosUploadThing, eliminarImagenesUploadThing);
    totalEliminados += await eliminarConRespaldo(urlsAmbiguasOtros, eliminarImagenesUploadThing, eliminarDocumentosUploadThing);

    return { success: true, count: totalEliminados };
  } catch (error) {
    console.error("Error al eliminar archivos físicos de UploadThing:", error);
    return { success: false, error, count: 0 };
  }
}
