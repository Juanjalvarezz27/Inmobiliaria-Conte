import {
  TipoTransaccionFinanciera,
  CategoriaTransaccion,
  MetodoPago,
  TipoPropiedad,
  TipoUnidad,
} from "@prisma/client";

export interface TransaccionFinancieraItem {
  id: string;
  tipo: TipoTransaccionFinanciera;
  categoria: CategoriaTransaccion;
  concepto: string;
  monto: number;
  fecha: string;
  periodoMes: number;
  periodoAno: number;
  metodoPago: MetodoPago;
  referencia: string | null;
  beneficiario: string | null;
  comprobanteUrl: string | null;
  notas: string | null;
  propiedadId: string | null;
  unidadId: string | null;
  propiedad: {
    id: string;
    nombre: string;
    tipo: TipoPropiedad;
    ciudad: string;
  } | null;
  unidad: {
    id: string;
    codigo: string;
    tipo: TipoUnidad;
  } | null;
  createdAt: string;
}

export interface CategoriaDesglose {
  categoria: CategoriaTransaccion;
  label: string;
  total: number;
  conteo: number;
  porcentaje: number;
}

export interface DiaFinancieroMes {
  dia: number;
  ingresos: number;
  egresos: number;
  conteoIngresos: number;
  conteoEgresos: number;
}

export interface EstadisticasFinanzas {
  totalIngresos: number;
  totalIngresosAlquiler: number;
  totalIngresosExtra: number;
  totalEgresos: number;
  balanceNeto: number;
  margenOperativo: number;
  conteoCobranzas: number;
  conteoEgresos: number;
  conteoIngresosExtra: number;
  desgloseEgresosPorCategoria: CategoriaDesglose[];
  diasDelMes: DiaFinancieroMes[];
  diasEnMes: number;
}

export interface PropiedadFinanzasOpcion {
  id: string;
  nombre: string;
  tipo: TipoPropiedad;
  ciudad: string;
  totalEgresos: number;
  totalIngresos: number;
  count: number;
}

export interface FiltrosFinanzas {
  mes: number;
  ano: number;
  propiedadId?: string;
  tipo?: string;
  categoria?: string;
  busqueda?: string;
  pagina?: number;
}

export interface FinanzasDataResponse {
  transacciones: TransaccionFinancieraItem[];
  estadisticas: EstadisticasFinanzas;
  totalRegistros: number;
  totalPaginas: number;
  paginaActual: number;
}

export interface MovimientoIngresoDetalle {
  id: string;
  tipo: "ALQUILER" | "EXTRA";
  concepto: string;
  monto: number;
  fecha: string;
  dia: number;
  inquilinoNombre?: string | null;
  inquilinoDocumento?: string | null;
  contratoCodigo?: string | null;
  propiedadNombre?: string | null;
  unidadCodigo?: string | null;
  metodoPago?: string | null;
  referencia?: string | null;
  comprobanteUrl?: string | null;
  notas?: string | null;
  transaccionOriginal?: TransaccionFinancieraItem | null;
}

export interface MovimientoEgresoDetalle {
  id: string;
  concepto: string;
  categoria: CategoriaTransaccion;
  categoriaLabel: string;
  categoriaBadge: string;
  monto: number;
  fecha: string;
  dia: number;
  beneficiario?: string | null;
  propiedadNombre?: string | null;
  unidadCodigo?: string | null;
  metodoPago?: string | null;
  referencia?: string | null;
  comprobanteUrl?: string | null;
  notas?: string | null;
  transaccionOriginal: TransaccionFinancieraItem;
}

export interface MovimientosPeriodoResponse {
  ingresos: MovimientoIngresoDetalle[];
  egresos: MovimientoEgresoDetalle[];
  totalIngresos: number;
  totalEgresos: number;
  conteoIngresos: number;
  conteoEgresos: number;
}

