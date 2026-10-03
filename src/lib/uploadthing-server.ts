import { UTApi } from "uploadthing/server";

// Instancia server-side de UTApi con el token del bucket de propiedades
const token = process.env.UPLOADTHING_TOKEN_PROPIEDADES || process.env.UPLOADTHING_TOKEN;
export const utapi = new UTApi({ token });

/**
 * Extrae la clave del archivo (fileKey) a partir de una URL completa de UploadThing.
 * Soporta dominios utfs.io, ufs.sh y URLs con estructura /f/{key}.
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
 * Elimina uno o más archivos de UploadThing de forma segura.
 */
export async function eliminarArchivosUploadThing(urls: string[] | string) {
  try {
    const urlArray = Array.isArray(urls) ? urls : [urls];
    const keys = urlArray.map(extraerFileKey).filter(Boolean) as string[];

    if (keys.length === 0) {
      return { success: true, count: 0 };
    }

    await utapi.deleteFiles(keys);
    return { success: true, count: keys.length };
  } catch (error) {
    console.error("Error al eliminar archivos físicos de UploadThing:", error);
    return { success: false, error };
  }
}
