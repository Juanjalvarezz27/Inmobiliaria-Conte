import { TipoPropiedad, TipoUnidad, EstadoUnidad, EstadoContrato, TipoPersona } from "@prisma/client";

// Tipos compartidos para el módulo de Propiedades y Espacios

export type PropiedadConConteo = {
  id: string;
  nombre: string;
  tipo: TipoPropiedad;
  direccion: string;
  ciudad: string;
  descripcion: string | null;
  numPisos: number | null;
  areaTotalM2: number | null;
  propietario: string | null;
  telefonoContacto: string | null;
  activo?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
  _count: { unidades: number };
};

export type InquilinoContratoResumen = {
  id: string;
  nombre: string;
  apellido: string | null;
  tipoPersona: TipoPersona;
  documentoIdentidad: string;
  telefono: string;
  email: string | null;
};

export type ContratoResumenUnidad = {
  id: string;
  codigo: string;
  estado: EstadoContrato;
  fechaInicio: Date | string;
  fechaFin: Date | string;
  montoAlquiler: number;
  moneda: string;
  inquilino: InquilinoContratoResumen;
};

export type UnidadConPropiedad = {
  id: string;
  codigo: string;
  tipo: TipoUnidad;
  piso: string | null;
  areaMt2: number | null;
  precioAlquiler: number | null;
  descripcion: string | null;
  estado: EstadoUnidad;
  imagenes: string[];
  propiedadId: string;
  createdAt?: Date;
  updatedAt?: Date;
  propiedad: {
    id: string;
    nombre: string;
    tipo: TipoPropiedad;
    ciudad: string;
  };
  contratos?: ContratoResumenUnidad[];
  _count?: { contratos: number };
};

export type Stats = {
  totalPropiedades: number;
  totalUnidades: number;
  disponibles: number;
  ocupadas: number;
  tasaOcupacion: number;
};

export interface PropiedadesClientProps {
  propiedades: PropiedadConConteo[];
  unidades: UnidadConPropiedad[];
  stats: Stats;
}

export type Tab = "propiedades" | "unidades";
export type ModalMode = "crear" | "editar" | "eliminar" | "detalle" | null;
