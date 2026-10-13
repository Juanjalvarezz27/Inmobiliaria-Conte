import { CategoriaTransaccion, MetodoPago } from "@prisma/client";
import {
  Zap,
  Sparkles,
  Wrench,
  Users,
  Package,
  Landmark,
  Scale,
  Megaphone,
  Home,
  Car,
  Calendar,
  HelpCircle,
} from "lucide-react";

export const CATEGORIA_CONFIG: Record<
  CategoriaTransaccion,
  {
    label: string;
    descripcion: string;
    colorBadge: string;
    icon: typeof Zap;
  }
> = {
  SERVICIOS_PUBLICOS: {
    label: "Servicios Públicos",
    descripcion: "Electricidad, agua, aseo, gas, internet",
    colorBadge: "bg-amber-50 text-amber-800 border-amber-200",
    icon: Zap,
  },
  MANTENIMIENTO_LIMPIEZA: {
    label: "Mantenimiento & Limpieza",
    descripcion: "Condominio, aseo de áreas comunes, jardinería",
    colorBadge: "bg-teal-50 text-teal-800 border-teal-200",
    icon: Sparkles,
  },
  REPARACIONES: {
    label: "Reparaciones Técnicas",
    descripcion: "Plomería, bombas de agua, albañilería, electricidad",
    colorBadge: "bg-orange-50 text-orange-800 border-orange-200",
    icon: Wrench,
  },
  NOMINA_PERSONAL: {
    label: "Nómina & Personal",
    descripcion: "Vigilancia, conserjería, honorarios y jornales",
    colorBadge: "bg-indigo-50 text-indigo-800 border-indigo-200",
    icon: Users,
  },
  SUMINISTROS_OFICINA: {
    label: "Suministros & Materiales",
    descripcion: "Bombillos, ferretería, insumos de aseo y papelería",
    colorBadge: "bg-purple-50 text-purple-800 border-purple-200",
    icon: Package,
  },
  IMPUESTOS_TASAS: {
    label: "Impuestos & Tasas",
    descripcion: "Alcaldía, patentes de comercio, timbres fiscales",
    colorBadge: "bg-rose-50 text-rose-800 border-rose-200",
    icon: Landmark,
  },
  LEGAL_ADMINISTRATIVO: {
    label: "Legal & Notaría",
    descripcion: "Gastos legales, registros públicos, copias certificadas",
    colorBadge: "bg-slate-100 text-slate-800 border-slate-300",
    icon: Scale,
  },
  PUBLICIDAD_MARKETING: {
    label: "Publicidad & Marketing",
    descripcion: "Pendones, pauta digital, redes sociales y avisos",
    colorBadge: "bg-pink-50 text-pink-800 border-pink-200",
    icon: Megaphone,
  },
  ALQUILER_COBRANZA: {
    label: "Cobranza de Alquiler",
    descripcion: "Canon devengado de contratos activos",
    colorBadge: "bg-emerald-50 text-[#175E38] border-emerald-200",
    icon: Home,
  },
  ESTACIONAMIENTO: {
    label: "Estacionamiento",
    descripcion: "Cobro de puestos o tickets de estacionamiento",
    colorBadge: "bg-sky-50 text-sky-800 border-sky-200",
    icon: Car,
  },
  EVENTO_FERIA: {
    label: "Eventos & Ferias",
    descripcion: "Alquiler temporal de plazoleta o áreas comunes",
    colorBadge: "bg-violet-50 text-violet-800 border-violet-200",
    icon: Calendar,
  },
  OTRO: {
    label: "Otros Conceptos",
    descripcion: "Gastos o ingresos imprevistos y varios",
    colorBadge: "bg-slate-50 text-slate-700 border-slate-200",
    icon: HelpCircle,
  },
};

export const METODO_PAGO_CONFIG: Record<
  MetodoPago,
  { label: string; badgeClass: string }
> = {
  EFECTIVO_USD: {
    label: "Efectivo USD",
    badgeClass: "bg-emerald-50 text-emerald-800 border-emerald-200",
  },
  TRANSFERENCIA: {
    label: "Transferencia",
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

export const MESES = [
  { value: "1", label: "Enero" },
  { value: "2", label: "Febrero" },
  { value: "3", label: "Marzo" },
  { value: "4", label: "Abril" },
  { value: "5", label: "Mayo" },
  { value: "6", label: "Junio" },
  { value: "7", label: "Julio" },
  { value: "8", label: "Agosto" },
  { value: "9", label: "Septiembre" },
  { value: "10", label: "Octubre" },
  { value: "11", label: "Noviembre" },
  { value: "12", label: "Diciembre" },
];

export const CATEGORIAS_EGRESO: CategoriaTransaccion[] = [
  CategoriaTransaccion.SERVICIOS_PUBLICOS,
  CategoriaTransaccion.MANTENIMIENTO_LIMPIEZA,
  CategoriaTransaccion.REPARACIONES,
  CategoriaTransaccion.NOMINA_PERSONAL,
  CategoriaTransaccion.SUMINISTROS_OFICINA,
  CategoriaTransaccion.IMPUESTOS_TASAS,
  CategoriaTransaccion.LEGAL_ADMINISTRATIVO,
  CategoriaTransaccion.PUBLICIDAD_MARKETING,
  CategoriaTransaccion.OTRO,
];

export const CATEGORIAS_INGRESO: CategoriaTransaccion[] = [
  CategoriaTransaccion.ESTACIONAMIENTO,
  CategoriaTransaccion.EVENTO_FERIA,
  CategoriaTransaccion.OTRO,
];

export function formatearMontoUSD(monto: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(monto);
}
