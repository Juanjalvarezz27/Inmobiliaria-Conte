import { MetodoPago } from "@prisma/client";

export const METODO_PAGO_CONFIG: Record<
  MetodoPago,
  { label: string; badgeClass: string }
> = {
  EFECTIVO_USD: {
    label: "Efectivo (USD)",
    badgeClass: "bg-emerald-50 text-emerald-800 border-emerald-200",
  },
  TRANSFERENCIA: {
    label: "Transferencia Bancaria",
    badgeClass: "bg-blue-50 text-blue-800 border-blue-200",
  },
  PAGO_MOVIL: {
    label: "Pago Móvil",
    badgeClass: "bg-indigo-50 text-indigo-800 border-indigo-200",
  },
  ZELLE: {
    label: "Zelle",
    badgeClass: "bg-purple-50 text-purple-800 border-purple-200",
  },
  OTRO: {
    label: "Otro Método",
    badgeClass: "bg-slate-100 text-slate-800 border-slate-200",
  },
};

export const NOMBRES_METODOS: Record<MetodoPago, string> = {
  EFECTIVO_USD: "Efectivo (USD)",
  TRANSFERENCIA: "Transferencia Bancaria",
  PAGO_MOVIL: "Pago Móvil",
  ZELLE: "Zelle",
  OTRO: "Otro Método",
};

export const OPCIONES_METODO_PAGO = [
  { value: MetodoPago.TRANSFERENCIA, label: "Transferencia Bancaria" },
  { value: MetodoPago.EFECTIVO_USD, label: "Efectivo (USD)" },
  { value: MetodoPago.PAGO_MOVIL, label: "Pago Móvil" },
  { value: MetodoPago.ZELLE, label: "Zelle" },
  { value: MetodoPago.OTRO, label: "Otro Método" },
];
