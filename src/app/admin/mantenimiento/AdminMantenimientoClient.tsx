"use client";

import React, { useState, useMemo } from "react";
import Image from "next/image";
import {
  Wrench,
  Clock,
  AlertTriangle,
  CheckCircle2,
  DollarSign,
  Plus,
  Search,
  Filter,
  Building2,
  Store,
  User,
  Phone,
  MessageCircle,
  Eye,
  Camera,
  Layers,
  ChevronRight,
  ShieldCheck,
  UserCheck,
  Zap,
  Droplets,
  CloudRain,
  Key,
  Wind,
  Paintbrush,
  HelpCircle,
  X,
  XCircle,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { FilterDropdown, type FilterDropdownOption } from "@/components/ui/filter-dropdown";
import { EmptyState } from "@/components/ui/empty-state";
import { ImageViewerModal } from "@/components/ui/image-viewer-modal";
import { PaginacionLocal } from "@/components/ui/paginacion-local";
import { AsignarTecnicoModal } from "./AsignarTecnicoModal";
import { CrearTicketAdminModal } from "./CrearTicketAdminModal";
import { TicketDetalleModal } from "./TicketDetalleModal";
import {
  CATEGORIAS_TICKET,
  ESTADOS_TICKET,
  TEMA_ESTADO_CARD,
} from "@/lib/constants/mantenimiento";
import {
  CategoriaTicket,
  EstadoTicket,
} from "@prisma/client";
import type {
  TicketItem,
  EstadisticasMantenimiento,
  TecnicoDisponible,
} from "@/lib/actions/mantenimiento";
import { formatearFechaNumerica } from "@/lib/date-utils";

interface PropiedadSimple {
  id: string;
  nombre: string;
  ciudad: string;
  unidades: Array<{
    id: string;
    codigo: string;
    tipo: string;
  }>;
}

interface AdminMantenimientoClientProps {
  ticketsIniciales: TicketItem[];
  estadisticas: EstadisticasMantenimiento;
  tecnicos: TecnicoDisponible[];
  propiedades: PropiedadSimple[];
}

const ITEMS_POR_PAGINA = 12;

const CATEGORIA_ICONS_MAP: Record<CategoriaTicket, React.ComponentType<{ className?: string }>> = {
  ELECTRICIDAD: Zap,
  PLOMERIA: Droplets,
  FILTRACIONES: CloudRain,
  CERRAJERIA: Key,
  CLIMATIZACION: Wind,
  AREAS_COMUNES: Building2,
  PINTURA_ALBANILERIA: Paintbrush,
  OTRO: Wrench,
};

function getCategoriaIcon(cat: CategoriaTicket) {
  switch (cat) {
    case CategoriaTicket.ELECTRICIDAD:
      return <Zap className="w-3.5 h-3.5 text-amber-500 shrink-0" />;
    case CategoriaTicket.PLOMERIA:
      return <Droplets className="w-3.5 h-3.5 text-blue-500 shrink-0" />;
    case CategoriaTicket.FILTRACIONES:
      return <CloudRain className="w-3.5 h-3.5 text-cyan-500 shrink-0" />;
    case CategoriaTicket.CERRAJERIA:
      return <Key className="w-3.5 h-3.5 text-amber-600 shrink-0" />;
    case CategoriaTicket.CLIMATIZACION:
      return <Wind className="w-3.5 h-3.5 text-teal-500 shrink-0" />;
    case CategoriaTicket.AREAS_COMUNES:
      return <Building2 className="w-3.5 h-3.5 text-indigo-500 shrink-0" />;
    case CategoriaTicket.PINTURA_ALBANILERIA:
      return <Paintbrush className="w-3.5 h-3.5 text-orange-500 shrink-0" />;
    default:
      return <Wrench className="w-3.5 h-3.5 text-slate-500 shrink-0" />;
  }
}

export function AdminMantenimientoClient({
  ticketsIniciales,
  estadisticas,
  tecnicos,
  propiedades,
}: AdminMantenimientoClientProps) {
  const router = useRouter();

  // Estados de Filtros
  const [busqueda, setBusqueda] = useState<string>("");
  const [filtroPropiedad, setFiltroPropiedad] = useState<string>("TODAS");
  const [filtroEstado, setFiltroEstado] = useState<string>("ACTIVAS");
  const [filtroCategoria, setFiltroCategoria] = useState<string>("TODAS");
  const [paginaActual, setPaginaActual] = useState<number>(1);

  // Modales
  const [modalCrearOpen, setModalCrearOpen] = useState(false);
  const [ticketParaAsignar, setTicketParaAsignar] = useState<TicketItem | null>(null);
  const [ticketParaDetalle, setTicketParaDetalle] = useState<TicketItem | null>(null);
  const [visorImagenes, setVisorImagenes] = useState<{
    isOpen: boolean;
    images: string[];
    index: number;
    title: string;
  }>({
    isOpen: false,
    images: [],
    index: 0,
    title: "",
  });

  // Filtrado de tickets en memoria (cliente)
  const ticketsFiltrados = useMemo(() => {
    return ticketsIniciales.filter((t) => {
      // Propiedad
      if (filtroPropiedad !== "TODAS" && t.propiedadId !== filtroPropiedad) {
        return false;
      }
      // Estado (Soporta "ACTIVAS" para agrupar Pendientes sin asignar y En Proceso con técnico)
      if (filtroEstado === "ACTIVAS") {
        if (
          t.estado !== EstadoTicket.PENDIENTE &&
          t.estado !== EstadoTicket.EN_PROCESO
        ) {
          return false;
        }
      } else if (filtroEstado !== "TODOS" && t.estado !== filtroEstado) {
        return false;
      }
      // Categoria
      if (filtroCategoria !== "TODAS" && t.categoria !== filtroCategoria) {
        return false;
      }
      // Busqueda
      if (busqueda.trim()) {
        const q = busqueda.toLowerCase().trim();
        const coincideCodigo = t.codigo.toLowerCase().includes(q);
        const coincideTitulo = t.titulo.toLowerCase().includes(q);
        const coincidePropiedad = t.propiedad.nombre.toLowerCase().includes(q);
        const coincideUnidad = t.unidad?.codigo.toLowerCase().includes(q);
        const coincideInquilino =
          t.inquilino?.nombre.toLowerCase().includes(q) ||
          t.inquilino?.apellido?.toLowerCase().includes(q);
        const coincideTecnico =
          t.empleado?.nombre.toLowerCase().includes(q) ||
          t.empleado?.apellido?.toLowerCase().includes(q);

        if (
          !coincideCodigo &&
          !coincideTitulo &&
          !coincidePropiedad &&
          !coincideUnidad &&
          !coincideInquilino &&
          !coincideTecnico
        ) {
          return false;
        }
      }

      return true;
    });
  }, [
    ticketsIniciales,
    filtroPropiedad,
    filtroEstado,
    filtroCategoria,
    busqueda,
  ]);

  // Conteo de incidencias activas (sin resolver)
  const totalActivas = useMemo(() => {
    return ticketsIniciales.filter(
      (t) => t.estado === EstadoTicket.PENDIENTE || t.estado === EstadoTicket.EN_PROCESO
    ).length;
  }, [ticketsIniciales]);

  // Conteo de incidencias sin personal técnico asignado
  const totalSinAsignar = useMemo(() => {
    return ticketsIniciales.filter(
      (t) => t.estado === EstadoTicket.PENDIENTE
    ).length;
  }, [ticketsIniciales]);

  // Paginación
  const totalItems = ticketsFiltrados.length;
  const totalPaginas = Math.ceil(totalItems / ITEMS_POR_PAGINA) || 1;
  const indiceInicio = (paginaActual - 1) * ITEMS_POR_PAGINA;
  const ticketsPaginados = ticketsFiltrados.slice(
    indiceInicio,
    indiceInicio + ITEMS_POR_PAGINA
  );

  // Opciones para FilterDropdown: Inmuebles
  const opcionesPropiedad: FilterDropdownOption[] = useMemo(() => {
    return [
      {
        value: "TODAS",
        label: "Todos los Inmuebles",
        icon: Building2,
        count: ticketsIniciales.length,
        isGlobal: true,
      },
      ...propiedades.map((p) => ({
        value: p.id,
        label: p.nombre,
        subtitle: p.ciudad,
        icon: Building2,
        count: ticketsIniciales.filter((t) => t.propiedadId === p.id).length,
      })),
    ];
  }, [propiedades, ticketsIniciales]);

  // Opciones para FilterDropdown: Estado (Simplificado sin redundancias)
  const opcionesEstado: FilterDropdownOption[] = useMemo(() => {
    return [
      {
        value: "TODOS",
        label: "Todos los Estados",
        icon: Layers,
        count: ticketsIniciales.length,
        isGlobal: true,
      },
      {
        value: "ACTIVAS",
        label: "Activas / Por Resolver",
        subtitle: "Pendientes y en reparación",
        icon: AlertTriangle,
        iconClassName: "text-amber-500",
        count: totalActivas,
      },
      {
        value: EstadoTicket.RESUELTO,
        label: "Resueltas",
        subtitle: "Finiquitadas con evidencia",
        icon: CheckCircle2,
        iconClassName: "text-[#175E38]",
        count: ticketsIniciales.filter((t) => t.estado === EstadoTicket.RESUELTO).length,
      },
      {
        value: EstadoTicket.CANCELADO,
        label: "Canceladas",
        subtitle: "Descartadas o anuladas",
        icon: XCircle,
        iconClassName: "text-slate-400",
        count: ticketsIniciales.filter((t) => t.estado === EstadoTicket.CANCELADO).length,
      },
    ];
  }, [ticketsIniciales, totalActivas]);

  // Opciones para FilterDropdown: Categoría
  const opcionesCategoria: FilterDropdownOption[] = useMemo(() => {
    return [
      {
        value: "TODAS",
        label: "Todas las Categorías",
        icon: Layers,
        count: ticketsIniciales.length,
        isGlobal: true,
      },
      ...Object.entries(CATEGORIAS_TICKET).map(([key, cfg]) => ({
        value: key,
        label: cfg.label,
        icon: CATEGORIA_ICONS_MAP[key as CategoriaTicket] || Wrench,
        iconClassName: "text-slate-500",
        count: ticketsIniciales.filter((t) => t.categoria === key).length,
      })),
    ];
  }, [ticketsIniciales]);

  const abrirVisor = (images: string[], index = 0, title = "Fotografías") => {
    setVisorImagenes({
      isOpen: true,
      images,
      index,
      title,
    });
  };

  const abrirDetalle = (ticket: TicketItem) => {
    setTicketParaDetalle(ticket);
  };

  const abrirAsignar = (ticket: TicketItem) => {
    setTicketParaAsignar(ticket);
  };

  return (
    <div className="space-y-6 w-full">
      {/* Cabecera Principal */}
      <PageHeader
        title="Gestión de Averías y Reparaciones"
        description="Bandeja centralizada para supervisar averías, asignar personal técnico y auditar el finiquito de trabajos de mantenimiento."
        icon={<Wrench className="w-5 h-5 sm:w-6 sm:h-6 text-white" />}
        actions={
          <button
            onClick={() => setModalCrearOpen(true)}
            className="w-full sm:w-auto h-11 px-5 rounded-xl text-sm font-bold bg-[#175E38] text-white hover:bg-[#124b2d] transition-all flex items-center justify-center gap-2 cursor-pointer shadow-[0_2px_8px_rgba(23,94,56,0.25)] border-b-[3px] border-b-[#0e3a23] active:translate-y-0.5"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Registrar Incidencia</span>
          </button>
        }
      />

      {/* 4 StatCards Ejecutivas con Resplandor Sol Ambiental */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <StatCard
          title="Averías Activas"
          value={estadisticas.totalActivos}
          icon={Clock}
          color="amber"
          subtitle="En revisión o asignación"
          onClick={() => {
            setFiltroEstado("ACTIVAS");
            setPaginaActual(1);
          }}
          className="cursor-pointer hover:border-amber-300"
        />
        <StatCard
          title="Sin Asignar"
          value={totalSinAsignar}
          icon={UserCheck}
          color="rose"
          subtitle="Requieren personal técnico"
        />
        <StatCard
          title="En Reparación"
          value={estadisticas.totalEnProceso}
          icon={Wrench}
          color="indigo"
          subtitle="Trabajos técnicos en curso"
        />
        <StatCard
          title="Resueltas del Mes"
          value={estadisticas.resueltosMes}
          icon={CheckCircle2}
          color="emerald"
          subtitle="Finiquitadas con evidencia"
          onClick={() => {
            setFiltroEstado(EstadoTicket.RESUELTO);
            setPaginaActual(1);
          }}
          className="cursor-pointer hover:border-emerald-300"
        />
      </div>

      {/* Barra de Búsqueda y Filtros Híbridos */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-3.5 sm:p-4 shadow-xs space-y-3">
        {/* Fila 1: Buscador amplio con botón para limpiar */}
        <div className="relative w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={busqueda}
            onChange={(e) => {
              setBusqueda(e.target.value);
              setPaginaActual(1);
            }}
            placeholder="Buscar por código, local, asunto o inquilino..."
            className="w-full h-11 pl-10 pr-9 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white focus:bg-white text-slate-900 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#1C2539]/20 focus:border-[#1C2539] transition-all"
          />
          {busqueda && (
            <button
              type="button"
              onClick={() => {
                setBusqueda("");
                setPaginaActual(1);
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-200/60 transition-colors cursor-pointer"
              title="Limpiar búsqueda"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Fila 2: Cuadrícula organizada de 3 Filtros con amplio espacio horizontal */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 sm:gap-3">
          {/* Filtro Propiedad */}
          <FilterDropdown
            value={filtroPropiedad}
            onChange={(val) => {
              setFiltroPropiedad(val);
              setPaginaActual(1);
            }}
            options={opcionesPropiedad}
            placeholder="Inmueble"
            icon={Building2}
            className="w-full"
            menuWidth="w-72 sm:w-80"
            align="left"
            ariaLabel="Filtrar por inmueble"
          />

          {/* Filtro Estado */}
          <FilterDropdown
            value={filtroEstado}
            onChange={(val) => {
              setFiltroEstado(val);
              setPaginaActual(1);
            }}
            options={opcionesEstado}
            placeholder="Estado"
            icon={Clock}
            className="w-full"
            menuWidth="w-72 sm:w-80"
            align="left"
            ariaLabel="Filtrar por estado"
          />

          {/* Filtro Categoría */}
          <FilterDropdown
            value={filtroCategoria}
            onChange={(val) => {
              setFiltroCategoria(val);
              setPaginaActual(1);
            }}
            options={opcionesCategoria}
            placeholder="Especialidad"
            icon={Layers}
            className="w-full"
            menuWidth="w-80 sm:w-[26rem]"
            align="right"
            ariaLabel="Filtrar por especialidad"
          />
        </div>

        {/* Resumen de resultados activos */}
        {(busqueda ||
          filtroPropiedad !== "TODAS" ||
          filtroEstado !== "ACTIVAS" ||
          filtroCategoria !== "TODAS") && (
          <div className="pt-2 flex flex-wrap items-center justify-between text-xs text-slate-500 border-t border-slate-100">
            <span>
              Mostrando <strong>{totalItems}</strong> averías que coinciden con los filtros aplicados.
            </span>
            <button
              onClick={() => {
                setBusqueda("");
                setFiltroPropiedad("TODAS");
                setFiltroEstado("ACTIVAS");
                setFiltroCategoria("TODAS");
                setPaginaActual(1);
              }}
              className="text-[#175E38] font-bold hover:underline cursor-pointer"
            >
              Restablecer Filtros
            </button>
          </div>
        )}
      </div>

      {/* Grid de Tarjetas de Mantenimiento */}
      {totalItems === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200/90 p-8 shadow-xs">
          <EmptyState
            icon="wrench"
            title="No se encontraron tickets de avería"
            description="No hay incidencias que coincidan con los criterios seleccionados. Puedes restablecer los filtros o registrar una avería directamente."
            action={{
              label: "Registrar Incidencia",
              onClick: () => setModalCrearOpen(true),
            }}
          />
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {ticketsPaginados.map((ticket) => {
              const catCfg = CATEGORIAS_TICKET[ticket.categoria];
              const estCfg = ESTADOS_TICKET[ticket.estado];
              const tema = TEMA_ESTADO_CARD[ticket.estado];
              const esActivo =
                ticket.estado !== EstadoTicket.RESUELTO &&
                ticket.estado !== EstadoTicket.CANCELADO;

              return (
                <div
                  key={ticket.id}
                  className={`group relative flex flex-col justify-between ${tema.cardBg} rounded-2xl border ${tema.cardBorder} ${tema.cardShadow} hover:-translate-y-1.5 transition-all duration-300 overflow-hidden`}
                >
                  {/* Sol decorativo institucional en esquina superior izquierda (3 capas concéntricas) */}
                  <div className="absolute -top-7 -left-7 w-20 h-20 sm:w-24 sm:h-24 pointer-events-none overflow-hidden rounded-full z-0">
                    <div className={`absolute inset-0 rounded-full blur-lg ${tema.glowBg}`} />
                    <div className={`absolute inset-2 rounded-full bg-white/5 border ${tema.glowBorder}`} />
                    <div
                      className={`absolute inset-5 rounded-full bg-gradient-to-br to-transparent transition-transform duration-500 group-hover:scale-125 ${tema.glowGrad}`}
                    />
                  </div>

                  {/* Cuerpo Superior de la Tarjeta */}
                  <div className="p-4 sm:p-5 space-y-3.5 relative z-10">
                    {/* Header: Badges y Código */}
                    <div className="flex items-center justify-between gap-2">
                      <span className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded-md border ${tema.codeBadge}`}>
                        {ticket.codigo}
                      </span>

                      <span
                        className={`inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-0.5 rounded-lg border ${tema.estadoBadge}`}
                      >
                        {ticket.estado === EstadoTicket.RESUELTO && (
                          <CheckCircle2 className="w-3.5 h-3.5 text-[#175E38] stroke-[2.5]" />
                        )}
                        {ticket.estado === EstadoTicket.PENDIENTE && (
                          <span className="w-2 h-2 rounded-full bg-amber-600 animate-ping shrink-0" />
                        )}
                        {ticket.estado === EstadoTicket.EN_PROCESO && (
                          <Wrench className="w-3.5 h-3.5 text-blue-800" />
                        )}
                        <span>{ticket.estado === EstadoTicket.PENDIENTE ? "Sin Asignar" : estCfg.label}</span>
                      </span>
                    </div>

                    {/* Título y Especialidad */}
                    <div>
                      <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-1">
                        {getCategoriaIcon(ticket.categoria)}
                        <span className="font-semibold">
                          {ticket.categoria === CategoriaTicket.OTRO && ticket.categoriaPersonalizada
                            ? ticket.categoriaPersonalizada
                            : catCfg.label}
                        </span>
                      </div>
                      <h4 className="text-sm sm:text-base font-black font-heading text-slate-900 leading-snug line-clamp-2">
                        {ticket.titulo}
                      </h4>
                    </div>

                    {/* Inmueble y Ubicación */}
                    <div className="bg-slate-50/80 p-2.5 rounded-xl border border-slate-200/70 space-y-1 text-xs">
                      <p className="font-bold text-slate-800 flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-[#175E38] shrink-0" />
                        <span className="truncate">{ticket.propiedad.nombre}</span>
                      </p>
                      <p className="text-slate-500 flex items-center gap-1.5 text-[11px]">
                        <Store className="w-3 h-3 text-slate-400 shrink-0" />
                        <span>
                          {ticket.unidad
                            ? `Local ${ticket.unidad.codigo}${ticket.unidad.piso ? ` (Piso ${ticket.unidad.piso})` : ""}`
                            : "Áreas Comunes / Fachada"}
                        </span>
                      </p>
                    </div>

                    {/* Inquilino y WhatsApp */}
                    {ticket.inquilino ? (
                      <div className="flex items-center justify-between text-xs pt-1">
                        <div className="flex items-center gap-1.5 truncate">
                          <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="truncate text-slate-700 font-medium">
                            {ticket.inquilino.nombre} {ticket.inquilino.apellido || ""}
                          </span>
                        </div>
                        {ticket.inquilino.telefono && (
                          <a
                            href={`https://wa.me/${ticket.inquilino.telefono.replace(/[^0-9]/g, "")}`}
                            target="_blank"
                            rel="noreferrer"
                            title="Contactar al inquilino"
                            className="w-7 h-7 rounded-lg bg-emerald-50 text-[#25D366] border border-emerald-200 flex items-center justify-center hover:bg-emerald-100 transition-colors shrink-0"
                          >
                            <MessageCircle className="w-3.5 h-3.5" />
                          </a>
                        )}
                      </div>
                    ) : (
                      <div className="text-[11px] text-slate-400 italic">
                        Reporte interno registrado por Administración
                      </div>
                    )}

                    {/* Técnico Asignado */}
                    <div className="flex items-center justify-between text-xs pt-0.5">
                      <div className="flex items-center gap-1.5 truncate">
                        <UserCheck className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate text-slate-600">
                          {ticket.empleado
                            ? `${ticket.empleado.nombre} (${ticket.empleado.cargo.replace(/_/g, " ")})`
                            : "Sin técnico asignado"}
                        </span>
                      </div>
                      {ticket.fotosAveria.length > 0 && (
                        <button
                          type="button"
                          onClick={() =>
                            abrirVisor(ticket.fotosAveria, 0, `Evidencias — ${ticket.codigo}`)
                          }
                          className="text-[11px] font-bold text-[#175E38] flex items-center gap-1 hover:underline"
                        >
                          <Camera className="w-3 h-3" />
                          <span>{ticket.fotosAveria.length} fotos</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Footer de Acciones (Grid 50/50 Obligatorio de 2 Columnas) */}
                  <div className="border-t border-slate-100 bg-gradient-to-b from-slate-50/70 to-slate-100/60 p-3 sm:p-3.5 grid grid-cols-2 gap-2 relative z-10">
                    <button
                      type="button"
                      onClick={() => abrirDetalle(ticket)}
                      className="w-full h-11 px-2.5 rounded-xl text-xs font-bold bg-[#1C2539] text-white hover:bg-[#2a3754] transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs active:translate-y-0.5"
                    >
                      <Eye className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">Ver Detalles</span>
                    </button>

                    {esActivo ? (
                      <button
                        type="button"
                        onClick={() => abrirAsignar(ticket)}
                        className={`w-full h-11 px-2.5 rounded-xl text-xs font-bold text-white transition-all flex items-center justify-center gap-1.5 cursor-pointer active:translate-y-0.5 ${
                          !ticket.empleado
                            ? "bg-amber-600 hover:bg-amber-700 shadow-[0_4px_14px_rgba(217,119,6,0.38)] border-b-[3px] border-b-amber-800 ring-2 ring-amber-400/40"
                            : "bg-[#175E38] text-white hover:bg-[#124b2d] shadow-[0_2px_6px_rgba(23,94,56,0.3)] border-b-[3px] border-b-[#0e3a23]"
                        }`}
                      >
                        <UserCheck className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">
                          {ticket.empleado ? "Reasignar" : "Asignar Técnico"}
                        </span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => abrirDetalle(ticket)}
                        className="w-full h-11 px-2.5 rounded-xl text-xs font-bold bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs active:translate-y-0.5"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 text-[#175E38] shrink-0" />
                        <span className="truncate">Historial</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Paginación */}
          <PaginacionLocal
            paginaActual={paginaActual}
            totalPaginas={totalPaginas}
            totalItems={totalItems}
            indiceInicio={indiceInicio}
            itemsPorPagina={ITEMS_POR_PAGINA}
            itemLabel="averías y reparaciones"
            onCambiarPagina={(pag) => setPaginaActual(pag)}
          />
        </div>
      )}

      {/* Modal Asignar Técnico */}
      <AsignarTecnicoModal
        isOpen={Boolean(ticketParaAsignar)}
        onClose={() => setTicketParaAsignar(null)}
        ticket={ticketParaAsignar}
        tecnicos={tecnicos}
        onSuccess={() => {
          router.refresh();
        }}
      />

      {/* Modal Crear Ticket Directo Admin */}
      <CrearTicketAdminModal
        isOpen={modalCrearOpen}
        onClose={() => setModalCrearOpen(false)}
        propiedades={propiedades}
        tecnicos={tecnicos}
        onSuccess={() => {
          router.refresh();
        }}
      />

      {/* Modal Detalle de Ticket */}
      <TicketDetalleModal
        isOpen={Boolean(ticketParaDetalle)}
        onClose={() => setTicketParaDetalle(null)}
        ticket={ticketParaDetalle}
        onAbrirAsignar={(t) => {
          setTicketParaDetalle(null);
          setTicketParaAsignar(t);
        }}
        onVerFotos={abrirVisor}
        onSuccess={() => {
          router.refresh();
        }}
      />

      {/* Visor de Fotos */}
      <ImageViewerModal
        isOpen={visorImagenes.isOpen}
        onClose={() => setVisorImagenes((prev) => ({ ...prev, isOpen: false }))}
        images={visorImagenes.images}
        initialIndex={visorImagenes.index}
        title={visorImagenes.title}
      />
    </div>
  );
}

