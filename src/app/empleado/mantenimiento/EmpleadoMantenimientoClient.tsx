"use client";

import React, { useState, useMemo, useEffect } from "react";
import Image from "next/image";
import {
  Wrench,
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
  DollarSign,
  ShieldCheck,
  Zap,
  Droplets,
  CloudRain,
  Key,
  Wind,
  Paintbrush,
  HelpCircle,
  Search,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { ImageViewerModal } from "@/components/ui/image-viewer-modal";
import { StatCard } from "@/components/ui/stat-card";
import { FilterDropdown, type FilterDropdownOption } from "@/components/ui/filter-dropdown";
import { PaginacionLocal } from "@/components/ui/paginacion-local";
import { FiniquitarTicketModal } from "./FiniquitarTicketModal";
import { TicketFichaModal } from "./TicketFichaModal";
import {
  CATEGORIAS_TICKET,
  ESTADOS_TICKET,
} from "@/lib/constants/mantenimiento";
import {
  CategoriaTicket,
  EstadoTicket,
} from "@prisma/client";
import {
  type TicketItem,
} from "@/lib/actions/mantenimiento";
import { formatearFechaNumerica } from "@/lib/date-utils";

interface EmpleadoMantenimientoClientProps {
  ticketsIniciales: TicketItem[];
  empleado: {
    id: string;
    nombre: string;
    apellido: string | null;
    cargo: string;
    telefono: string;
    propiedadNombre?: string | null;
  } | null;
}

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

export function EmpleadoMantenimientoClient({
  ticketsIniciales,
  empleado,
}: EmpleadoMantenimientoClientProps) {
  const router = useRouter();

  const [ticketParaFiniquitar, setTicketParaFiniquitar] = useState<TicketItem | null>(null);
  const [ticketParaFicha, setTicketParaFicha] = useState<TicketItem | null>(null);
  const [tabFiltro, setTabFiltro] = useState<"PENDIENTES" | "RESUELTAS" | "TODAS">("PENDIENTES");
  const [busqueda, setBusqueda] = useState("");

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

  // Métricas rápidas
  const totalPendientes = ticketsIniciales.filter(
    (t) => t.estado === EstadoTicket.PENDIENTE || t.estado === EstadoTicket.EN_PROCESO
  ).length;
  const totalResueltas = ticketsIniciales.filter(
    (t) => t.estado === EstadoTicket.RESUELTO
  ).length;

  // Opciones para el filtro desplegable híbrido
  const opcionesEstado: FilterDropdownOption[] = useMemo(() => {
    return [
      {
        value: "TODAS",
        label: "Todos los Estados",
        icon: Clock,
        count: ticketsIniciales.length,
        isGlobal: true,
      },
      {
        value: "PENDIENTES",
        label: "Pendientes",
        icon: Wrench,
        iconClassName: "text-amber-600",
        count: totalPendientes,
      },
      {
        value: "RESUELTAS",
        label: "Concluidas",
        icon: CheckCircle2,
        iconClassName: "text-[#175E38]",
        count: totalResueltas,
      },
    ];
  }, [ticketsIniciales.length, totalPendientes, totalResueltas]);

  // Filtrado compuesto (Estado + Búsqueda)
  const ticketsFiltrados = useMemo(() => {
    return ticketsIniciales.filter((t) => {
      if (
        tabFiltro === "PENDIENTES" &&
        t.estado !== EstadoTicket.PENDIENTE &&
        t.estado !== EstadoTicket.EN_PROCESO
      ) {
        return false;
      }
      if (tabFiltro === "RESUELTAS" && t.estado !== EstadoTicket.RESUELTO) {
        return false;
      }

      if (busqueda.trim()) {
        const q = busqueda.toLowerCase().trim();
        const coincideCodigo = t.codigo.toLowerCase().includes(q);
        const coincideTitulo = t.titulo.toLowerCase().includes(q);
        const coincideDescripcion = t.descripcion.toLowerCase().includes(q);
        const coincideInmueble = t.propiedad?.nombre.toLowerCase().includes(q);
        const coincideLocal = t.unidad?.codigo?.toLowerCase().includes(q);
        const coincideInquilino = t.inquilino
          ? `${t.inquilino.nombre} ${t.inquilino.apellido || ""}`.toLowerCase().includes(q)
          : false;

        return (
          coincideCodigo ||
          coincideTitulo ||
          coincideDescripcion ||
          coincideInmueble ||
          coincideLocal ||
          coincideInquilino
        );
      }

      return true;
    });
  }, [ticketsIniciales, tabFiltro, busqueda]);

  // Paginación local institucional (15 elementos por página)
  const [paginaActual, setPaginaActual] = useState(1);
  const ITEMS_POR_PAGINA = 15;

  useEffect(() => {
    setPaginaActual(1);
  }, [tabFiltro, busqueda]);

  const totalPaginas = Math.ceil(ticketsFiltrados.length / ITEMS_POR_PAGINA) || 1;
  const indiceInicio = (paginaActual - 1) * ITEMS_POR_PAGINA;
  const ticketsPaginados = useMemo(() => {
    return ticketsFiltrados.slice(indiceInicio, indiceInicio + ITEMS_POR_PAGINA);
  }, [ticketsFiltrados, indiceInicio]);

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
      {/* Cabecera Móvil y Perfil de Empleado */}
      <PageHeader
        title="Averías y Reparaciones Asignadas"
        description="Gestiona las incidencias técnicas a tu cargo."
        icon={<Wrench className="w-5 h-5 sm:w-6 sm:h-6 text-white" />}
      />

      {/* Banner de Perfil del Técnico (Estilo Idéntico al Inicio) */}
      {empleado && (
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#1C2539] via-[#243049] to-[#1C2539] text-white p-5 sm:p-7 border border-white/10 border-b-[4px] border-b-[#0f1624] shadow-xl">
          <div className="absolute -top-16 -left-16 w-60 h-60 bg-[#175E38]/25 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4 sm:gap-5">
            <div className="flex items-center gap-3.5 sm:gap-4 min-w-0 flex-1">
              <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-2xl bg-white p-1.5 shadow-md flex items-center justify-center shrink-0 border border-white/20">
                <Image
                  src="/Logo.png"
                  alt="Inmobiliaria Conté"
                  width={64}
                  height={64}
                  priority
                  className="w-full h-full object-contain"
                />
              </div>
              <div className="min-w-0 flex-1">
                <div className="mb-0.5 sm:mb-1 flex items-center gap-2 truncate">
                  <span className="text-[11px] sm:text-sm font-extrabold text-emerald-400 uppercase tracking-widest font-heading truncate">
                    {empleado.cargo ? empleado.cargo.replace(/_/g, " ") : "Técnico Especialista"}
                  </span>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 hidden sm:inline-block shrink-0" />
                  <span className="text-xs text-slate-300 hidden sm:inline-block font-semibold shrink-0">
                    Personal Activo
                  </span>
                </div>
                <h2 className="text-lg sm:text-3xl font-black font-heading tracking-tight text-white truncate">
                  {empleado.nombre} {empleado.apellido || ""}
                </h2>
              </div>
            </div>

            {/* Sede Asignada */}
            {empleado.propiedadNombre && (
              <div className="shrink-0 self-start sm:self-auto">
                <span className="inline-flex items-center gap-1.5 text-xs text-slate-300 bg-white/10 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl border border-white/10 backdrop-blur-xs shadow-2xs">
                  <Building2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span className="truncate max-w-[200px] sm:max-w-[240px] font-semibold">{empleado.propiedadNombre}</span>
                </span>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Resumen de Carga de Trabajo con StatCards Oficiales del Sistema */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <StatCard
          title="Pendientes"
          value={totalPendientes}
          icon={Clock}
          color="amber"
          subtitle={totalPendientes > 0 ? "Averías por resolver" : "Sin averías pendientes"}
          onClick={() => setTabFiltro("PENDIENTES")}
          className="shadow-2xs"
        />

        <StatCard
          title="Concluidas"
          value={totalResueltas}
          icon={CheckCircle2}
          color="emerald"
          subtitle={totalResueltas > 0 ? "Trabajos finiquitados" : "Sin averías concluidas"}
          onClick={() => setTabFiltro("RESUELTAS")}
          className="shadow-2xs"
        />

        <StatCard
          title="Total Historial"
          value={ticketsIniciales.length}
          icon={Wrench}
          color="navy"
          subtitle="Total de órdenes asignadas"
          onClick={() => setTabFiltro("TODAS")}
          className="shadow-2xs"
        />
      </div>

      {/* Barra de Búsqueda y Filtro de Estado Institucional */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-3.5 sm:p-4 shadow-xs flex flex-col sm:flex-row items-center gap-3">
        {/* Buscador a la izquierda */}
        <div className="relative w-full flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por código, asunto, local o falla..."
            className="w-full h-11 pl-10 pr-9 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white focus:bg-white text-slate-900 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#1C2539]/20 focus:border-[#1C2539] transition-all"
          />
          {busqueda && (
            <button
              type="button"
              onClick={() => setBusqueda("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-200/60 transition-colors cursor-pointer"
              title="Limpiar búsqueda"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filtro desplegable institucional a la derecha */}
        <div className="w-full sm:w-64 shrink-0">
          <FilterDropdown
            value={tabFiltro}
            onChange={(val) => setTabFiltro(val as "PENDIENTES" | "RESUELTAS" | "TODAS")}
            options={opcionesEstado}
            placeholder="Estado"
            icon={Clock}
            className="w-full"
            menuWidth="w-full sm:w-64"
            align="right"
            ariaLabel="Filtrar por estado de avería"
          />
        </div>
      </div>

      {/* Grid de Tarjetas de Mantenimiento Compactas */}
      {ticketsFiltrados.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200/90 p-8 shadow-xs">
          <EmptyState
            icon="wrench"
            title={tabFiltro === "PENDIENTES" ? "¡Sin averías pendientes!" : "Sin averías en esta sección"}
            description={
              tabFiltro === "PENDIENTES"
                ? "No tienes averías asignadas pendientes de atender. Puedes revisar tus labores concluidas o el historial en el filtro superior."
                : "No se encontraron averías con los criterios de búsqueda o filtro seleccionados."
            }
          />
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {ticketsPaginados.map((ticket) => {
            const catCfg = CATEGORIAS_TICKET[ticket.categoria];
            const estCfg = ESTADOS_TICKET[ticket.estado];
            const estaEnProceso = ticket.estado === EstadoTicket.EN_PROCESO;
            const estaResuelto = ticket.estado === EstadoTicket.RESUELTO;

            return (
              <div
                key={ticket.id}
                className="group relative bg-gradient-to-b from-white via-white to-slate-50/70 rounded-2xl border border-slate-200/90 border-b-[3px] border-b-slate-300/90 shadow-[0_4px_18px_-2px_rgba(28,37,57,0.07),0_2px_6px_-1px_rgba(28,37,57,0.04)] hover:shadow-[0_14px_30px_-4px_rgba(28,37,57,0.12),0_4px_10px_-2px_rgba(28,37,57,0.06)] hover:-translate-y-1 transition-all duration-300 overflow-hidden flex flex-col justify-between"
              >
                {/* Sol decorativo ambiental en esquina superior izquierda */}
                <div className="absolute -top-7 -left-7 w-24 h-24 sm:w-28 sm:h-28 pointer-events-none overflow-hidden rounded-full z-0">
                  <div
                    className={`absolute inset-0 rounded-full blur-xl ${
                      estaResuelto
                        ? "bg-emerald-500/20"
                        : estaEnProceso
                        ? "bg-blue-500/20"
                        : "bg-amber-500/20"
                    }`}
                  />
                  <div
                    className={`absolute inset-2 rounded-full bg-white/10 border ${
                      estaResuelto
                        ? "border-emerald-400/30"
                        : estaEnProceso
                        ? "border-blue-400/30"
                        : "border-amber-400/30"
                    }`}
                  />
                  <div
                    className={`absolute inset-5 rounded-full bg-gradient-to-br transition-transform duration-500 group-hover:scale-125 to-transparent ${
                      estaResuelto
                        ? "from-[#175E38]/30"
                        : estaEnProceso
                        ? "from-blue-600/30"
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

                    {/* Contacto del Inquilino con WhatsApp directo */}
                    {ticket.inquilino && (
                      <div className="flex items-center justify-between text-xs bg-slate-100/60 p-2 rounded-xl border border-slate-200/60">
                        <div className="flex items-center gap-1.5 truncate">
                          <User className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                          <span className="font-semibold text-slate-800 truncate text-[11px]">
                            {ticket.inquilino.nombre} {ticket.inquilino.apellido || ""}
                          </span>
                        </div>

                        {ticket.inquilino.telefono && (
                          <a
                            href={`https://wa.me/${ticket.inquilino.telefono.replace(/[^0-9]/g, "")}`}
                            target="_blank"
                            rel="noreferrer"
                            className="px-2 py-1 rounded-lg text-[10.5px] font-bold bg-[#25D366] text-white flex items-center gap-1 shadow-2xs shrink-0 hover:scale-105 active:scale-95 transition-transform"
                          >
                            <MessageCircle className="w-3 h-3" />
                            <span>WhatsApp</span>
                          </a>
                        )}
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
                  {/* Botón 1: Ver Ficha de Reparación */}
                  <button
                    type="button"
                    onClick={() => setTicketParaFicha(ticket)}
                    className="w-full h-11 px-2.5 rounded-xl text-xs font-bold bg-[#1C2539] text-white hover:bg-[#2a3754] transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs active:translate-y-0.5"
                  >
                    <Eye className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">Ver Ficha</span>
                  </button>

                  {/* Botón 2: Acción Operativa */}
                  {estaEnProceso && (
                    <button
                      type="button"
                      onClick={() => setTicketParaFiniquitar(ticket)}
                      className="w-full h-11 px-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-[#175E38] to-[#124b2d] text-white hover:brightness-105 transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-[0_2px_6px_rgba(23,94,56,0.3)] border-b-[3px] border-b-[#0e3a23] active:translate-y-0.5"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">Finiquitar</span>
                    </button>
                  )}

                  {estaResuelto && (
                    <div className="w-full h-11 px-2.5 rounded-xl text-xs font-bold bg-emerald-50 text-[#175E38] border border-emerald-200 flex items-center justify-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 shrink-0 text-[#175E38]" />
                      <span className="truncate">Resuelto</span>
                    </div>
                  )}

                  {!estaEnProceso && !estaResuelto && (
                    <div className="w-full h-11 px-2.5 rounded-xl text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200 flex items-center justify-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 shrink-0 text-amber-700" />
                      <span className="truncate">Asignado</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <PaginacionLocal
          paginaActual={paginaActual}
          totalPaginas={totalPaginas}
          totalItems={ticketsFiltrados.length}
          indiceInicio={indiceInicio}
          itemsPorPagina={ITEMS_POR_PAGINA}
          itemLabel="averías"
          onCambiarPagina={(pag) => setPaginaActual(pag)}
        />
      </div>
    )}

      {/* Modal Ficha de Reparación */}
      <TicketFichaModal
        isOpen={Boolean(ticketParaFicha)}
        onClose={() => setTicketParaFicha(null)}
        ticket={ticketParaFicha}
        onVerFotos={abrirVisor}
        onFiniquitar={(ticket) => {
          setTicketParaFicha(null);
          setTicketParaFiniquitar(ticket);
        }}
      />

      {/* Modal para Finiquitar Ticket */}
      <FiniquitarTicketModal
        isOpen={Boolean(ticketParaFiniquitar)}
        onClose={() => setTicketParaFiniquitar(null)}
        ticket={ticketParaFiniquitar}
        onSuccess={() => {
          router.refresh();
        }}
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

