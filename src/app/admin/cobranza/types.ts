import type {
  EstadoPago,
  MetodoPago,
  MonedaTransaccion,
  TipoPropiedad,
  TipoUnidad,
  EstadoContrato,
  TipoPersona,
} from "@prisma/client";

// Tipo de dato para una transacción / abono individual dentro de una mensualidad (Libro Mayor 1:N)
export interface TransaccionPagoItem {
  id: string;
  pagoId: string;
  monto: number;
  monedaOriginal?: MonedaTransaccion | null;
  montoOriginal?: number | null;
  montoBs?: number | null;
  tasaBcv?: number | null;
  fechaPago: string;
  metodoPago: MetodoPago;
  referencia: string | null;
  comprobanteUrl: string | null;
  notas: string | null;
  createdAt: string;
}

// Tipo de dato para un registro de pago en las listas de cobranza
export interface PagoItem {
  id: string;
  contratoId: string;
  periodoMes: number;
  periodoAno: number;
  montoEsperado: number;
  montoPagado: number;
  monedaOriginal?: MonedaTransaccion | null;
  montoOriginal?: number | null;
  montoBs?: number | null;
  tasaBcv?: number | null;
  fechaVencimiento: string;
  fechaPago: string | null;
  metodoPago: MetodoPago | null;
  referencia: string | null;
  comprobanteUrl: string | null;
  estado: EstadoPago;
  notas: string | null;
  // Control de Servicios Públicos (Fase 27)
  luzSolvente?: boolean;
  luzNumeroFactura?: string | null;
  luzComprobanteUrl?: string | null;
  aguaSolvente?: boolean;
  aguaNumeroFactura?: string | null;
  aguaComprobanteUrl?: string | null;
  serviciosObservaciones?: string | null;
  fechaRevisionServicios?: string | null;
  anteriorImpago?: {
    mes: number;
    ano: number;
    saldo: number;
  } | null;
  createdAt: string;
  updatedAt: string;
  transacciones?: TransaccionPagoItem[];
  contrato: {
    id: string;
    codigo: string;
    diaCobro: number;
    moneda: string;
    fechaInicio?: string;
    fechaFin?: string;
    montoAlquiler?: number;
    depositoGarantia?: number | null;
    estado?: EstadoContrato;
    documentoUrl?: string | null;
    notas?: string | null;
    unidad: {
      id: string;
      codigo: string;
      tipo?: TipoUnidad;
      piso?: string | null;
      areaMt2?: number | null;
      precioAlquiler?: number | null;
      descripcion?: string | null;
      imagenes?: string[];
      propiedad: {
        id: string;
        nombre: string;
        tipo?: TipoPropiedad;
        direccion?: string;
        ciudad?: string;
        propietario?: string | null;
        telefonoContacto?: string | null;
      };
    };
    inquilino: {
      id: string;
      nombre: string;
      apellido: string | null;
      documentoIdentidad: string;
      telefono: string;
      telefonoSecundario?: string | null;
      email?: string | null;
      tipoPersona?: TipoPersona;
      direccion?: string | null;
    };
  };
}

// Resumen financiero ejecutivo del periodo seleccionado
export interface EstadisticasCobranza {
  totalFacturado: number;
  totalRecaudado: number;
  totalPorCobrar: number;
  totalEnMora: number;
  cantidadTotal: number;
  cantidadTotalGlobal?: number;
  cantidadPagados: number;
  cantidadPendientes: number;
  cantidadVencidos: number;
  cantidadParciales: number;
  cantidadPorConfirmar?: number;
  cantidadPorConfirmarGlobal?: number;
  porcentajeRecaudado: number;
  conteoPorPropiedad?: Record<string, number>;
  // Métricas agregadas de Morosidad Histórica (Fase 25)
  morosidadHistoricaTotal?: number;
  morosidadHistoricaCuotas?: number;
  morosidadHistoricaInquilinos?: number;
}

// Filtros para la consulta de cobranza
export interface FiltrosCobranza {
  mes: number;
  ano: number;
  propiedadId?: string;
  estado?: EstadoPago | "TODOS" | "POR_CONFIRMAR" | "MOROSOS_HISTORICOS";
  busqueda?: string;
  pagina?: number;
  forzarSincronizacion?: boolean;
  modoMorososHistoricos?: boolean;
}

// Propiedad simplificada para el selector de filtros
export interface PropiedadOpcion {
  id: string;
  nombre: string;
  ciudad?: string | null;
  tipo?: TipoPropiedad;
}
