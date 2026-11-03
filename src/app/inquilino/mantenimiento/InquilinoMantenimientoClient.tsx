"use client";

import React, { useState, useMemo } from "react";
import Image from "next/image";
import {
  Wrench,
  Plus,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Building2,
  Store,
  User,
  Phone,
  MessageCircle,
  Eye,
  Camera,
  Calendar,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Zap,
  Droplets,
  CloudRain,
  Key,
  Wind,
  Paintbrush,
  HelpCircle,
  Layers,
  Search,
  X,
  XCircle,
  SlidersHorizontal,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { EmptyState } from "@/components/ui/empty-state";
import { ImageViewerModal } from "@/components/ui/image-viewer-modal";
import { PaginacionLocal } from "@/components/ui/paginacion-local";
import { ReportarAveriaModal } from "./ReportarAveriaModal";
import { InquilinoTicketFichaModal } from "./InquilinoTicketFichaModal";
import {
  CATEGORIAS_TICKET,
  ESTADOS_TICKET,
  TEMA_ESTADO_CARD,
} from "@/lib/constants/mantenimiento";
import {
  CategoriaTicket,
  EstadoTicket,
} from "@prisma/client";
import type { TicketItem } from "@/lib/actions/mantenimiento";
import { formatearFechaNumerica } from "@/lib/date-utils";

interface InquilinoMantenimientoClientProps {
  ticketsIniciales: TicketItem[];
  locales: Array<{
    unidadId: string;
    unidadCodigo: string;
    propiedadId: string;
    propiedadNombre: string;
    piso: string | null;
  }>;
  propiedades: Array<{ id: string; nombre: string }>;
  inquilinoNombre: string;
}

// Icono temático según especialidad técnica
function getCategoriaIcon(cat: CategoriaTicket) {
  switch (cat) {
    case CategoriaTicket.ELECTRICIDAD:
      return <Zap className="w-4 h-4 text-amber-500" />;
    case CategoriaTicket.PLOMERIA:
      return <Droplets className="w-4 h-4 text-blue-500" />;
    case CategoriaTicket.FILTRACIONES:
      return <CloudRain className="w-4 h-4 text-cyan-500" />;
    case CategoriaTicket.CERRAJERIA:
      return <Key className="w-4 h-4 text-amber-600" />;
    case CategoriaTicket.CLIMATIZACION:
      return <Wind className="w-4 h-4 text-teal-500" />;
    case CategoriaTicket.AREAS_COMUNES:
      return <Building2 className="w-4 h-4 text-indigo-500" />;
    case CategoriaTicket.PINTURA_ALBANILERIA:
      return <Paintbrush className="w-4 h-4 text-orange-500" />;
    default:
      return <Wrench className="w-4 h-4 text-slate-500" />;
  }
}

const ITEMS_POR_PAGINA = 15;
type TabFiltro = "ACTIVOS" | "HISTORIAL" | "TODOS";

export function InquilinoMantenimientoClient({
  ticketsIniciales,
  locales,
  propiedades,
  inquilinoNombre,
}: InquilinoMantenimientoClientProps) {
  const router = useRouter();
  const [modalReportarOpen, setModalReportarOpen] = useState(false);
  const [ticketParaFicha, setTicketParaFicha] = useState<TicketItem | null>(null);
  const [tabFiltro, setTabFiltro] = useState<TabFiltro>("ACTIVOS");
  const [busqueda, setBusqueda] = useState<string>("");
  const [paginaActual, setPaginaActual] = useState<number>(1);
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

  // Métricas rápidas del inquilino
  const totalReportados = ticketsIniciales.length;
  const enCurso = ticketsIniciales.filter(
    (t) =>
      t.estado !== EstadoTicket.RESUELTO && t.estado !== EstadoTicket.CANCELADO
  ).length;
  const resueltos = ticketsIniciales.filter(
    (t) => t.estado === EstadoTicket.RESUELTO
  ).length;

  // Filtrado de solicitudes
  const ticketsFiltrados = useMemo(() => {
    return ticketsIniciales.filter((t) => {
      // 1. Filtro por Estado / Historial
      if (tabFiltro === "ACTIVOS") {
        if (
          t.estado === EstadoTicket.RESUELTO ||
          t.estado === EstadoTicket.CANCELADO
        ) {
          return false;
        }
      } else if (tabFiltro === "HISTORIAL") {
        if (
          t.estado !== EstadoTicket.RESUELTO &&
          t.estado !== EstadoTicket.CANCELADO
        ) {
          return false;
        }
      }

      // 2. Filtro por término de búsqueda
      if (busqueda.trim()) {
        const q = busqueda.trim().toLowerCase();
        const coincideCodigo = t.codigo.toLowerCase().includes(q);
        const coincideTitulo = t.titulo.toLowerCase().includes(q);
        const coincideDesc = t.descripcion.toLowerCase().includes(q);
        const coincideUnidad = t.unidad?.codigo.toLowerCase().includes(q) || false;
        const coincideProp = t.propiedad.nombre.toLowerCase().includes(q);
        const coincidePersonalizada =
          t.categoriaPersonalizada?.toLowerCase().includes(q) || false;

        if (
          !coincideCodigo &&
          !coincideTitulo &&
          !coincideDesc &&
          !coincideUnidad &&
          !coincideProp &&
          !coincidePersonalizada
        ) {
          return false;
        }
      }

      return true;
    });
  }, [ticketsIniciales, tabFiltro, busqueda]);

  // Paginación local
  const totalItems = ticketsFiltrados.length;
  const totalPaginas = Math.ceil(totalItems / ITEMS_POR_PAGINA) || 1;
  const paginaSegura = Math.min(Math.max(1, paginaActual), totalPaginas);
  const indiceInicio = (paginaSegura - 1) * ITEMS_POR_PAGINA;
  const ticketsPaginados = ticketsFiltrados.slice(
    indiceInicio,
    indiceInicio + ITEMS_POR_PAGINA
  );

  const handleCambiarTab = (tab: TabFiltro) => {
    setTabFiltro(tab);
    setPaginaActual(1);
  };

  const abrirVisor = (images: string[], index = 0, title = "Fotografías") => {
    setVisorImagenes({
      isOpen: true,
      images,
      index,
      title,
    });
  };

  return (
    <div className="space-y-6 w-full">
      {/* Cabecera Principal */}
      <PageHeader
        title="Reportar Problema o Avería"
        description="Notifica de inmediato cualquier daño técnico en tu local."
        icon={<Wrench className="w-5 h-5 sm:w-6 sm:h-6 text-white" />}
        actions={
          <button
            onClick={() => setModalReportarOpen(true)}
            className="w-full sm:w-auto h-11 px-5 rounded-xl text-sm font-bold bg-[#175E38] text-white hover:bg-[#124b2d] transition-all flex items-center justify-center gap-2 cursor-pointer shadow-[0_2px_8px_rgba(23,94,56,0.25)] border-b-[3px] border-b-[#0e3a23] active:translate-y-0.5"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Reportar Nueva Avería</span>
          </button>
        }
      />

      {/* Tarjetas de Métricas Ejecutivas (StatCards) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 sm:gap-4">
        <StatCard
          title="Total Solicitudes"
          value={totalReportados}
          icon={Wrench}
          color="navy"
          subtitle="Historial de averías reportadas"
          hideSubtitleOnMobile={false}
          onClick={() => handleCambiarTab("TODOS")}
        />
        <StatCard
          title="En Atención / Progreso"
          value={enCurso}
          icon={Clock}
          color="amber"
          subtitle="En revisión técnica o reparación"
          hideSubtitleOnMobile={false}
          onClick={() => handleCambiarTab("ACTIVOS")}
        />
        <StatCard
          title="Resueltas Satisfactoriamente"
          value={resueltos}
          icon={CheckCircle2}
          color="emerald"
          subtitle="Trabajos verificados y concluidos"
          hideSubtitleOnMobile={false}
          onClick={() => handleCambiarTab("HISTORIAL")}
        />
      </div>

      {/* Lista de Averías Reportadas */}
      {ticketsIniciales.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200/90 p-8 shadow-xs">
          <EmptyState
            icon="wrench"
            title="No has reportado ninguna avería"
            description="Todos tus locales e instalaciones se encuentran en óptimo estado. Si surge algún desperfecto eléctrico, filtración o daño, pulsa el botón para solicitar atención inmediata."
            action={{
              label: "Reportar Avería Ahora",
              onClick: () => setModalReportarOpen(true),
            }}
          />
        </div>
      ) : (
        <div className="space-y-4">
          {/* Barra de Búsqueda (Izquierda) y Filtros (Derecha) */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-3 sm:p-4 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            {/* Buscador Rápido (Izquierda y más ancho) */}
            <div className="relative w-full md:flex-1 md:max-w-md lg:max-w-lg">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={busqueda}
                onChange={(e) => {
                  setBusqueda(e.target.value);
                  setPaginaActual(1);
                }}
                placeholder="Buscar por código, local, falla o especialidad..."
                className="w-full h-11 pl-9.5 pr-8 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white focus:bg-white text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#175E38]/20 focus:border-[#175E38] transition-all"
              />
              {busqueda && (
                <button
                  type="button"
                  onClick={() => {
                    setBusqueda("");
                    setPaginaActual(1);
                  }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                  title="Limpiar búsqueda"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Tabs de Filtro (Apilados verticalmente en móvil, horizontales en desktop) */}
            <div className="flex flex-col md:flex-row items-stretch md:items-center gap-1 sm:gap-1.5 p-1 bg-slate-100/90 rounded-xl border border-slate-200/70 shrink-0 w-full md:w-auto">
              <button
                type="button"
                onClick={() => handleCambiarTab("ACTIVOS")}
                className={`w-full md:w-auto h-10 md:h-auto px-3 sm:px-3.5 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-between md:justify-center gap-2 cursor-pointer whitespace-nowrap active:scale-98 ${
                  tabFiltro === "ACTIVOS"
                    ? "bg-[#175E38] text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900 hover:bg-white/70"
                }`}
              >
                <div className="flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5 shrink-0" />
                  <span>Activas en Atención</span>
                </div>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10.5px] font-black ${
                    tabFiltro === "ACTIVOS"
                      ? "bg-white/25 text-white"
                      : "bg-slate-200 text-slate-700"
                  }`}
                >
                  {enCurso}
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleCambiarTab("HISTORIAL")}
                className={`w-full md:w-auto h-10 md:h-auto px-3 sm:px-3.5 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-between md:justify-center gap-2 cursor-pointer whitespace-nowrap active:scale-98 ${
                  tabFiltro === "HISTORIAL"
                    ? "bg-[#1C2539] text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900 hover:bg-white/70"
                }`}
              >
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                  <span>Historial Concluidas</span>
                </div>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10.5px] font-black ${
                    tabFiltro === "HISTORIAL"
                      ? "bg-white/25 text-white"
                      : "bg-slate-200 text-slate-700"
                  }`}
                >
                  {resueltos}
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleCambiarTab("TODOS")}
                className={`w-full md:w-auto h-10 md:h-auto px-3 sm:px-3.5 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-between md:justify-center gap-2 cursor-pointer whitespace-nowrap active:scale-98 ${
                  tabFiltro === "TODOS"
                    ? "bg-slate-800 text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900 hover:bg-white/70"
                }`}
              >
                <div className="flex items-center gap-2">
                  <Wrench className="w-3.5 h-3.5 shrink-0" />
                  <span>Todas las Averías</span>
                </div>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10.5px] font-black ${
                    tabFiltro === "TODOS"
                      ? "bg-white/25 text-white"
                      : "bg-slate-200 text-slate-700"
                  }`}
                >
                  {totalReportados}
                </span>
              </button>
            </div>
          </div>

          {/* Cuadrícula de 2 Columnas o Estado Vacío */}
          {ticketsFiltrados.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200/90 p-8 sm:p-12 text-center shadow-xs space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                <Wrench className="w-6 h-6 stroke-[1.5]" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 font-heading">
                  {tabFiltro === "ACTIVOS"
                    ? "No tienes averías activas en atención"
                    : tabFiltro === "HISTORIAL"
                    ? "No hay averías registradas en el historial"
                    : "No se encontraron averías coincidentes"}
                </h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                  {busqueda
                    ? "Prueba modificando el texto de búsqueda o eliminando los filtros."
                    : tabFiltro === "ACTIVOS"
                    ? "Todas tus incidencias han sido resueltas o no has reportado daños recientemente."
                    : "Aquí se listarán las averías una vez que el personal técnico las finiquite."}
                </p>
              </div>
              {busqueda && (
                <button
                  type="button"
                  onClick={() => {
                    setBusqueda("");
                    setPaginaActual(1);
                  }}
                  className="px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-100 text-slate-700 hover:bg-slate-200 transition-all cursor-pointer"
                >
                  Restablecer Búsqueda
                </button>
              )}
            </div>
          ) : (
            <>
              {/* Cuadrícula Compacta de 3 Columnas Institucional */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {ticketsPaginados.map((ticket) => {
                  const catCfg = CATEGORIAS_TICKET[ticket.categoria];
                  const estCfg = ESTADOS_TICKET[ticket.estado];
                  const esResuelto = ticket.estado === EstadoTicket.RESUELTO;
                  const esEnProceso = ticket.estado === EstadoTicket.EN_PROCESO;
                  const esCancelado = ticket.estado === EstadoTicket.CANCELADO;

                  return (
                    <div
                      key={ticket.id}
                      className="group relative bg-gradient-to-b from-white via-white to-slate-50/70 rounded-2xl border border-slate-200/90 border-b-[3px] border-b-slate-300/90 shadow-[0_4px_18px_-2px_rgba(28,37,57,0.07),0_2px_6px_-1px_rgba(28,37,57,0.04)] hover:shadow-[0_14px_30px_-4px_rgba(28,37,57,0.12),0_4px_10px_-2px_rgba(28,37,57,0.06)] hover:-translate-y-1 transition-all duration-300 overflow-hidden flex flex-col justify-between"
                    >
                      {/* Sol decorativo ambiental en esquina superior izquierda (3 capas) */}
                      <div className="absolute -top-7 -left-7 w-24 h-24 sm:w-28 sm:h-28 pointer-events-none overflow-hidden rounded-full z-0">
                        <div
                          className={`absolute inset-0 rounded-full blur-xl ${
                            esResuelto
                              ? "bg-emerald-500/20"
                              : esEnProceso
                              ? "bg-blue-500/20"
                              : esCancelado
                              ? "bg-slate-400/20"
                              : "bg-amber-500/20"
                          }`}
                        />
                        <div
                          className={`absolute inset-2 rounded-full bg-white/10 border ${
                            esResuelto
                              ? "border-emerald-400/30"
                              : esEnProceso
                              ? "border-blue-400/30"
                              : esCancelado
                              ? "border-slate-400/30"
                              : "border-amber-400/30"
                          }`}
                        />
                        <div
                          className={`absolute inset-5 rounded-full bg-gradient-to-br transition-transform duration-500 group-hover:scale-125 to-transparent ${
                            esResuelto
                              ? "from-[#175E38]/30"
                              : esEnProceso
                              ? "from-blue-600/30"
                              : esCancelado
                              ? "from-slate-600/30"
                              : "from-amber-600/30"
                          }`}
                        />
                      </div>

                      <div className="p-4 sm:p-4.5 space-y-3 relative z-10 flex-1 flex flex-col justify-between">
                        <div className="space-y-3">
                          {/* Badges y Código */}
                          <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-100">
                            <span className="text-xs font-mono font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                              {ticket.codigo}
                            </span>

                            <span
                              className={`text-xs font-bold px-2.5 py-0.5 rounded-lg border ${estCfg.badgeBg} ${estCfg.badgeText} ${estCfg.badgeBorder}`}
                            >
                              {estCfg.label}
                            </span>
                          </div>

                          {/* Especialidad y Título */}
                          <div>
                            <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-1">
                              {getCategoriaIcon(ticket.categoria)}
                              <span className="font-semibold truncate">
                                {ticket.categoria === CategoriaTicket.OTRO && ticket.categoriaPersonalizada
                                  ? ticket.categoriaPersonalizada
                                  : catCfg.label}
                              </span>
                            </div>
                            <h3 className="text-sm sm:text-base font-black font-heading text-slate-900 leading-snug line-clamp-2">
                              {ticket.titulo}
                            </h3>
                          </div>

                          {/* Ubicación del Inmueble y Local */}
                          <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/70 space-y-1 text-xs">
                            <p className="font-bold text-slate-800 flex items-center gap-1.5 truncate">
                              <Building2 className="w-3.5 h-3.5 text-[#175E38] shrink-0" />
                              <span className="truncate">{ticket.propiedad.nombre}</span>
                            </p>
                            <p className="text-slate-600 flex items-center gap-1.5 text-[11px] truncate">
                              <Store className="w-3 h-3 text-slate-400 shrink-0" />
                              <span className="font-semibold truncate">
                                {ticket.unidad
                                  ? `Local ${ticket.unidad.codigo}${ticket.unidad.piso ? ` (Piso ${ticket.unidad.piso})` : ""}`
                                  : "Áreas Comunes / Fachada"}
                              </span>
                            </p>
                          </div>

                          {/* Estado de Asignación / Técnico */}
                          {ticket.empleado ? (
                            <div className="flex items-center justify-between text-xs bg-emerald-50/70 p-2 rounded-xl border border-emerald-200/60">
                              <div className="flex items-center gap-1.5 truncate">
                                <div className="w-6 h-6 rounded-lg bg-[#175E38] text-white flex items-center justify-center font-bold text-[10px] shrink-0">
                                  <User className="w-3 h-3" />
                                </div>
                                <div className="truncate">
                                  <p className="font-bold text-slate-800 truncate text-[11px]">
                                    {ticket.empleado.nombre} {ticket.empleado.apellido || ""}
                                  </p>
                                  <p className="text-[10px] text-slate-500 truncate">
                                    {ticket.empleado.cargo.replace(/_/g, " ")}
                                  </p>
                                </div>
                              </div>

                              {ticket.empleado.telefono && (
                                <a
                                  href={`https://wa.me/${ticket.empleado.telefono.replace(/[^0-9]/g, "")}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="px-2 py-1 rounded-lg text-[10.5px] font-bold bg-[#25D366] text-white flex items-center gap-1 shadow-2xs shrink-0 hover:scale-105 active:scale-95 transition-transform"
                                  title="Contactar al técnico por WhatsApp"
                                >
                                  <MessageCircle className="w-3 h-3" />
                                  <span>WhatsApp</span>
                                </a>
                              )}
                            </div>
                          ) : esResuelto ? (
                            <div className="flex items-center gap-1.5 text-xs text-[#175E38] bg-emerald-50 p-2 rounded-xl border border-emerald-200">
                              <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                              <span className="font-bold text-[11px]">Avería verificada y concluida</span>
                            </div>
                          ) : esCancelado ? (
                            <div className="flex items-center gap-1.5 text-xs text-slate-600 bg-slate-100 p-2 rounded-xl border border-slate-200">
                              <XCircle className="w-3.5 h-3.5 shrink-0 text-slate-500" />
                              <span className="font-medium text-[11px]">Incidencia descartada / cancelada</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5 text-xs text-amber-700 bg-amber-50 p-2 rounded-xl border border-amber-200">
                              <Clock className="w-3.5 h-3.5 shrink-0 text-amber-600" />
                              <span className="font-medium text-[11px]">En espera de asignación técnica</span>
                            </div>
                          )}
                        </div>

                        {/* Resumen Compacto de Evidencias */}
                        <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                          <div className="flex items-center gap-2">
                            {ticket.fotosAveria.length > 0 && (
                              <span className="inline-flex items-center gap-1 text-slate-600 font-medium">
                                <Camera className="w-3 h-3 text-slate-400" />
                                <span>{ticket.fotosAveria.length} {ticket.fotosAveria.length === 1 ? "foto" : "fotos"}</span>
                              </span>
                            )}
                            {ticket.fotosFiniquito.length > 0 && (
                              <span className="inline-flex items-center gap-1 text-[#175E38] font-bold">
                                <ShieldCheck className="w-3 h-3" />
                                <span>{ticket.fotosFiniquito.length} arreglo</span>
                              </span>
                            )}
                          </div>
                          <span>{formatearFechaNumerica(ticket.createdAt)}</span>
                        </div>
                      </div>

                      {/* Footer de Acciones (Grid 50/50 Obligatorio de 2 Columnas) */}
                      <div className="border-t border-slate-100 bg-gradient-to-b from-slate-50/70 to-slate-100/60 p-3 sm:p-3.5 grid grid-cols-2 gap-2 relative z-10">
                        {/* Botón 1: Ver Ficha de Incidencia */}
                        <button
                          type="button"
                          onClick={() => setTicketParaFicha(ticket)}
                          className="w-full h-11 px-2.5 rounded-xl text-xs font-bold bg-[#1C2539] text-white hover:bg-[#2a3754] transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs active:translate-y-0.5"
                        >
                          <Eye className="w-3.5 h-3.5 shrink-0" />
                          <span className="truncate">Ver Ficha</span>
                        </button>

                        {/* Botón 2: Acción Operativa o Estado */}
                        {ticket.empleado && ticket.empleado.telefono ? (
                          <a
                            href={`https://wa.me/${ticket.empleado.telefono.replace(/[^0-9]/g, "")}`}
                            target="_blank"
                            rel="noreferrer"
                            className="w-full h-11 px-2.5 rounded-xl text-xs font-bold bg-[#25D366] text-white hover:bg-[#20bd5a] transition-all flex items-center justify-center gap-1.5 shadow-2xs active:translate-y-0.5"
                          >
                            <MessageCircle className="w-3.5 h-3.5 shrink-0" />
                            <span className="truncate">Técnico</span>
                          </a>
                        ) : esResuelto ? (
                          <div className="w-full h-11 px-2.5 rounded-xl text-xs font-bold bg-emerald-50 text-[#175E38] border border-emerald-200 flex items-center justify-center gap-1.5">
                            <ShieldCheck className="w-3.5 h-3.5 shrink-0 text-[#175E38]" />
                            <span className="truncate">Resuelto</span>
                          </div>
                        ) : (
                          <div className="w-full h-11 px-2.5 rounded-xl text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200 flex items-center justify-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 shrink-0 text-amber-700" />
                            <span className="truncate">En Atención</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Componente de Paginación Local */}
              <PaginacionLocal
                paginaActual={paginaSegura}
                totalPaginas={totalPaginas}
                totalItems={totalItems}
                indiceInicio={indiceInicio}
                itemsPorPagina={ITEMS_POR_PAGINA}
                itemLabel="solicitudes"
                onCambiarPagina={(pag) => setPaginaActual(pag)}
              />
            </>
          )}
        </div>
      )}

      {/* Modal para Reportar Avería */}
      <ReportarAveriaModal
        isOpen={modalReportarOpen}
        onClose={() => setModalReportarOpen(false)}
        locales={locales}
        propiedades={propiedades}
        onSuccess={() => {
          router.refresh();
        }}
      />

      {/* Modal de Ficha Técnica de la Incidencia */}
      <InquilinoTicketFichaModal
        isOpen={Boolean(ticketParaFicha)}
        onClose={() => setTicketParaFicha(null)}
        ticket={ticketParaFicha}
        onVerFotos={abrirVisor}
      />

      {/* Modal Visor de Imágenes */}
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
