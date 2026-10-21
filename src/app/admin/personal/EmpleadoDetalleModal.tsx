"use client";

import React, { useState, useMemo, useRef, useEffect } from "react";
import {
  User,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Plus,
  Building2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Eye,
  Camera,
  Layers,
  Search,
  Check,
  FileText,
  Briefcase,
  UserX,
  Loader2,
  Wrench,
  Zap,
  Droplets,
  Shield,
} from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { StatCard } from "@/components/ui/stat-card";
import { FilterDropdown, type FilterDropdownOption } from "@/components/ui/filter-dropdown";
import { WhatsAppIcon } from "@/components/icons/whatsapp-icon";
import { EstadoTarea, EstadoAsistencia, CargoEmpleado } from "@prisma/client";
import { obtenerHistorialAsistenciaEmpleadoAction } from "@/lib/actions/personal";
import {
  CARGO_CONFIG,
  ESTADO_ASISTENCIA_CONFIG,
  ESTADO_TAREA_CONFIG,
  getCargoLabel,
  type EmpleadoItem,
  type TareaEmpleadoItem,
  type RegistroAsistenciaItem,
} from "./types";

interface EmpleadoDetalleModalProps {
  isOpen: boolean;
  onClose: () => void;
  empleado: EmpleadoItem | null;
  tareasEmpleado: TareaEmpleadoItem[];
  asistenciasEmpleado?: RegistroAsistenciaItem[];
  onAsignarTarea: (emp: EmpleadoItem) => void;
  onRegistrarAsistencia: (emp: EmpleadoItem) => void;
  onEditarAsistencia?: (emp: EmpleadoItem, registro: RegistroAsistenciaItem) => void;
  onSeleccionarTarea: (tarea: TareaEmpleadoItem) => void;
  onVerFoto?: (url: string) => void;
  scrollToSeccion?: "TAREAS" | "ASISTENCIAS" | null;
}

const ITEMS_POR_PAGINA = 10;

type FiltroTareasTipo = "TODAS" | "ACTIVAS" | "COMPLETADAS" | "CANCELADAS";
type VistaFicha = "TAREAS" | "ASISTENCIAS" | "INASISTENCIAS";

function formatearFechaEspanol(fechaIso: string): string {
  try {
    const raw = fechaIso.split("T")[0];
    const [y, m, d] = raw.split("-").map(Number);
    const date = new Date(y, m - 1, d, 12, 0, 0);
    const str = date.toLocaleDateString("es-VE", {
      weekday: "long",
      day: "numeric",
      month: "short",
      year: "numeric",
    });
    return str.charAt(0).toUpperCase() + str.slice(1);
  } catch {
    return fechaIso.split("T")[0];
  }
}

function formatearHora(horaIso?: string | null): string {
  if (!horaIso) return "--:--";
  try {
    const date = new Date(horaIso);
    return date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "--:--";
  }
}

function PaginacionLocal({
  paginaActual,
  totalPaginas,
  totalItems,
  indiceInicio,
  itemsPorPagina,
  itemLabel,
  onCambiarPagina,
}: {
  paginaActual: number;
  totalPaginas: number;
  totalItems: number;
  indiceInicio: number;
  itemsPorPagina: number;
  itemLabel: string;
  onCambiarPagina: (pag: number) => void;
}) {
  if (totalPaginas <= 1) return null;

  // Rango de páginas visible compacto con elipses para prevenir desbordes
  const obtenerPaginasVisibles = () => {
    if (totalPaginas <= 5) {
      return Array.from({ length: totalPaginas }, (_, i) => i + 1);
    }
    if (paginaActual <= 3) {
      return [1, 2, 3, 4, "...", totalPaginas];
    }
    if (paginaActual >= totalPaginas - 2) {
      return [1, "...", totalPaginas - 3, totalPaginas - 2, totalPaginas - 1, totalPaginas];
    }
    return [1, "...", paginaActual - 1, paginaActual, paginaActual + 1, "...", totalPaginas];
  };

  const paginas = obtenerPaginasVisibles();

  return (
    <div className="p-3 rounded-2xl bg-white border border-slate-200/80 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-2 text-xs">
      <span className="text-slate-500 text-[11px]">
        Mostrando{" "}
        <strong className="text-slate-800 font-bold">{indiceInicio + 1}</strong> a{" "}
        <strong className="text-slate-800 font-bold">
          {Math.min(indiceInicio + itemsPorPagina, totalItems)}
        </strong>{" "}
        de <strong className="text-slate-800 font-bold">{totalItems}</strong> {itemLabel}
      </span>

      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => onCambiarPagina(Math.max(1, paginaActual - 1))}
          disabled={paginaActual === 1}
          className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center gap-1 font-bold text-xs shadow-2xs cursor-pointer"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Anterior</span>
        </button>

        <div className="flex items-center gap-1">
          {paginas.map((item, idx) => {
            if (item === "...") {
              return (
                <span
                  key={`dots-${idx}`}
                  className="w-7 text-center text-slate-400 font-bold text-xs select-none"
                >
                  ···
                </span>
              );
            }
            const pag = item as number;
            const activa = pag === paginaActual;
            return (
              <button
                key={pag}
                type="button"
                onClick={() => onCambiarPagina(pag)}
                className={`w-7 h-7 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activa
                    ? "bg-[#175E38] text-white shadow-2xs"
                    : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/70"
                }`}
              >
                {pag}
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => onCambiarPagina(Math.min(totalPaginas, paginaActual + 1))}
          disabled={paginaActual === totalPaginas}
          className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center gap-1 font-bold text-xs shadow-2xs cursor-pointer"
        >
          <span className="hidden sm:inline">Siguiente</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

// Icono temático según el cargo operativo
function getCargoIcon(cargo: CargoEmpleado) {
  switch (cargo) {
    case CargoEmpleado.CONSERJE:
      return <Briefcase className="w-3.5 h-3.5 shrink-0" />;
    case CargoEmpleado.TECNICO_MANTENIMIENTO:
      return <Wrench className="w-3.5 h-3.5 shrink-0" />;
    case CargoEmpleado.ELECTRICISTA:
      return <Zap className="w-3.5 h-3.5 shrink-0" />;
    case CargoEmpleado.PLOMERO:
      return <Droplets className="w-3.5 h-3.5 shrink-0" />;
    case CargoEmpleado.SEGURIDAD:
      return <Shield className="w-3.5 h-3.5 shrink-0" />;
    case CargoEmpleado.SUPERVISOR:
      return <User className="w-3.5 h-3.5 shrink-0" />;
    case CargoEmpleado.ADMINISTRATIVO:
      return <FileText className="w-3.5 h-3.5 shrink-0" />;
    default:
      return <Briefcase className="w-3.5 h-3.5 shrink-0" />;
  }
}

// Colores del avatar según el cargo del trabajador
function getCargoAvatarColors(cargo: CargoEmpleado) {
  switch (cargo) {
    case CargoEmpleado.ELECTRICISTA:
      return "bg-amber-100 text-amber-900 border-amber-200/90";
    case CargoEmpleado.TECNICO_MANTENIMIENTO:
    case CargoEmpleado.PLOMERO:
      return "bg-blue-100 text-blue-900 border-blue-200/90";
    case CargoEmpleado.SUPERVISOR:
      return "bg-indigo-100 text-indigo-900 border-indigo-200/90";
    case CargoEmpleado.ADMINISTRATIVO:
      return "bg-purple-100 text-purple-900 border-purple-200/90";
    case CargoEmpleado.SEGURIDAD:
      return "bg-slate-200 text-slate-800 border-slate-300";
    case CargoEmpleado.CONSERJE:
    default:
      return "bg-emerald-100 text-[#175E38] border-emerald-200/90";
  }
}

// Extrae las iniciales del trabajador
function getInitials(nombre: string, apellido?: string | null): string {
  const n = (nombre || "").trim();
  const a = (apellido || "").trim();
  if (n && a) {
    return `${n.charAt(0)}${a.charAt(0)}`.toUpperCase();
  }
  if (n) {
    const parts = n.split(/\s+/);
    if (parts.length >= 2) {
      return `${parts[0].charAt(0)}${parts[1].charAt(0)}`.toUpperCase();
    }
    return n.slice(0, 2).toUpperCase();
  }
  return "TR";
}

export function EmpleadoDetalleModal({
  isOpen,
  onClose,
  empleado: emp,
  tareasEmpleado,
  asistenciasEmpleado,
  onAsignarTarea,
  onRegistrarAsistencia,
  onEditarAsistencia,
  onSeleccionarTarea,
  onVerFoto,
  scrollToSeccion,
}: EmpleadoDetalleModalProps) {
  // Pestaña activa dentro de la ficha del colaborador
  const [vistaActiva, setVistaActiva] = useState<VistaFicha>("TAREAS");

  // Historial dinámico de asistencias e inasistencias
  const [historialCompleto, setHistorialCompleto] = useState<RegistroAsistenciaItem[]>([]);
  const [cargandoHistorial, setCargandoHistorial] = useState(false);

  // Estados para filtro y paginación
  const [filtroTipo, setFiltroTipo] = useState<FiltroTareasTipo>("TODAS");
  const [busquedaTarea, setBusquedaTarea] = useState("");
  const [paginaTareas, setPaginaTareas] = useState(1);
  const [paginaAsistencias, setPaginaAsistencias] = useState(1);
  const [paginaInasistencias, setPaginaInasistencias] = useState(1);
  const [dropdownFiltroOpen, setDropdownFiltroOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const seccionTabsRef = useRef<HTMLDivElement>(null);

  // Cerrar dropdown al hacer clic fuera o pulsar Escape
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownFiltroOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setDropdownFiltroOpen(false);
    }
    if (dropdownFiltroOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [dropdownFiltroOpen]);

  // Resetear página de tareas al cambiar filtro o búsqueda
  useEffect(() => {
    setPaginaTareas(1);
  }, [filtroTipo, busquedaTarea]);

  // Cargar historial de asistencias e inasistencias al abrir la ficha del empleado
  useEffect(() => {
    if (isOpen && emp?.id) {
      let isMounted = true;
      setCargandoHistorial(true);
      obtenerHistorialAsistenciaEmpleadoAction(emp.id)
        .then((res) => {
          if (isMounted && res.success && res.data) {
            setHistorialCompleto(res.data);
          }
        })
        .finally(() => {
          if (isMounted) setCargandoHistorial(false);
        });
      return () => {
        isMounted = false;
      };
    } else {
      setHistorialCompleto([]);
    }
  }, [isOpen, emp?.id]);

  // Clasificación de jornadas
  const listaAsistencias = useMemo(() => {
    return historialCompleto.filter(
      (r) => r.estado === EstadoAsistencia.PRESENTE || r.estado === EstadoAsistencia.RETARDO
    );
  }, [historialCompleto]);

  const listaInasistencias = useMemo(() => {
    return historialCompleto.filter(
      (r) =>
        r.estado === EstadoAsistencia.FALTA_INJUSTIFICADA ||
        r.estado === EstadoAsistencia.FALTA_JUSTIFICADA ||
        r.estado === EstadoAsistencia.PERMISO
    );
  }, [historialCompleto]);

  const totalAsistenciasCount = historialCompleto.length > 0
    ? listaAsistencias.length
    : (emp?.asistenciasCount ?? emp?._count.asistencias ?? 0);

  const totalInasistenciasCount = historialCompleto.length > 0
    ? listaInasistencias.length
    : (emp?.inasistenciasCount ?? 0);

  // Opciones para el selector desplegable de vista en móviles
  const opcionesVistas: FilterDropdownOption[] = useMemo(
    () => [
      {
        value: "TAREAS",
        label: "Órdenes de Trabajo",
        icon: Briefcase,
        count: tareasEmpleado.length,
      },
      {
        value: "ASISTENCIAS",
        label: "Historial de Asistencias",
        icon: CheckCircle2,
        iconClassName: "text-[#175E38]",
        count: totalAsistenciasCount,
      },
      {
        value: "INASISTENCIAS",
        label: "Inasistencias y Faltas",
        icon: UserX,
        iconClassName: "text-rose-600",
        count: totalInasistenciasCount,
      },
    ],
    [tareasEmpleado.length, totalAsistenciasCount, totalInasistenciasCount]
  );

  // Limpieza al cambiar de empleado o cerrar modal
  useEffect(() => {
    if (!isOpen) {
      setPaginaTareas(1);
      setPaginaAsistencias(1);
      setPaginaInasistencias(1);
      setBusquedaTarea("");
      setFiltroTipo("TODAS");
      setDropdownFiltroOpen(false);
      setVistaActiva("TAREAS");
    }
  }, [isOpen, emp?.id]);

  // Auto-scroll suave a la sección solicitada (por ejemplo, Tareas al hacer clic en la tarjeta)
  useEffect(() => {
    if (isOpen && scrollToSeccion === "TAREAS") {
      setVistaActiva("TAREAS");
      const timer = setTimeout(() => {
        seccionTabsRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [isOpen, scrollToSeccion, emp?.id]);

  // Conteo de tareas por categoría
  const countTotal = tareasEmpleado.length;
  const countActivas = tareasEmpleado.filter(
    (t) => t.estado === EstadoTarea.PENDIENTE || t.estado === EstadoTarea.EN_PROCESO
  ).length;
  const countCompletadas = tareasEmpleado.filter((t) => t.estado === EstadoTarea.COMPLETADA).length;
  const countCanceladas = tareasEmpleado.filter((t) => t.estado === EstadoTarea.CANCELADA).length;

  // Filtrado de tareas
  const tareasFiltradas = useMemo(() => {
    return tareasEmpleado.filter((t) => {
      if (filtroTipo === "ACTIVAS") {
        if (t.estado !== EstadoTarea.PENDIENTE && t.estado !== EstadoTarea.EN_PROCESO) return false;
      } else if (filtroTipo === "COMPLETADAS") {
        if (t.estado !== EstadoTarea.COMPLETADA) return false;
      } else if (filtroTipo === "CANCELADAS") {
        if (t.estado !== EstadoTarea.CANCELADA) return false;
      }

      if (busquedaTarea.trim()) {
        const query = busquedaTarea.toLowerCase();
        const titulo = t.titulo.toLowerCase();
        const desc = (t.descripcion || "").toLowerCase();
        const prop = (t.propiedadNombre || "").toLowerCase();
        if (!titulo.includes(query) && !desc.includes(query) && !prop.includes(query)) return false;
      }

      return true;
    });
  }, [tareasEmpleado, filtroTipo, busquedaTarea]);

  // Paginación local de 10 en 10 para Órdenes de Trabajo
  const totalPaginasTareas = Math.ceil(tareasFiltradas.length / ITEMS_POR_PAGINA) || 1;
  const indiceInicioTareas = (paginaTareas - 1) * ITEMS_POR_PAGINA;
  const tareasPaginadas = tareasFiltradas.slice(
    indiceInicioTareas,
    indiceInicioTareas + ITEMS_POR_PAGINA
  );

  // Paginación local de 10 en 10 para Asistencias
  const totalPaginasAsistencias = Math.ceil(listaAsistencias.length / ITEMS_POR_PAGINA) || 1;
  const indiceInicioAsistencias = (paginaAsistencias - 1) * ITEMS_POR_PAGINA;
  const asistenciasPaginadas = listaAsistencias.slice(
    indiceInicioAsistencias,
    indiceInicioAsistencias + ITEMS_POR_PAGINA
  );

  // Paginación local de 10 en 10 para Inasistencias
  const totalPaginasInasistencias = Math.ceil(listaInasistencias.length / ITEMS_POR_PAGINA) || 1;
  const indiceInicioInasistencias = (paginaInasistencias - 1) * ITEMS_POR_PAGINA;
  const inasistenciasPaginadas = listaInasistencias.slice(
    indiceInicioInasistencias,
    indiceInicioInasistencias + ITEMS_POR_PAGINA
  );


  // Opciones del selector híbrido
  const opcionesFiltro = [
    { value: "TODAS" as FiltroTareasTipo, label: "Todas las tareas", count: countTotal },
    { value: "ACTIVAS" as FiltroTareasTipo, label: "Presentes / Activas", count: countActivas },
    { value: "COMPLETADAS" as FiltroTareasTipo, label: "Pasadas / Completadas", count: countCompletadas },
    { value: "CANCELADAS" as FiltroTareasTipo, label: "Canceladas", count: countCanceladas },
  ];

  const opcionSeleccionada = opcionesFiltro.find((o) => o.value === filtroTipo) || opcionesFiltro[0];

  // Si no hay empleado preseleccionado, evitar renderizado
  if (!emp) return null;

  const cargoConfig = CARGO_CONFIG[emp.cargo] || CARGO_CONFIG.OTRO;
  const cargoNombre = getCargoLabel(emp.cargo, emp.cargoPersonalizado);
  const nombreCompleto = `${emp.nombre} ${emp.apellido || ""}`.trim();
  const cleanPhone = emp.telefono.replace(/[^\d+]/g, "");
  const waUrl = cleanPhone ? `https://wa.me/${cleanPhone.replace("+", "")}` : null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Ficha Integral del Trabajador"
      subtitle={`${nombreCompleto} • ${cargoNombre}`}
      icon={User}
      headerVariant="green"
      maxWidth="4xl"
    >
      <div className="space-y-6">
        {/* Cabecera Principal de Identidad */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-4">
          {/* Fila Superior: Avatar + Nombre + Badges + Acciones Rápidas en Desktop */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5">
            <div className="flex items-center gap-3.5 min-w-0">
              {/* Avatar Temático con Iniciales */}
              <div
                className={`w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center font-heading font-black text-sm sm:text-base shrink-0 border shadow-2xs ${getCargoAvatarColors(
                  emp.cargo
                )}`}
              >
                {getInitials(emp.nombre, emp.apellido)}
              </div>

              <div className="min-w-0 flex-1 space-y-1">
                <h2 className="text-lg sm:text-xl font-black font-heading text-slate-900 tracking-tight truncate">
                  {nombreCompleto}
                </h2>

                {/* Badges de Identidad en línea limpia y balanceada */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-bold rounded-lg border shadow-2xs ${cargoConfig.badgeClass}`}
                  >
                    {getCargoIcon(emp.cargo)}
                    <span>{cargoNombre}</span>
                  </span>

                  <span className="text-xs font-bold text-slate-600 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded-md font-mono shadow-2xs">
                    {emp.cedula}
                  </span>

                  {!emp.activo && (
                    <span className="text-[11px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-md">
                      Inactivo
                    </span>
                  )}

                  {emp.asistenciaHoy ? (
                    <span
                      className={`inline-flex items-center gap-1.5 text-[11px] font-bold px-2 py-0.5 rounded-md border shadow-2xs ${
                        ESTADO_ASISTENCIA_CONFIG[emp.asistenciaHoy.estado].badgeClass
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          ESTADO_ASISTENCIA_CONFIG[emp.asistenciaHoy.estado].dotColor
                        }`}
                      />
                      Hoy: {ESTADO_ASISTENCIA_CONFIG[emp.asistenciaHoy.estado].label}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-[11px] font-bold px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200 shadow-2xs">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                      Hoy: Sin marcar
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Acciones Rápidas en Desktop (alineadas a la derecha) */}
            <div className="hidden sm:flex sm:items-center sm:gap-2 shrink-0">
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onRegistrarAsistencia(emp);
                }}
                className="h-9.5 px-3.5 rounded-xl text-xs font-bold bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 hover:border-slate-300 transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs active:translate-y-0.5"
                title="Registrar o verificar asistencia del día"
              >
                <Clock className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                <span>Asistencia</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onAsignarTarea(emp);
                }}
                className="h-9.5 px-4 rounded-xl text-xs font-bold bg-gradient-to-r from-[#175E38] to-[#124b2d] text-white hover:bg-[#124b2d] border-b-[3px] border-b-[#0e3a23] transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-[0_2px_6px_rgba(23,94,56,0.3)] active:translate-y-0.5"
              >
                <Plus className="w-3.5 h-3.5 stroke-[2.5] shrink-0" />
                <span>Asignar Tarea</span>
              </button>
            </div>
          </div>

          {/* Datos del Colaborador (Distribución fluida sin cajas anidadas) */}
          <div className="pt-3.5 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-xs">
            {/* Teléfono & WhatsApp */}
            <div className="flex items-center gap-2 min-w-0 text-slate-700">
              <div className="w-7 h-7 rounded-lg bg-emerald-50 text-[#175E38] flex items-center justify-center shrink-0">
                <Phone className="w-3.5 h-3.5" />
              </div>
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="font-semibold text-slate-800 truncate select-all">
                  {emp.telefono}
                </span>
                {waUrl && (
                  <a
                    href={waUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-[#25D366]/10 text-[#128C7E] hover:bg-[#25D366]/20 font-bold text-[11px] hover:scale-105 active:scale-95 transition-all shrink-0 border border-[#25D366]/20"
                    title="Contactar vía WhatsApp"
                  >
                    <WhatsAppIcon className="w-3 h-3 text-[#25D366]" />
                    <span>WhatsApp</span>
                  </a>
                )}
              </div>
            </div>

            {/* Inmueble Asignado */}
            <div className="flex items-center gap-2 min-w-0 text-slate-700">
              <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center shrink-0">
                <Building2 className="w-3.5 h-3.5" />
              </div>
              <div className="min-w-0 truncate">
                <span className="font-semibold text-slate-800">
                  {emp.propiedad ? emp.propiedad.nombre : "Sede Central / Multipropiedad"}
                </span>
                {emp.propiedad?.ciudad && (
                  <span className="text-slate-400 font-normal ml-1">
                    • {emp.propiedad.ciudad}
                  </span>
                )}
              </div>
            </div>

            {/* Correo Electrónico */}
            <div className="flex items-center gap-2 min-w-0 text-slate-700">
              <div className="w-7 h-7 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
                <Mail className="w-3.5 h-3.5" />
              </div>
              <span
                className="font-semibold text-slate-800 truncate"
                title={emp.email || "Sin correo corporativo"}
              >
                {emp.email || "Sin correo corporativo"}
              </span>
            </div>

            {/* Ingreso y Honorarios */}
            <div className="flex items-center justify-between gap-2 min-w-0">
              <div className="flex items-center gap-2 min-w-0 text-slate-700">
                <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center shrink-0">
                  <Calendar className="w-3.5 h-3.5" />
                </div>
                <span className="text-slate-600">
                  Ingreso:{" "}
                  <strong className="text-slate-800 font-semibold">
                    {new Date(emp.fechaIngreso).toLocaleDateString("es-VE", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </strong>
                </span>
              </div>
              {emp.salarioMensual ? (
                <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-[#175E38]/10 text-[#175E38] font-black text-xs font-mono shrink-0">
                  ${emp.salarioMensual.toFixed(2)} USD/mes
                </span>
              ) : (
                <span className="text-[11px] text-slate-400 italic shrink-0">Sin honorarios</span>
              )}
            </div>

            {/* Dirección (si está presente) */}
            {emp.direccion && (
              <div className="sm:col-span-2 flex items-center gap-2 min-w-0 text-slate-600 pt-1.5 border-t border-slate-100">
                <div className="w-7 h-7 rounded-lg bg-slate-100 text-slate-500 flex items-center justify-center shrink-0">
                  <MapPin className="w-3.5 h-3.5" />
                </div>
                <span className="truncate">
                  {emp.direccion}
                </span>
              </div>
            )}
          </div>

          {/* Notas Internas (solo si existen) */}
          {emp.notas && (
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70 text-xs text-slate-600 flex items-start gap-2">
              <FileText className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
              <p className="leading-relaxed line-clamp-2">{emp.notas}</p>
            </div>
          )}
        </div>

        {/* 4 Métricas Clave de Desempeño (StatCards interactivas con relieve 3D y resplandor ambiental) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard
            title="Total Tareas"
            value={emp._count.tareas}
            icon={Briefcase}
            color="navy"
            subtitle="Asignadas en total"
            onClick={() => {
              setVistaActiva("TAREAS");
              setFiltroTipo("TODAS");
            }}
          />

          <StatCard
            title="Pendientes"
            value={emp.tareasPendientesCount}
            icon={AlertTriangle}
            color="amber"
            subtitle={
              emp.tareasPendientesCount === 1 ? "1 orden activa" : `${emp.tareasPendientesCount} órdenes activas`
            }
            onClick={() => {
              setVistaActiva("TAREAS");
              setFiltroTipo("ACTIVAS");
            }}
          />

          <StatCard
            title="Asistencias"
            value={totalAsistenciasCount}
            icon={CheckCircle2}
            color="emerald"
            subtitle="Ver jornadas efectivas"
            onClick={() => setVistaActiva("ASISTENCIAS")}
          />

          <StatCard
            title="Inasistencias"
            value={totalInasistenciasCount}
            icon={UserX}
            color="rose"
            subtitle={
              totalInasistenciasCount === 0
                ? "Sin faltas registradas"
                : `${totalInasistenciasCount} faltas (Ver detalle)`
            }
            onClick={() => setVistaActiva("INASISTENCIAS")}
          />
        </div>

        {/* Selector de Pestañas de Vista (3 Opciones Visibles en Mobile y Desktop) */}
        <div
          ref={seccionTabsRef}
          className="grid grid-cols-3 sm:flex sm:items-center gap-1 sm:gap-1.5 p-1 bg-slate-100/90 rounded-2xl border border-slate-200/80 w-full scroll-mt-3"
        >
          {/* Pestaña: Tareas */}
          <button
            type="button"
            onClick={() => setVistaActiva("TAREAS")}
            className={`h-13 sm:h-9.5 px-1 sm:px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-1.5 cursor-pointer flex-1 ${
              vistaActiva === "TAREAS"
                ? "bg-white text-slate-900 shadow-xs border border-slate-200/70"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <div className="flex items-center gap-1 shrink-0">
              <Briefcase className="w-4 h-4 sm:w-3.5 sm:h-3.5 text-[#1C2539] shrink-0" />
              <span className="sm:hidden text-[10px] font-extrabold px-1.5 py-0.2 rounded-full leading-none bg-slate-200/90 text-slate-700">
                {tareasEmpleado.length}
              </span>
            </div>
            <span className="text-[11px] sm:text-xs font-bold tracking-tight text-center truncate max-w-full">
              <span className="sm:hidden">Tareas</span>
              <span className="hidden sm:inline">Órdenes de Trabajo</span>
            </span>
            <span className="hidden sm:inline-flex px-1.5 py-0.5 rounded-full text-[10px] font-mono bg-slate-100 text-slate-700 shrink-0">
              {tareasEmpleado.length}
            </span>
          </button>

          {/* Pestaña: Asistencias */}
          <button
            type="button"
            onClick={() => setVistaActiva("ASISTENCIAS")}
            className={`h-13 sm:h-9.5 px-1 sm:px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-1.5 cursor-pointer flex-1 ${
              vistaActiva === "ASISTENCIAS"
                ? "bg-white text-slate-900 shadow-xs border border-slate-200/70"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <div className="flex items-center gap-1 shrink-0">
              <CheckCircle2 className="w-4 h-4 sm:w-3.5 sm:h-3.5 text-[#175E38] shrink-0" />
              <span className="sm:hidden text-[10px] font-extrabold px-1.5 py-0.2 rounded-full leading-none bg-emerald-100 text-emerald-800">
                {totalAsistenciasCount}
              </span>
            </div>
            <span className="text-[11px] sm:text-xs font-bold tracking-tight text-center truncate max-w-full">
              <span className="sm:hidden">Asistencia</span>
              <span className="hidden sm:inline">Historial de Asistencias</span>
            </span>
            <span className="hidden sm:inline-flex px-1.5 py-0.5 rounded-full text-[10px] font-mono bg-emerald-100 text-emerald-800 shrink-0">
              {totalAsistenciasCount}
            </span>
          </button>

          {/* Pestaña: Inasistencias */}
          <button
            type="button"
            onClick={() => setVistaActiva("INASISTENCIAS")}
            className={`h-13 sm:h-9.5 px-1 sm:px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-1.5 cursor-pointer flex-1 ${
              vistaActiva === "INASISTENCIAS"
                ? "bg-white text-slate-900 shadow-xs border border-slate-200/70"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <div className="flex items-center gap-1 shrink-0">
              <UserX className="w-4 h-4 sm:w-3.5 sm:h-3.5 text-rose-600 shrink-0" />
              <span
                className={`sm:hidden text-[10px] font-extrabold px-1.5 py-0.2 rounded-full leading-none ${
                  totalInasistenciasCount > 0
                    ? "bg-rose-100 text-rose-800"
                    : "bg-slate-200/90 text-slate-600"
                }`}
              >
                {totalInasistenciasCount}
              </span>
            </div>
            <span className="text-[11px] sm:text-xs font-bold tracking-tight text-center truncate max-w-full">
              <span className="sm:hidden">Faltas</span>
              <span className="hidden sm:inline">Inasistencias y Faltas</span>
            </span>
            <span
              className={`hidden sm:inline-flex px-1.5 py-0.5 rounded-full text-[10px] font-mono shrink-0 ${
                totalInasistenciasCount > 0
                  ? "bg-rose-100 text-rose-800 font-bold"
                  : "bg-slate-100 text-slate-600"
              }`}
            >
              {totalInasistenciasCount}
            </span>
          </button>
        </div>

        {/* Sección: Historial de Tareas y Órdenes de Trabajo */}
        {vistaActiva === "TAREAS" && (
        <div className="space-y-3.5 pt-2 border-t border-slate-200/80">
          {/* Cabecera de la sección con Desplegable de Filtro y Buscador en una sola fila */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-black font-heading text-slate-900 uppercase tracking-wider">
                Órdenes de Trabajo
              </h3>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#175E38] text-white font-mono shadow-2xs">
                {tareasFiltradas.length}
              </span>
            </div>

            {/* Controles: Buscador y Selector en línea horizontal fluida */}
            <div className="flex flex-col min-[480px]:flex-row items-stretch min-[480px]:items-center gap-2 w-full sm:w-auto">
              {/* Buscador de Tareas */}
              <div className="relative flex-1 sm:w-44">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={busquedaTarea}
                  onChange={(e) => setBusquedaTarea(e.target.value)}
                  placeholder="Buscar orden..."
                  className="w-full h-10 sm:h-9.5 pl-8 pr-3 text-xs rounded-xl bg-white border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#175E38]/20 focus:border-[#175E38] transition-all shadow-2xs"
                />
              </div>

              {/* Selector Desplegable Híbrido Institucional */}
              <div className="relative flex-1 sm:w-52" ref={dropdownRef}>
                {/* Capa nativa táctil para móvil */}
                <select
                  value={filtroTipo}
                  onChange={(e) => setFiltroTipo(e.target.value as FiltroTareasTipo)}
                  className="md:hidden absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  aria-label="Filtrar tareas"
                >
                  {opcionesFiltro.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label} ({opt.count})
                    </option>
                  ))}
                </select>

                {/* Botón disparador visible */}
                <button
                  type="button"
                  onClick={() => setDropdownFiltroOpen((prev) => !prev)}
                  className="w-full h-9.5 px-3 rounded-xl bg-white border border-slate-200 hover:border-slate-300 text-xs font-semibold text-slate-700 flex items-center justify-between gap-1.5 shadow-2xs cursor-pointer transition-all focus:outline-none focus:ring-2 focus:ring-[#1C2539]/20"
                >
                  <div className="flex items-center gap-1.5 truncate">
                    <Layers className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    <span className="truncate">{opcionSeleccionada.label}</span>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-600 font-mono">
                      {opcionSeleccionada.count}
                    </span>
                    <ChevronDown
                      className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${
                        dropdownFiltroOpen ? "rotate-180" : ""
                      }`}
                    />
                  </div>
                </button>

                {/* Menú Flotante Desktop */}
                {dropdownFiltroOpen && (
                  <div className="hidden md:block absolute right-0 top-full mt-1.5 w-60 bg-white border border-slate-200/90 rounded-xl shadow-xl py-1.5 z-50 animate-in fade-in-0 zoom-in-95 duration-100">
                    {opcionesFiltro.map((opt) => {
                      const activa = opt.value === filtroTipo;
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => {
                            setFiltroTipo(opt.value);
                            setDropdownFiltroOpen(false);
                          }}
                          className={`w-full px-3 py-2 text-left text-xs flex items-center justify-between transition-colors cursor-pointer ${
                            activa
                              ? "bg-slate-50 text-slate-900 font-bold"
                              : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                          }`}
                        >
                          <span className="truncate">{opt.label}</span>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-600">
                              {opt.count}
                            </span>
                            {activa && <Check className="w-3.5 h-3.5 text-[#175E38]" />}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Listado de Tareas con Acordeón Desplegable */}
          {tareasFiltradas.length === 0 ? (
            <div className="p-8 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/60 text-center space-y-3">
              <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-400 mx-auto flex items-center justify-center">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-700">No se encontraron órdenes de trabajo</h4>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  {busquedaTarea.trim()
                    ? "No hay tareas que coincidan con el término de búsqueda."
                    : "No hay tareas registradas para el filtro seleccionado."}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onAsignarTarea(emp);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-[#175E38] text-white hover:bg-[#124b2d] shadow-xs cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>Asignar Nueva Tarea</span>
              </button>
            </div>
          ) : (
            <div className="space-y-2.5">
              {tareasPaginadas.map((t) => {
                const estadoCfg = ESTADO_TAREA_CONFIG[t.estado];

                return (
                  <div
                    key={t.id}
                    onClick={() => {
                      onClose();
                      onSeleccionarTarea(t);
                    }}
                    className="group p-3.5 sm:p-4 bg-white border border-slate-200/90 hover:border-slate-300 rounded-2xl shadow-2xs hover:shadow-md transition-all flex items-center justify-between gap-3 cursor-pointer select-none hover:-translate-y-0.5"
                  >
                    <div className="min-w-0 flex-1 space-y-1.5">
                      {/* Título de la tarea y badges */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-xs sm:text-sm font-black font-heading text-slate-900 tracking-tight truncate group-hover:text-[#175E38] transition-colors">
                          {t.titulo}
                        </h4>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${estadoCfg.badgeClass}`}
                        >
                          {estadoCfg.label}
                        </span>
                        {t.evidencias.length > 0 ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200/70 px-1.5 py-0.5 rounded-md">
                            <Camera className="w-3 h-3" />
                            <span>{t.evidencias.length}</span>
                          </span>
                        ) : t.requiereEvidencia ? (
                          <span
                            className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200/70 px-1.5 py-0.5 rounded-md"
                            title="Requiere foto de evidencia al completar"
                          >
                            <Camera className="w-3 h-3" />
                            <span>Requiere foto</span>
                          </span>
                        ) : null}
                      </div>

                      {/* Metadatos secundarios */}
                      <div className="flex items-center gap-3 text-xs text-slate-500 flex-wrap">
                        <span className="inline-flex items-center gap-1 font-medium text-slate-600">
                          <Building2 className="w-3.5 h-3.5 text-[#175E38] shrink-0" />
                          <span className="truncate max-w-[200px]">
                            {t.propiedadNombre || "Sede General"}
                          </span>
                        </span>
                        <span>•</span>
                        <span className="inline-flex items-center gap-1 text-slate-500">
                          <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>
                            Límite:{" "}
                            <strong className="text-slate-700 font-semibold">
                              {t.fechaLimite
                                ? new Date(t.fechaLimite).toLocaleDateString("es-VE", {
                                    day: "2-digit",
                                    month: "short",
                                    year: "numeric",
                                  })
                                : "Sin límite"}
                            </strong>
                          </span>
                        </span>
                      </div>
                    </div>

                    {/* Botón Acción Ver Ficha */}
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onClose();
                          onSeleccionarTarea(t);
                        }}
                        className="h-8.5 sm:h-9 px-3 sm:px-3.5 rounded-xl text-xs font-bold bg-[#1C2539] text-white hover:bg-[#2a3754] group-hover:bg-[#175E38] transition-all cursor-pointer shadow-2xs active:translate-y-0.5 flex items-center gap-1.5"
                        title="Abrir gestión completa de la orden"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Ver Ficha</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Paginación Local de 10 en 10 */}
          <PaginacionLocal
            paginaActual={paginaTareas}
            totalPaginas={totalPaginasTareas}
            totalItems={tareasFiltradas.length}
            indiceInicio={indiceInicioTareas}
            itemsPorPagina={ITEMS_POR_PAGINA}
            itemLabel="órdenes"
            onCambiarPagina={setPaginaTareas}
          />
        </div>
        )}

        {/* Vista: Historial de Asistencias Efectivas */}
        {vistaActiva === "ASISTENCIAS" && (
          <div className="space-y-3 pt-2 border-t border-slate-200/80">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-black font-heading text-slate-900 uppercase tracking-wider">
                  Asistencias
                </h3>
                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-[#175E38] text-white font-mono shadow-2xs">
                  {listaAsistencias.length}
                </span>
              </div>

              <button
                type="button"
                onClick={() => onRegistrarAsistencia(emp)}
                className="h-8.5 px-3 rounded-xl text-xs font-bold bg-[#175E38] text-white hover:bg-[#124b2d] border-b-[2px] border-b-[#0e3a23] shadow-xs active:translate-y-0.5 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>Registrar</span>
              </button>
            </div>

            {cargandoHistorial ? (
              <div className="py-10 flex flex-col items-center justify-center gap-2 text-slate-400">
                <Loader2 className="w-5 h-5 animate-spin text-[#175E38]" />
                <span className="text-xs font-medium">Cargando...</span>
              </div>
            ) : listaAsistencias.length === 0 ? (
              <div className="p-6 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/60 text-center space-y-2">
                <p className="text-xs font-bold text-slate-600">Sin asistencias registradas</p>
                <button
                  type="button"
                  onClick={() => onRegistrarAsistencia(emp)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-[#175E38] text-white hover:bg-[#124b2d] shadow-xs cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>Registrar Marcaje</span>
                </button>
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  {asistenciasPaginadas.map((asist) => {
                    const cfg = ESTADO_ASISTENCIA_CONFIG[asist.estado] || ESTADO_ASISTENCIA_CONFIG.PRESENTE;
                    return (
                      <div
                        key={asist.id}
                        className="bg-white border border-slate-200/90 rounded-2xl p-3 sm:p-3.5 shadow-2xs hover:shadow-xs transition-all flex items-center justify-between gap-3"
                      >
                        <div className="min-w-0 flex-1 space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs sm:text-sm font-black font-heading text-slate-900">
                              {formatearFechaEspanol(asist.fecha)}
                            </span>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${cfg.badgeClass}`}>
                              {cfg.label}
                            </span>
                          </div>

                          <div className="flex items-center gap-2.5 text-xs text-slate-600 flex-wrap">
                            <div className="flex items-center gap-1 font-semibold text-slate-700">
                              <Clock className="w-3.5 h-3.5 text-[#175E38] shrink-0" />
                              <span>Entrada: {formatearHora(asist.horaEntrada)}</span>
                            </div>
                            <span className="text-slate-300">•</span>
                            <span className="text-slate-500">
                              {asist.horaSalida ? `Salida: ${formatearHora(asist.horaSalida)}` : "En curso"}
                            </span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            if (onEditarAsistencia) {
                              onEditarAsistencia(emp, asist);
                            } else {
                              onRegistrarAsistencia(emp);
                            }
                          }}
                          className="h-8 px-2.5 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-all cursor-pointer shadow-2xs flex items-center gap-1 shrink-0 active:translate-y-0.5"
                          title="Ajustar marcaje de esta fecha"
                        >
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          <span>Ajustar</span>
                        </button>
                      </div>
                    );
                  })}
                </div>

                {/* Paginación Local de 10 en 10 */}
                <PaginacionLocal
                  paginaActual={paginaAsistencias}
                  totalPaginas={totalPaginasAsistencias}
                  totalItems={listaAsistencias.length}
                  indiceInicio={indiceInicioAsistencias}
                  itemsPorPagina={ITEMS_POR_PAGINA}
                  itemLabel="asistencias"
                  onCambiarPagina={setPaginaAsistencias}
                />
              </>
            )}
          </div>
        )}

        {/* Vista: Historial de Inasistencias y Faltas */}
        {vistaActiva === "INASISTENCIAS" && (
          <div className="space-y-3 pt-2 border-t border-slate-200/80">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-black font-heading text-slate-900 uppercase tracking-wider">
                  Inasistencias
                </h3>
                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-rose-600 text-white font-mono shadow-2xs">
                  {listaInasistencias.length}
                </span>
              </div>
            </div>

            {cargandoHistorial ? (
              <div className="py-10 flex flex-col items-center justify-center gap-2 text-slate-400">
                <Loader2 className="w-5 h-5 animate-spin text-rose-600" />
                <span className="text-xs font-medium">Cargando...</span>
              </div>
            ) : listaInasistencias.length === 0 ? (
              <div className="p-6 rounded-2xl border border-emerald-200/80 bg-emerald-50/50 text-center space-y-1">
                <div className="w-8 h-8 rounded-xl bg-emerald-100 text-[#175E38] mx-auto flex items-center justify-center">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <h4 className="text-xs font-bold text-emerald-950">Sin inasistencias registradas</h4>
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  {inasistenciasPaginadas.map((inasist) => {
                    const esAutomatica = inasist.observaciones?.includes("Inasistencia automática");
                    const cfg = ESTADO_ASISTENCIA_CONFIG[inasist.estado] || ESTADO_ASISTENCIA_CONFIG.FALTA_INJUSTIFICADA;

                    return (
                      <div
                        key={inasist.id}
                        className="bg-white border border-slate-200/90 rounded-2xl p-3 sm:p-3.5 shadow-2xs hover:shadow-xs transition-all flex items-center justify-between gap-3"
                      >
                        <div className="min-w-0 flex-1 space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs sm:text-sm font-black font-heading text-slate-900">
                              {formatearFechaEspanol(inasist.fecha)}
                            </span>
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                                esAutomatica
                                  ? "bg-rose-50 text-rose-700 border-rose-200"
                                  : cfg.badgeClass
                              }`}
                            >
                              {esAutomatica ? "Sin marcar" : cfg.label}
                            </span>
                          </div>

                          {!esAutomatica && inasist.observaciones ? (
                            <p className="text-xs text-slate-500 line-clamp-1">{inasist.observaciones}</p>
                          ) : (
                            <p className="text-[11px] text-slate-400">Jornada sin registro de entrada</p>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            if (onEditarAsistencia) {
                              onEditarAsistencia(emp, inasist);
                            } else {
                              onRegistrarAsistencia(emp);
                            }
                          }}
                          className="h-8.5 px-2.5 sm:px-3 rounded-xl text-xs font-bold text-white bg-[#175E38] hover:bg-[#124b2d] border-b-[2px] border-b-[#0e3a23] active:translate-y-0.5 transition-all shadow-xs flex items-center gap-1.5 cursor-pointer shrink-0"
                          title="Registrar marcaje si el colaborador asistió este día"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 stroke-[2.5]" />
                          <span><span className="hidden min-[380px]:inline">Regularizar</span><span className="min-[380px]:hidden">Ajustar</span></span>
                        </button>
                      </div>
                    );
                  })}
                </div>

                {/* Paginación Local de 10 en 10 */}
                <PaginacionLocal
                  paginaActual={paginaInasistencias}
                  totalPaginas={totalPaginasInasistencias}
                  totalItems={listaInasistencias.length}
                  indiceInicio={indiceInicioInasistencias}
                  itemsPorPagina={ITEMS_POR_PAGINA}
                  itemLabel="inasistencias"
                  onCambiarPagina={setPaginaInasistencias}
                />
              </>
            )}
          </div>
        )}
        {/* Footer Institucional de la Ficha */}
        <div className="pt-3 border-t border-slate-200/90 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-4 h-10 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-all cursor-pointer flex items-center justify-center"
          >
            Cerrar Ficha
          </button>

          <div className="grid grid-cols-2 gap-2 w-full sm:w-auto sm:flex sm:items-center sm:gap-2">
            <button
              type="button"
              onClick={() => {
                onClose();
                onRegistrarAsistencia(emp);
              }}
              className="h-10 px-3.5 rounded-xl text-xs font-bold bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 hover:border-slate-300 transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs active:translate-y-0.5"
              title="Registrar o verificar asistencia del día"
            >
              <Clock className="w-3.5 h-3.5 text-slate-500 shrink-0" />
              <span>Asistencia</span>
            </button>
            <button
              type="button"
              onClick={() => {
                onClose();
                onAsignarTarea(emp);
              }}
              className="h-10 px-4 rounded-xl text-xs font-bold bg-gradient-to-r from-[#175E38] to-[#124b2d] text-white hover:bg-[#124b2d] border-b-[3px] border-b-[#0e3a23] transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-[0_2px_6px_rgba(23,94,56,0.3)] active:translate-y-0.5"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5] shrink-0" />
              <span>Asignar Tarea</span>
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
