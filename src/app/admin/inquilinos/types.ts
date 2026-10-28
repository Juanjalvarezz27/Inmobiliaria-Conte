import { EstadoPago, TipoPersona } from "@prisma/client";

// Tipo para el inquilino con sus contratos activos y datos proyectados
export type InquilinoConContratos = {
  id: string;
  nombre: string;
  apellido: string | null;
  tipoPersona: TipoPersona;
  documentoIdentidad: string;
  telefono: string;
  telefonoSecundario: string | null;
  email: string | null;
  direccion: string | null;
  activo: boolean;
  usuarioId?: string | null;
  usuario?: {
    id: string;
    email: string;
    activo: boolean;
    mustChangePassword: boolean;
  } | null;
  createdAt: Date;
  updatedAt: Date;
  _count: {
    contratos: number;
  };
  contratos: Array<{
    id: string;
    codigo: string;
    montoAlquiler: number;
    fechaFin: Date;
    unidad: {
      id: string;
      codigo: string;
      tipo: string;
      propiedad: {
        id: string;
        nombre: string;
        ciudad: string;
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
    }>;
  }>;
};

export type InquilinosStats = {
  total: number;
  activos: number;
  archivados?: number;
  conContratosActivos: number;
  sinContrato: number;
};

export type ModalMode = "crear" | "editar" | "eliminar" | "archivar" | "reactivar" | "detalle" | "acceso" | null;

export interface InquilinosClientProps {
  inquilinos: InquilinoConContratos[];
  stats: InquilinosStats;
}
