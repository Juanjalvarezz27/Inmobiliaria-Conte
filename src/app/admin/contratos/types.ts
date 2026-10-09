import {
  EstadoContrato,
  EstadoDeposito,
  EstadoPago,
  EstadoUnidad,
  MetodoPago,
  TipoPersona,
  TipoPropiedad,
  TipoUnidad,
} from "@prisma/client";

// Tipo proyectado para el contrato con sus relaciones
export type ContratoConRelaciones = {
  id: string;
  codigo: string;
  fechaInicio: Date;
  fechaFin: Date;
  diaCobro: number;
  montoAlquiler: number;
  depositoGarantia: number | null;
  depositoEstado: EstadoDeposito;
  depositoFechaCobro: Date | null;
  depositoMetodoPago: MetodoPago | null;
  depositoReferencia: string | null;
  depositoComprobanteUrl: string | null;
  depositoNotas: string | null;
  depositoFechaLiquidacion: Date | null;
  depositoMontoReembolsado: number | null;
  depositoMontoRetenido: number | null;
  depositoMetodoPagoLiquidacion: MetodoPago | null;
  depositoReferenciaLiquidacion: string | null;
  depositoMotivoLiquidacion: string | null;
  depositoComprobanteLiquidacionUrl: string | null;
  moneda: string;
  estado: EstadoContrato;
  documentoUrl: string | null;
  notas: string | null;
  createdAt: Date;
  updatedAt: Date;
  inquilino: {
    id: string;
    nombre: string;
    apellido: string | null;
    tipoPersona: TipoPersona;
    documentoIdentidad: string;
    telefono: string;
    email: string | null;
  };
  unidad: {
    id: string;
    codigo: string;
    tipo: TipoUnidad;
    piso: string | null;
    areaMt2: number | null;
    propiedad: {
      id: string;
      nombre: string;
      ciudad: string;
      direccion: string;
      tipo: TipoPropiedad;
    };
  };
  pagos?: Array<{
    id: string;
    periodoMes: number;
    periodoAno: number;
    montoEsperado: number;
    montoPagado: number;
    estado: EstadoPago;
    fechaVencimiento: Date;
    fechaPago: Date | null;
    metodoPago: MetodoPago | null;
    referencia: string | null;
    comprobanteUrl: string | null;
  }>;
  _count?: {
    pagos: number;
  };
};

export type ContratosStats = {
  total: number;
  activos: number;
  porVencer: number;
  finalizados: number;
};

export type UnidadDisponible = {
  id: string;
  codigo: string;
  tipo: TipoUnidad;
  estado: EstadoUnidad;
  piso: string | null;
  areaMt2: number | null;
  precioAlquiler: number | null;
  propiedad: {
    id: string;
    nombre: string;
    ciudad: string;
    tipo: TipoPropiedad;
  };
};

export type InquilinoSelector = {
  id: string;
  nombre: string;
  apellido: string | null;
  tipoPersona: TipoPersona;
  documentoIdentidad: string;
  telefono: string;
};

export type ModalMode =
  | "crear"
  | "editar"
  | "eliminar"
  | "detalle"
  | "finalizar"
  | "rescindir"
  | null;

export type PropiedadItem = {
  id: string;
  nombre: string;
  ciudad: string;
  tipo: TipoPropiedad;
  direccion?: string | null;
  descripcion?: string | null;
  _count?: { unidades: number };
};

export interface ContratosClientProps {
  contratos: ContratoConRelaciones[];
  stats: ContratosStats;
  unidadesDisponibles: UnidadDisponible[];
  inquilinos: InquilinoSelector[];
  propiedades?: PropiedadItem[];
  inquilinoIdPreseleccionado?: string;
  unidadIdPreseleccionada?: string;
  abrirCrear?: boolean;
  initialSearch?: string;
}
