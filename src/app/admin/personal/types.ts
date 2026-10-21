import { CargoEmpleado, EstadoAsistencia, PrioridadTarea, EstadoTarea } from "@prisma/client";

export interface EmpleadoItem {
  id: string;
  nombre: string;
  apellido: string | null;
  cedula: string;
  telefono: string;
  email: string | null;
  direccion: string | null;
  cargo: CargoEmpleado;
  cargoPersonalizado?: string | null;
  fechaIngreso: string;
  salarioMensual: number | null;
  activo: boolean;
  notas: string | null;
  propiedadId: string | null;
  propiedad?: {
    id: string;
    nombre: string;
    ciudad: string;
  } | null;
  usuarioId: string | null;
  usuario?: {
    id: string;
    email: string;
    rol: string;
    activo: boolean;
  } | null;
  asistenciaHoy?: RegistroAsistenciaItem | null;
  _count: {
    tareas: number;
    asistencias: number;
  };
  tareasPendientesCount: number;
  asistenciasCount: number;
  inasistenciasCount: number;
}

export interface RegistroAsistenciaItem {
  id: string;
  empleadoId: string;
  empleadoNombre?: string;
  empleadoCargo?: CargoEmpleado;
  fecha: string;
  horaEntrada: string;
  horaSalida: string | null;
  estado: EstadoAsistencia;
  ubicacionEntrada: string | null;
  ubicacionSalida: string | null;
  observaciones: string | null;
  createdAt: string;
}

export interface TareaEmpleadoItem {
  id: string;
  titulo: string;
  descripcion: string | null;
  empleadoId: string;
  empleadoNombre: string;
  empleadoCargo: CargoEmpleado;
  propiedadId: string | null;
  propiedadNombre: string | null;
  prioridad: PrioridadTarea;
  estado: EstadoTarea;
  fechaLimite: string | null;
  fechaCompletada: string | null;
  evidencias: string[];
  notasResolucion: string | null;
  requiereEvidencia: boolean;
  createdAt: string;
}

export interface PropiedadOpcion {
  id: string;
  nombre: string;
  tipo: string;
  ciudad: string;
}

export interface PersonalDashboardData {
  empleados: EmpleadoItem[];
  asistenciasHoy: RegistroAsistenciaItem[];
  tareas: TareaEmpleadoItem[];
  propiedades: PropiedadOpcion[];
  metricas: {
    totalEmpleados: number;
    activosCount: number;
    asistieronHoyCount: number;
    tareasPendientesCount: number;
    tareasCompletadasMesCount: number;
  };
}

// Helper para obtener fecha actual en formato YYYY-MM-DD respetando la zona horaria local
export function getFechaLocalHoy(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export const CARGO_CONFIG: Record<
  CargoEmpleado,
  {
    label: string;
    badgeClass: string;
    iconColor: string;
  }
> = {
  CONSERJE: {
    label: "Conserje",
    badgeClass: "bg-emerald-50 text-emerald-800 border-emerald-200",
    iconColor: "text-emerald-700",
  },
  TECNICO_MANTENIMIENTO: {
    label: "Mantenimiento",
    badgeClass: "bg-blue-50 text-blue-800 border-blue-200",
    iconColor: "text-blue-700",
  },
  ELECTRICISTA: {
    label: "Electricista",
    badgeClass: "bg-amber-50 text-amber-800 border-amber-200",
    iconColor: "text-amber-700",
  },
  PLOMERO: {
    label: "Plomero",
    badgeClass: "bg-cyan-50 text-cyan-800 border-cyan-200",
    iconColor: "text-cyan-700",
  },
  SEGURIDAD: {
    label: "Seguridad",
    badgeClass: "bg-slate-100 text-slate-800 border-slate-300",
    iconColor: "text-slate-700",
  },
  SUPERVISOR: {
    label: "Supervisor",
    badgeClass: "bg-indigo-50 text-indigo-800 border-indigo-200",
    iconColor: "text-indigo-700",
  },
  ADMINISTRATIVO: {
    label: "Administrativo",
    badgeClass: "bg-purple-50 text-purple-800 border-purple-200",
    iconColor: "text-purple-700",
  },
  OTRO: {
    label: "Otro",
    badgeClass: "bg-slate-50 text-slate-700 border-slate-200",
    iconColor: "text-slate-600",
  },
};

export function getCargoLabel(cargo: CargoEmpleado, cargoPersonalizado?: string | null): string {
  if (cargo === CargoEmpleado.OTRO && cargoPersonalizado && cargoPersonalizado.trim()) {
    return cargoPersonalizado.trim();
  }
  return CARGO_CONFIG[cargo]?.label || "Otro";
}

export const ESTADO_ASISTENCIA_CONFIG: Record<
  EstadoAsistencia,
  {
    label: string;
    badgeClass: string;
    dotColor: string;
  }
> = {
  PRESENTE: {
    label: "Presente",
    badgeClass: "bg-emerald-50 text-emerald-800 border-emerald-200",
    dotColor: "bg-emerald-600",
  },
  RETARDO: {
    label: "Presente",
    badgeClass: "bg-emerald-50 text-emerald-800 border-emerald-200",
    dotColor: "bg-emerald-600",
  },
  FALTA_JUSTIFICADA: {
    label: "Justificado",
    badgeClass: "bg-blue-50 text-blue-800 border-blue-200",
    dotColor: "bg-blue-500",
  },
  FALTA_INJUSTIFICADA: {
    label: "Ausente",
    badgeClass: "bg-rose-50 text-rose-800 border-rose-200",
    dotColor: "bg-rose-600",
  },
  PERMISO: {
    label: "Justificado",
    badgeClass: "bg-blue-50 text-blue-800 border-blue-200",
    dotColor: "bg-blue-500",
  },
};

export const PRIORIDAD_TAREA_CONFIG: Record<
  PrioridadTarea,
  {
    label: string;
    badgeClass: string;
  }
> = {
  BAJA: {
    label: "Baja",
    badgeClass: "bg-slate-100 text-slate-700 border-slate-200",
  },
  NORMAL: {
    label: "Normal",
    badgeClass: "bg-blue-50 text-blue-700 border-blue-200",
  },
  ALTA: {
    label: "Alta",
    badgeClass: "bg-amber-50 text-amber-800 border-amber-200",
  },
  URGENTE: {
    label: "Urgente",
    badgeClass: "bg-rose-50 text-rose-700 border-rose-200 font-bold",
  },
};

export const ESTADO_TAREA_CONFIG: Record<
  EstadoTarea,
  {
    label: string;
    badgeClass: string;
  }
> = {
  PENDIENTE: {
    label: "Pendiente",
    badgeClass: "bg-slate-100 text-slate-700 border-slate-300",
  },
  EN_PROCESO: {
    label: "En Curso",
    badgeClass: "bg-blue-50 text-blue-800 border-blue-200",
  },
  COMPLETADA: {
    label: "Completada",
    badgeClass: "bg-emerald-50 text-[#175E38] border-emerald-200",
  },
  CANCELADA: {
    label: "Cancelada",
    badgeClass: "bg-rose-50 text-rose-800 border-rose-200",
  },
};
