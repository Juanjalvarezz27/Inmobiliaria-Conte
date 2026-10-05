import { UTApi } from "uploadthing/server";

// Instancia server-side para imágenes del catálogo (App UploadThing: Inmobiliariaconte)
const tokenPropiedades = process.env.UPLOADTHING_TOKEN_PROPIEDADES || process.env.UPLOADTHING_TOKEN;
export const utapiPropiedades = new UTApi({ token: tokenPropiedades });

// Instancia server-side para PDFs, contratos y operaciones (App UploadThing: conte)
const tokenOperaciones = process.env.UPLOADTHING_TOKEN_OPERACIONES || process.env.UPLOADTHING_TOKEN;
export const utapiOperaciones = new UTApi({ token: tokenOperaciones });

// Instancia por defecto para compatibilidad histórica
export const utapi = utapiPropiedades;

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
    const keys = urlArray.map(extraerFileKey).filter(Boolean) as string[];

    if (keys.length === 0) {
      return { success: true, count: 0 };
    }

    await apiInstance.deleteFiles(keys);
    return { success: true, count: keys.length };
  } catch (error) {
    console.error(`Error al eliminar archivos físicos de UploadThing [${cuentaNombre}]:`, error);
    return { success: false, error, count: 0 };
  }
}

/**
 * Elimina uno o más archivos de UploadThing enrutando automáticamente según la URL o extensión.
 */
export async function eliminarArchivosUploadThing(urls: string[] | string) {
  try {
    const urlArray = Array.isArray(urls) ? urls : [urls];
    if (urlArray.length === 0) return { success: true, count: 0 };

    const urlsPdf: string[] = [];
    const urlsImg: string[] = [];

    for (const u of urlArray) {
      const lower = u.toLowerCase();
      // App ID de conte: 12p6xoorve o extensión PDF
      if (lower.includes("12p6xoorve") || lower.endsWith(".pdf") || lower.includes(".pdf")) {
        urlsPdf.push(u);
      } else {
        urlsImg.push(u);
      }
    }

    let totalEliminados = 0;
    if (urlsImg.length > 0) {
      const res = await eliminarImagenesUploadThing(urlsImg);
      if (res.success) totalEliminados += res.count;
    }
    if (urlsPdf.length > 0) {
      const res = await eliminarDocumentosUploadThing(urlsPdf);
      if (res.success) totalEliminados += res.count;
    }

    return { success: true, count: totalEliminados };
  } catch (error) {
    console.error("Error al eliminar archivos físicos de UploadThing:", error);
    return { success: false, error };
  }
}
