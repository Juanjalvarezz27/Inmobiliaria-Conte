export type MonedaIndiceBcv = "USD" | "EUR";

export interface TasaBcvResponse {
  tasa: number;
  tasaEur?: number | null;
  fechaActualizacion: string;
  fuente: string;
  esFallback: boolean;
  fechaValorTexto?: string;
  fechaValorIso?: string;
}

// Resuelve la tasa correspondiente segun la referencia BCV configurada
export function resolverTasaSegunReferencia(
  tasaData: TasaBcvResponse | undefined | null,
  referencia: MonedaIndiceBcv = "USD"
): number {
  if (!tasaData) return 0;
  if (referencia === "EUR") {
    return tasaData.tasaEur && tasaData.tasaEur > 0 ? tasaData.tasaEur : 0;
  }
  return tasaData.tasa > 0 ? tasaData.tasa : 0;
}
