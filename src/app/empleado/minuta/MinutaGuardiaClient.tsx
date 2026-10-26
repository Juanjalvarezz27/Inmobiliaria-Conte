"use client";

import { useState, useMemo } from "react";
import {
  ShieldCheck,
  Building2,
  Calendar,
  Clock,
  Plus,
  RefreshCw,
  User,
  AlertCircle,
  AlertTriangle,
  Layers,
  Eye,
  Camera,
  Search,
  Filter,
  ChevronDown,
  Wrench,
  Car,
  HelpCircle,
  Pencil,
  X,
} from "lucide-react";
import {
  CategoriaNovedad,
  CATEGORIA_NOVEDAD_CONFIG,
  parseNovedadTitulo,
  type GuardiaDiarioData,
  type IncidenciaItem,
} from "@/lib/types/seguridad";
import { ReportarNovedadModal } from "./ReportarNovedadModal";
import { NovedadFichaModal } from "./NovedadFichaModal";
import { getGuardiaDiarioDataAction } from "@/lib/actions/seguridad";
import { toast } from "sonner";
import { FilterDropdown, type FilterDropdownOption } from "@/components/ui/filter-dropdown";
import { DateFilterPicker } from "@/components/ui/date-filter-picker";
import { StatCard } from "@/components/ui/stat-card";
import { PageHeader } from "@/components/ui/page-header";
import { formatearCabeceraFecha } from "@/lib/date-utils";

interface Props {
  initialData: GuardiaDiarioData;
}

const PAGE_SIZE = 10;

// Helper para obtener la fecha de hoy en formato local YYYY-MM-DD
function getHoyFechaStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function MinutaGuardiaClient({ initialData }: Props) {
  const [data, setData] = useState<GuardiaDiarioData>(initialData);
  const [selectedPropiedadId, setSelectedPropiedadId] = useState<string>(
    initialData.propiedadAsignada?.id || (initialData.esAdmin ? initialData.propiedades[0]?.id || "" : "")
  );
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [incidenciaAEditar, setIncidenciaAEditar] = useState<IncidenciaItem | null>(null);
  const [novedadFicha, setNovedadFicha] = useState<IncidenciaItem | null>(null);

  // Estados de Filtro y Búsqueda (por defecto inicia filtrando la fecha de hoy)
  const [busqueda, setBusqueda] = useState("");
  const [categoriaFiltro, setCategoriaFiltro] = useState<string>("TODOS");
  const [fechaFiltro, setFechaFiltro] = useState<string>(getHoyFechaStr());
  const [paginaActual, setPaginaActual] = useState(1);

  // Recargar datos de la bitácora de seguridad
  const refrescarDatos = async (propiedadId?: string) => {
    try {
      setIsRefreshing(true);
      const targetId = propiedadId || selectedPropiedadId;
      const res = await getGuardiaDiarioDataAction(targetId);
      setData(res);
      if (res.propiedadAsignada?.id && !selectedPropiedadId) {
        setSelectedPropiedadId(res.propiedadAsignada.id);
      }
      toast.success("Bitácora actualizada.");
    } catch (err) {
      console.error("Error al refrescar bitácora:", err);
      toast.error("Error al actualizar los registros.");
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleCambioPropiedad = (propId: string) => {
    setSelectedPropiedadId(propId);
    refrescarDatos(propId);
    setPaginaActual(1);
  };

  const propiedadActual =
    data.propiedadAsignada ||
    data.propiedades.find((p) => p.id === selectedPropiedadId) ||
    null;

  // Opciones de inmueble para el FilterDropdown (solo Administrador)
  const opcionesPropiedades = useMemo((): FilterDropdownOption[] => {
    return data.propiedades.map((p) => ({
      value: p.id,
      label: p.nombre,
      subtitle: p.ciudad,
      icon: Building2,
    }));
  }, [data.propiedades]);

  // Opciones de categoría temáticas
  const opcionesCategorias = useMemo((): FilterDropdownOption[] => {
    return [
      {
        value: "TODOS",
        label: "Todas las Categorías",
        icon: Filter,
        isGlobal: true,
      },
      {
        value: CategoriaNovedad.RONDA_DE_RUTINA,
        label: "Ronda de Rutina / Vigilancia",
        icon: ShieldCheck,
      },
      {
        value: CategoriaNovedad.INCIDENCIA_SEGURIDAD,
        label: "Incidencia de Seguridad",
        icon: AlertTriangle,
      },
      {
        value: CategoriaNovedad.FALLA_INFRAESTRUCTURA,
        label: "Falla / Avería",
        icon: Wrench,
      },
      {
        value: CategoriaNovedad.ACCESO_VEHICULAR,
        label: "Control de Acceso / Vehicular",
        icon: Car,
      },
      {
        value: CategoriaNovedad.OTRO,
        label: "Otro Suceso",
        icon: HelpCircle,
      },
    ];
  }, []);

  // Métricas del inmueble
  const metricas = useMemo(() => {
    const lista = data.incidencias || data.incidenciasHoy || [];
    const totalMes = lista.length;
    const totalHoy = data.incidenciasHoy.length;
    const criticas = lista.filter(
      (i) => i.categoria === "INCIDENCIA_SEGURIDAD" || i.categoria === "FALLA_INFRAESTRUCTURA"
    ).length;

    return { totalMes, totalHoy, criticas };
  }, [data.incidencias, data.incidenciasHoy]);

  // Filtrado de incidencias del inmueble (estrictamente por la fecha seleccionada)
  const incidenciasFiltradas = useMemo(() => {
    const lista = data.incidencias || data.incidenciasHoy || [];

    return lista.filter((item) => {
      // Filtro por categoría
      if (categoriaFiltro !== "TODOS" && item.categoria !== categoriaFiltro) {
        return false;
      }

      // Filtro por fecha específica
      if (fechaFiltro) {
        const itemDate = new Date(item.fecha);
        const itemDateStr = `${itemDate.getFullYear()}-${String(itemDate.getMonth() + 1).padStart(2, "0")}-${String(itemDate.getDate()).padStart(2, "0")}`;
        if (itemDateStr !== fechaFiltro) return false;
      }

      // Filtro por búsqueda de texto
      if (busqueda.trim()) {
        const q = busqueda.toLowerCase().trim();
        const coincideTitulo = item.titulo.toLowerCase().includes(q);
        const coincideDetalle = item.descripcion.toLowerCase().includes(q);
        const coincideVigilante = item.empleadoNombre.toLowerCase().includes(q);
        return coincideTitulo || coincideDetalle || coincideVigilante;
      }

      return true;
    });
  }, [data.incidencias, data.incidenciasHoy, categoriaFiltro, fechaFiltro, busqueda]);

  // Paginación local
  const totalPaginas = Math.ceil(incidenciasFiltradas.length / PAGE_SIZE) || 1;
  const paginaSegura = Math.min(Math.max(1, paginaActual), totalPaginas);
  const inicio = (paginaSegura - 1) * PAGE_SIZE;
  const fin = inicio + PAGE_SIZE;
  const incidenciasPagina = incidenciasFiltradas.slice(inicio, fin);

  // Agrupar las incidencias de la página por día en orden cronológico
  const gruposPorDia = useMemo(() => {
    const grupos: Array<{
      fechaKey: string;
      cabecera: ReturnType<typeof formatearCabeceraFecha>;
      items: IncidenciaItem[];
    }> = [];

    for (const item of incidenciasPagina) {
      const d = new Date(item.fecha);
      const fechaKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

      let g = grupos.find((x) => x.fechaKey === fechaKey);
      if (!g) {
        g = {
          fechaKey,
          cabecera: formatearCabeceraFecha(item.fecha),
          items: [],
        };
        grupos.push(g);
      }
      g.items.push(item);
    }
    return grupos;
  }, [incidenciasPagina]);

  const tienePropiedad = Boolean(selectedPropiedadId || data.propiedadAsignada);

  return (
    <div className="space-y-6">
      {/* 1. CABECERA PRINCIPAL INSTITUCIONAL */}
      <PageHeader
        title="Bitácora de Seguridad"
        icon={<ShieldCheck className="w-6 h-6 text-white" />}
        description={
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs text-slate-500 font-medium">
            <span className="flex items-center gap-1.5 font-semibold text-slate-700">
              <Building2 className="w-3.5 h-3.5 text-slate-400" />
              {propiedadActual?.nombre || (data.esAdmin ? "Todos los Inmuebles" : "Sin Sede Asignada")}
            </span>
            <span className="text-slate-300">•</span>
            <span className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              Hoy, {new Date().toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long" })}
            </span>
          </div>
        }
        actions={
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full sm:w-auto">
            {data.esAdmin && data.propiedades.length > 1 && (
              <FilterDropdown
                value={selectedPropiedadId}
                onChange={handleCambioPropiedad}
                options={opcionesPropiedades}
                placeholder="Seleccionar Inmueble"
                icon={Building2}
                className="w-full sm:w-auto"
                buttonClassName="h-11"
                menuWidth="w-64"
                align="right"
              />
            )}

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => refrescarDatos()}
                disabled={isRefreshing}
                className="h-11 w-11 rounded-xl border border-slate-200/90 bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-900 flex items-center justify-center shrink-0 shadow-2xs transition-all cursor-pointer active:scale-95 disabled:opacity-50"
                title="Actualizar bitácora"
              >
                <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin text-[#175E38]" : ""}`} />
              </button>

              <button
                type="button"
                onClick={() => setIsReportModalOpen(true)}
                disabled={!tienePropiedad}
                className="flex-1 sm:flex-initial h-11 px-5 rounded-xl bg-gradient-to-r from-[#175E38] to-[#124b2d] text-white font-bold text-xs sm:text-sm hover:from-[#145332] hover:to-[#0f3d24] border-b-[3px] border-b-[#0e3a23] active:translate-y-0.5 shadow-[0_2px_8px_rgba(23,94,56,0.25)] flex items-center justify-center gap-2 transition-all cursor-pointer shrink-0 disabled:opacity-50"
              >
                <Plus className="w-4 h-4 stroke-[2.5]" />
                <span>Registrar Novedad</span>
              </button>
            </div>
          </div>
        }
      />

      {/* Alerta si el vigilante no tiene propiedad asignada */}
      {!tienePropiedad && !data.esAdmin && (
        <div className="rounded-2xl bg-amber-50 border border-amber-200 p-6 sm:p-8 text-center shadow-2xs flex flex-col items-center">
          <div className="w-12 h-12 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center mb-3">
            <AlertCircle className="w-6 h-6 stroke-[2]" />
          </div>
          <h3 className="font-heading font-black text-amber-900 text-base sm:text-lg">
            Sin Sede de Trabajo Asignada
          </h3>
          <p className="text-xs sm:text-sm text-amber-800 max-w-md mt-1">
            Tu cuenta de personal de seguridad aún no tiene un inmueble asignado. Comunícate con la administración para que configure tu sede de trabajo en el módulo de Personal.
          </p>
        </div>
      )}

      {/* 2. STATCARDS OPERATIVAS */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <StatCard
          title="Total en Bitácora"
          value={metricas.totalMes}
          icon={Layers}
          color="navy"
          subtitle="Registros acumulados"
        />
        <StatCard
          title="Novedades de Hoy"
          value={metricas.totalHoy}
          icon={Clock}
          color="emerald"
          subtitle="Registros en la jornada"
        />
        <StatCard
          title="Alertas / Novedades"
          value={metricas.criticas}
          icon={AlertTriangle}
          color={metricas.criticas > 0 ? "amber" : "indigo"}
          subtitle={metricas.criticas > 0 ? "Requieren atención" : "Sin incidencias críticas"}
        />
      </section>

      {/* 3. BARRA DE HERRAMIENTAS Y FILTROS HÍBRIDOS */}
      <section className="bg-white rounded-2xl border border-slate-200/90 border-b-[3px] border-b-slate-300/90 p-4 shadow-2xs space-y-3 relative z-30">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-3">
          
          {/* Input de Búsqueda */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={busqueda}
              onChange={(e) => {
                setBusqueda(e.target.value);
                setPaginaActual(1);
              }}
              placeholder="Buscar por título, detalle o vigilante..."
              className="w-full h-11 pl-9 pr-3 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1C2539]/20 focus:border-[#1C2539]"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full lg:w-auto">
            {/* Dropdown de Categorías */}
            <FilterDropdown
              value={categoriaFiltro}
              onChange={(val) => {
                setCategoriaFiltro(val);
                setPaginaActual(1);
              }}
              options={opcionesCategorias}
              placeholder="Todas las Categorías"
              icon={Filter}
              className="w-full"
              buttonClassName="h-11 w-full lg:min-w-[190px]"
              menuWidth="w-full sm:w-64"
              align="right"
            />

            {/* Selector de Fecha Híbrido Institucional */}
            <DateFilterPicker
              value={fechaFiltro}
              onChange={(val) => {
                setFechaFiltro(val || getHoyFechaStr());
                setPaginaActual(1);
              }}
              className="w-full"
              buttonClassName="h-11 w-full lg:min-w-[210px]"
              align="right"
            />
          </div>
        </div>
      </section>

      {/* 4. FEED CRONOLÓGICO DE INCIDENCIAS */}
      <section className="space-y-4">
        {/* Cabecera de Sección Responsiva */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5 sm:gap-2 px-1">
          <div className="flex items-center gap-2">
            <h2 className="text-sm sm:text-base font-black font-heading text-slate-900 tracking-tight">
              {fechaFiltro === getHoyFechaStr() ? "Novedades de Hoy" : "Novedades de la Fecha"}
            </h2>
            <span className="px-2 py-0.5 rounded-full text-xs font-extrabold bg-[#1C2539] text-white shadow-2xs">
              {incidenciasFiltradas.length}
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
            <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span>
              {propiedadActual?.nombre || "Inmueble Asignado"}
            </span>
          </div>
        </div>

        {/* Estado Vacío */}
        {incidenciasFiltradas.length === 0 ? (
          <div className="rounded-2xl bg-white border border-slate-200/90 border-b-[3px] border-b-slate-300/90 p-8 sm:p-12 text-center shadow-2xs flex flex-col items-center">
            <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-[#175E38] border border-emerald-100 flex items-center justify-center mb-3">
              <ShieldCheck className="w-7 h-7 stroke-[2]" />
            </div>
            <h3 className="font-heading font-black text-slate-800 text-base sm:text-lg">
              Sin incidencias encontradas
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 max-w-md mt-1 mb-5">
              No hay reportes que coincidan con los filtros aplicados. Puedes cambiar el período o reportar una nueva novedad.
            </p>
            <button
              type="button"
              onClick={() => setIsReportModalOpen(true)}
              disabled={!tienePropiedad}
              className="h-10 px-4 rounded-xl bg-[#175E38] text-white font-bold text-xs hover:bg-[#124b2d] flex items-center gap-2 transition-all cursor-pointer shadow-sm active:translate-y-0.5 disabled:opacity-50"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Reportar Novedad</span>
            </button>
          </div>
        ) : (
          /* Lista Agrupada por Día */
          <div className="space-y-6">
            {gruposPorDia.map((grupoDia) => (
              <div key={grupoDia.fechaKey} className="space-y-3">
                {/* Cabecera del Día */}
                <div className="flex items-center gap-2 pt-1 pb-0.5">
                  <span className="w-2 h-2 rounded-full bg-[#175E38] shrink-0" />
                  <h3 className="text-xs sm:text-sm font-bold text-slate-800 capitalize">
                    {grupoDia.cabecera.fechaLimpia}
                  </h3>
                  <span className="text-[11px] font-semibold text-[#175E38] bg-emerald-50 border border-emerald-200/80 px-2 py-0.5 rounded-full">
                    {grupoDia.items.length} {grupoDia.items.length === 1 ? "novedad" : "novedades"}
                  </span>
                </div>

                {/* Cuadrícula de Tarjetas */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
                  {grupoDia.items.map((incidencia: IncidenciaItem) => {
                    const catCfg =
                      CATEGORIA_NOVEDAD_CONFIG[incidencia.categoria] ||
                      CATEGORIA_NOVEDAD_CONFIG.OTRO;
                    const { badgeLabel, tituloLimpio } = parseNovedadTitulo(
                      incidencia.categoria,
                      incidencia.titulo
                    );

                    return (
                      <article
                        key={incidencia.id}
                        className="group/card rounded-2xl bg-white border border-slate-200/90 hover:border-slate-300 p-4 sm:p-4.5 shadow-2xs hover:shadow-md transition-all relative overflow-hidden flex flex-col justify-between gap-3"
                      >
                        {/* Sol Lite ambiental temático según categoría */}
                        <div className="absolute -top-7 -left-7 w-20 h-20 pointer-events-none rounded-full overflow-hidden z-0">
                          <div
                            className={`absolute inset-0 rounded-full ${catCfg.solClass || "bg-emerald-500/15"} blur-xl opacity-80 group-hover/card:opacity-100 group-hover/card:scale-125 transition-all duration-500`}
                          />
                        </div>

                        <div className="space-y-2.5 relative z-10">
                          {/* Metadatos superiores */}
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-extrabold border ${catCfg.badgeClass}`}
                            >
                              {badgeLabel}
                            </span>

                            <div className="flex items-center gap-2 shrink-0">
                              {incidencia.fotos && incidencia.fotos.length > 0 && (
                                <span
                                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500"
                                  title={`${incidencia.fotos.length} fotografías adjuntas`}
                                >
                                  <Camera className="w-3.5 h-3.5 text-slate-400" />
                                  <span>{incidencia.fotos.length}</span>
                                </span>
                              )}
                              <span className="text-[11px] text-slate-400 font-medium">
                                {incidencia.horaFormateada}
                              </span>
                            </div>
                          </div>

                          {/* Título de la incidencia (sin descripción en card de resumen) */}
                          <div>
                            <h4 className="font-heading font-black text-slate-900 text-sm sm:text-base tracking-tight line-clamp-2 leading-snug">
                              {tituloLimpio}
                            </h4>
                          </div>
                        </div>

                        {/* Pie de la tarjeta: Datos del autor y botón Ver Ficha */}
                        <div className="pt-2.5 mt-auto border-t border-slate-100 flex items-center justify-between gap-2 relative z-10">
                          <div className="flex items-center gap-1.5 text-xs text-slate-600 truncate min-w-0">
                            <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span className="truncate font-medium">{incidencia.empleadoNombre}</span>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              type="button"
                              onClick={() => setNovedadFicha(incidencia)}
                              className="h-9 px-3 rounded-xl bg-slate-100 hover:bg-[#1C2539] text-slate-700 hover:text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs active:scale-95"
                            >
                              <Eye className="w-3.5 h-3.5 shrink-0" />
                              <span>Ver Ficha</span>
                            </button>

                            {data.esAdmin && (
                              <button
                                type="button"
                                onClick={() => {
                                  setIncidenciaAEditar(incidencia);
                                  setIsReportModalOpen(true);
                                }}
                                className="h-9 w-9 rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200/90 flex items-center justify-center transition-all cursor-pointer shadow-2xs active:scale-95"
                                title="Editar reporte (Admin)"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </div>
            ))}

            {/* Paginación */}
            {totalPaginas > 1 && (
              <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
                <div>
                  Mostrando{" "}
                  <span className="font-bold text-slate-800">
                    {inicio + 1} - {Math.min(fin, incidenciasFiltradas.length)}
                  </span>{" "}
                  de{" "}
                  <span className="font-bold text-slate-800">
                    {incidenciasFiltradas.length}
                  </span>{" "}
                  novedades
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    disabled={paginaSegura === 1}
                    onClick={() => setPaginaActual(paginaSegura - 1)}
                    className="w-8 h-8 rounded-lg border border-slate-200 bg-white text-slate-500 flex items-center justify-center transition-all hover:bg-slate-50 hover:border-slate-300 disabled:opacity-30 disabled:cursor-not-allowed shadow-2xs cursor-pointer"
                    aria-label="Página anterior"
                  >
                    <ChevronDown className="w-3.5 h-3.5 rotate-90" />
                  </button>

                  {Array.from({ length: totalPaginas }, (_, i) => i + 1)
                    .filter((p) => {
                      if (totalPaginas <= 5) return true;
                      return p === 1 || p === totalPaginas || Math.abs(p - paginaSegura) <= 1;
                    })
                    .reduce<(number | "...")[]>((acc, p, idx, arr) => {
                      if (idx > 0 && typeof arr[idx - 1] === "number" && (p as number) - (arr[idx - 1] as number) > 1) {
                        acc.push("...");
                      }
                      acc.push(p);
                      return acc;
                    }, [])
                    .map((pItem, idx) =>
                      pItem === "..." ? (
                        <span key={`ellipsis-${idx}`} className="w-8 h-8 flex items-center justify-center text-xs text-slate-400">
                          ···
                        </span>
                      ) : (
                        <button
                          key={pItem}
                          type="button"
                          onClick={() => setPaginaActual(pItem as number)}
                          className={`w-8 h-8 rounded-lg border text-xs font-bold transition-all shadow-2xs cursor-pointer ${
                            pItem === paginaSegura
                              ? "bg-[#175E38] border-[#175E38] text-white shadow-xs"
                              : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300"
                          }`}
                        >
                          {pItem}
                        </button>
                      )
                    )}

                  <button
                    type="button"
                    disabled={paginaSegura === totalPaginas}
                    onClick={() => setPaginaActual(paginaSegura + 1)}
                    className="w-8 h-8 rounded-lg border border-slate-200 bg-white text-slate-500 flex items-center justify-center transition-all hover:bg-slate-50 hover:border-slate-300 disabled:opacity-30 disabled:cursor-not-allowed shadow-2xs cursor-pointer"
                    aria-label="Página siguiente"
                  >
                    <ChevronDown className="w-3.5 h-3.5 -rotate-90" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      {/* Modal de Registro y Edición de Novedades */}
      <ReportarNovedadModal
        isOpen={isReportModalOpen}
        onClose={() => {
          setIsReportModalOpen(false);
          setIncidenciaAEditar(null);
        }}
        propiedadId={incidenciaAEditar?.propiedadId || selectedPropiedadId}
        propiedades={data.propiedades}
        esAdmin={data.esAdmin}
        incidenciaAEditar={incidenciaAEditar}
        onNovedadRegistrada={() => {
          setIsReportModalOpen(false);
          setIncidenciaAEditar(null);
          refrescarDatos();
        }}
      />

      {/* Modal de Ficha Detallada de Novedad (con carga diferida de fotos) */}
      <NovedadFichaModal
        novedad={novedadFicha}
        isOpen={!!novedadFicha}
        onClose={() => setNovedadFicha(null)}
        onEditar={
          data.esAdmin
            ? (item) => {
                setIncidenciaAEditar(item);
                setIsReportModalOpen(true);
              }
            : undefined
        }
        esAdmin={data.esAdmin}
      />

    </div>
  );
}
