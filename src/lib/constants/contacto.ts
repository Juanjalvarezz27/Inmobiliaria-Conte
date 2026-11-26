// Teléfono WhatsApp oficial de respaldo para administración
export const ADMIN_TELEFONO_DEFECTO = "+58 422-0552870";

// Valor de relleno antiguo que nunca debe prevalecer sobre el número real
const TELEFONO_PLACEHOLDER_LEGADO = "04120000000";

// Devuelve el primer teléfono válido descartando vacíos y el placeholder legado
export function resolverTelefonoAdmin(
  ...candidatos: Array<string | null | undefined>
): string {
  for (const candidato of candidatos) {
    const limpio = candidato?.trim();
    if (limpio && limpio.replace(/\D/g, "") !== TELEFONO_PLACEHOLDER_LEGADO) {
      return limpio;
    }
  }
  return ADMIN_TELEFONO_DEFECTO;
}
