"use client";

import { useState, useMemo } from "react";
import {
  ShieldCheck,
  AlertTriangle,
  Clock,
  Building2,
  Calendar,
  Trash2,
  ChevronDown,
  Search,
  Filter,
  User,
  Layers,
  Wrench,
  Car,
  HelpCircle,
  MapPin,
  Eye,
  Camera,
  Plus,
  Pencil,
  X,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { FilterDropdown, type FilterDropdownOption } from "@/components/ui/filter-dropdown";
import { DateFilterPicker } from "@/components/ui/date-filter-picker";
import { WhatsAppIcon, getWhatsAppUrl } from "@/lib/formatters";
import { formatearCabeceraFecha } from "@/lib/date-utils";
import {
  type SeguridadDashboardData,
  type IncidenciaItem,
  CategoriaNovedad,
  CATEGORIA_NOVEDAD_CONFIG,
  parseNovedadTitulo,
} from "@/lib/types/seguridad";
import { NovedadFichaModal } from "@/app/empleado/minuta/NovedadFichaModal";
import { ReportarNovedadModal } from "@/app/empleado/minuta/ReportarNovedadModal";
import { eliminarIncidenciaAction } from "@/lib/actions/seguridad";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface SeguridadClientProps {
  initialData: SeguridadDashboardData;
}

const INCIDENCIAS_PAGE_SIZE = 10;

// Helper para obtener la fecha de hoy en formato local YYYY-MM-DD
function getHoyFechaStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function SeguridadClient({ initialData }: SeguridadClientProps) {
  const router = useRouter();
  const [incidencias, setIncidencias] = useState<IncidenciaItem[]>(initialData.incidencias);
  const [metricas] = useState(initialData.metricas);
  const [propiedades] = useState(initialData.propiedades);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [incidenciaAEditar, setIncidenciaAEditar] = useState<IncidenciaItem | null>(null);

  // Estados de Filtro (por defecto inicia filtrando la fecha de hoy)
  const [busqueda, setBusqueda] = useState("");
  const [propiedadFiltro, setPropiedadFiltro] = useState<string>("TODOS");
  const [categoriaFiltro, setCategoriaFiltro] = useState<string>("TODOS");
  const [fechaFiltro, setFechaFiltro] = useState<string>(getHoyFechaStr());

  // Estados de acordeón por propiedad (Lazy mounting + paginación local)
  const [propiedadesDesplegadas, setPropiedadesDesplegadas] = useState<Record<string, boolean>>({});
  const [propiedadesCargadas, setPropiedadesCargadas] = useState<Record<string, boolean>>({});
  const [paginasPorPropiedad, setPaginasPorPropiedad] = useState<Record<string, number>>({});


  // Ficha detallada de novedad
  const [novedadFicha, setNovedadFicha] = useState<IncidenciaItem | null>(null);

  // Estado de confirmación de eliminación
  const [incidenciaAEliminar, setIncidenciaAEliminar] = useState<IncidenciaItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Opciones para el selector híbrido de Inmuebles
  const opcionesPropiedades = useMemo((): FilterDropdownOption[] => {
    return [
      {
        value: "TODOS",
        label: "Todos los Inmuebles",
        icon: Layers,
        isGlobal: true,
        count: incidencias.length,
      },
      ...propiedades.map((p) => ({
        value: p.id,
        label: p.nombre,
        subtitle: p.ciudad,
        icon: Building2,
        count: incidencias.filter((i) => i.propiedadId === p.id).length,
      })),
    ];
  }, [propiedades, incidencias]);

  // Opciones para el selector híbrido de Categorías
  const opcionesCategorias = useMemo((): FilterDropdownOption[] => {
    return [
      {
        value: "TODOS",
        label: "Todas las Categorías",
        icon: Filter,
        isGlobal: true,
        count: incidencias.length,
      },
      {
        value: CategoriaNovedad.RONDA_DE_RUTINA,
        label: "Vigilancia Diaria",
        icon: ShieldCheck,
        count: incidencias.filter((i) => i.categoria === CategoriaNovedad.RONDA_DE_RUTINA).length,
      },
      {
        value: CategoriaNovedad.INCIDENCIA_SEGURIDAD,
        label: "Incidencia de Seguridad",
        icon: AlertTriangle,
        count: incidencias.filter((i) => i.categoria === CategoriaNovedad.INCIDENCIA_SEGURIDAD).length,
      },
      {
        value: CategoriaNovedad.FALLA_INFRAESTRUCTURA,
        label: "Falla / Avería",
        icon: Wrench,
        count: incidencias.filter((i) => i.categoria === CategoriaNovedad.FALLA_INFRAESTRUCTURA).length,
      },
      {
        value: CategoriaNovedad.ACCESO_VEHICULAR,
        label: "Control de Acceso",
        icon: Car,
        count: incidencias.filter((i) => i.categoria === CategoriaNovedad.ACCESO_VEHICULAR).length,
      },
      {
        value: CategoriaNovedad.OTRO,
        label: "Otros Sucesos",
        icon: HelpCircle,
        count: incidencias.filter((i) => i.categoria === CategoriaNovedad.OTRO).length,
      },
    ];
  }, [incidencias]);

  // Filtrado de incidencias en memoria (estrictamente por la fecha seleccionada)
  const incidenciasFiltradas = useMemo(() => {
    return incidencias.filter((item) => {
      // Filtro por propiedad
      if (propiedadFiltro !== "TODOS" && item.propiedadId !== propiedadFiltro) {
        return false;
      }

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
        const query = busqueda.toLowerCase();
        const coincideTitulo = item.titulo.toLowerCase().includes(query);
        const coincideDetalle = item.descripcion.toLowerCase().includes(query);
        const coincideEmpleado = item.empleadoNombre.toLowerCase().includes(query);
        const coincidePropiedad = item.propiedadNombre.toLowerCase().includes(query);

        if (!coincideTitulo && !coincideDetalle && !coincideEmpleado && !coincidePropiedad) {
          return false;
        }
      }

      return true;
    });
  }, [incidencias, propiedadFiltro, categoriaFiltro, fechaFiltro, busqueda]);

  // Alternar apertura/cierre de acordeón por inmueble con carga diferida
  const toggleDesplieguePropiedad = (propId: string) => {
    setPropiedadesDesplegadas((prev) => {
      const estaAbierta =
        prev[propId] !== undefined
          ? prev[propId]
          : busqueda.trim() !== "" || (propiedadFiltro !== "TODOS" && propiedadFiltro === propId);
      const nuevoEstado = !estaAbierta;
      if (nuevoEstado) {
        setPropiedadesCargadas((cPrev) => ({ ...cPrev, [propId]: true }));
      }
      return { ...prev, [propId]: nuevoEstado };
    });
  };

  // Cambio de página local por inmueble
  const cambiarPaginaPropiedad = (propId: string, page: number) => {
    setPaginasPorPropiedad((prev) => ({ ...prev, [propId]: page }));
  };

  // Agrupación jerárquica de incidencias por inmueble
  const gruposPorPropiedad = useMemo(() => {
    const mapa = new Map<string, IncidenciaItem[]>();
    for (const inc of incidenciasFiltradas) {
      const list = mapa.get(inc.propiedadId) || [];
      list.push(inc);
      mapa.set(inc.propiedadId, list);
    }

    const ahora = new Date();
    const hoyInicio = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate(), 0, 0, 0);

    const grupos: Array<{
      propiedad: { id: string; nombre: string; ciudad?: string };
      incidencias: IncidenciaItem[];
      hoyCount: number;
    }> = [];

    // Propiedades registradas en el catálogo
    for (const prop of propiedades) {
      if (propiedadFiltro !== "TODOS" && prop.id !== propiedadFiltro) {
        continue;
      }
      const incs = mapa.get(prop.id) || [];
      if (incs.length > 0 || (propiedadFiltro !== "TODOS" && prop.id === propiedadFiltro)) {
        const hoyCount = incs.filter((i) => new Date(i.fecha) >= hoyInicio).length;
        grupos.push({
          propiedad: prop,
          incidencias: incs,
          hoyCount,
        });
      }
    }

    // Incidencias con propiedadId no presente en la lista de sedes
    for (const [propId, incs] of mapa.entries()) {
      if (!grupos.some((g) => g.propiedad.id === propId)) {
        const hoyCount = incs.filter((i) => new Date(i.fecha) >= hoyInicio).length;
        grupos.push({
          propiedad: {
            id: propId,
            nombre: incs[0]?.propiedadNombre || "Inmueble",
            ciudad: "Sede",
          },
          incidencias: incs,
          hoyCount,
        });
      }
    }

    return grupos;
  }, [incidenciasFiltradas, propiedades, propiedadFiltro]);

  // Ejecutar eliminación
  const confirmarEliminar = async () => {
    if (!incidenciaAEliminar) return;

    try {
      setIsDeleting(true);
      const res = await eliminarIncidenciaAction(incidenciaAEliminar.id);
      if (res.success) {
        toast.success(res.message);
        setIncidencias((prev) => prev.filter((i) => i.id !== incidenciaAEliminar.id));
        setIncidenciaAEliminar(null);
        router.refresh();
      } else {
        toast.error(res.error || "No se pudo eliminar el reporte.");
      }
    } catch (err) {
      console.error("Error al eliminar incidencia:", err);
      toast.error("Ocurrió un error al procesar la solicitud.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. CABECERA INSTITUCIONAL */}
      <PageHeader
        title="Bitácora de Seguridad"
        icon={<ShieldCheck className="w-6 h-6 text-white" />}
        actions={
          <button
            type="button"
            id="btn-nueva-novedad"
            onClick={() => setIsReportModalOpen(true)}
            className="inline-flex items-center justify-center gap-1.5 px-4 sm:px-5 py-2.5 rounded-xl bg-[#175E38] text-white text-xs sm:text-sm font-semibold hover:bg-[#124b2d] transition-all shadow-sm hover:shadow cursor-pointer whitespace-nowrap active:translate-y-0.5"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Registrar Novedad</span>
          </button>
        }
      />

      {/* 2. STAT CARDS EJECUTIVAS */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <StatCard
          title="Total Incidencias (Mes)"
          value={metricas.totalIncidenciasMes}
          icon={Layers}
          color="navy"
          subtitle="Registros acumulados"
        />
        <StatCard
          title="Novedades de Hoy"
          value={metricas.incidenciasHoy}
          icon={AlertTriangle}
          color="emerald"
          subtitle="Reportes en la jornada"
        />
        <StatCard
          title="Inmuebles Reportados"
          value={metricas.propiedadesReportadas}
          icon={Building2}
          color="indigo"
          subtitle="Sedes con actividad"
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
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar por título, detalle, vigilante o sede..."
              className="w-full h-11 pl-9 pr-3 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1C2539]/20 focus:border-[#1C2539]"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 w-full lg:w-auto">
            {/* Dropdown Híbrido de Inmuebles */}
            <FilterDropdown
              value={propiedadFiltro}
              onChange={(val) => {
                setPropiedadFiltro(val);
                setPaginasPorPropiedad({});
              }}
              options={opcionesPropiedades}
              placeholder="Todos los Inmuebles"
              icon={Building2}
              className="w-full"
              buttonClassName="h-11 w-full lg:min-w-[180px]"
              menuWidth="w-full sm:w-68"
              align="right"
            />

            {/* Dropdown Híbrido de Categorías */}
            <FilterDropdown
              value={categoriaFiltro}
              onChange={(val) => {
                setCategoriaFiltro(val);
                setPaginasPorPropiedad({});
              }}
              options={opcionesCategorias}
              placeholder="Todas las Categorías"
              icon={Filter}
              className="w-full"
              buttonClassName="h-11 w-full lg:min-w-[170px]"
              menuWidth="w-full sm:w-64"
              align="right"
            />

            {/* Selector de Fecha Híbrido Institucional */}
            <DateFilterPicker
              value={fechaFiltro}
              onChange={(val) => {
                setFechaFiltro(val || getHoyFechaStr());
                setPaginasPorPropiedad({});
              }}
              className="w-full"
              buttonClassName="h-11 w-full lg:min-w-[190px]"
              align="right"
            />
          </div>
        </div>
      </section>

      {/* 4. LISTADO DE INCIDENCIAS AGRUPADAS POR INMUEBLE (SMOOTH ACCORDION PATTERN) */}
      <section className="space-y-4">
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
              {gruposPorPropiedad.length} {gruposPorPropiedad.length === 1 ? "inmueble con actividad" : "inmuebles con actividad"}
            </span>
          </div>
        </div>

        {gruposPorPropiedad.length === 0 || incidenciasFiltradas.length === 0 ? (
          <div className="rounded-2xl bg-white border border-slate-200/90 border-b-[3px] border-b-slate-300/90 p-8 sm:p-12 text-center shadow-2xs flex flex-col items-center">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-500 flex items-center justify-center mb-3">
              <Search className="w-6 h-6 stroke-[2]" />
            </div>
            <h3 className="font-heading font-black text-slate-800 text-base">
              No se encontraron incidencias
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mt-1">
              No hay reportes que coincidan con los filtros aplicados. Prueba ajustando la sede o el período de fechas.
            </p>
          </div>
        ) : (
          <div className="space-y-4 sm:space-y-5">
            {gruposPorPropiedad.map((grupo) => {
              const prop = grupo.propiedad;
              const estaDesplegada =
                propiedadesDesplegadas[prop.id] !== undefined
                  ? propiedadesDesplegadas[prop.id]
                  : busqueda.trim() !== "" ||
                    (propiedadFiltro !== "TODOS" && propiedadFiltro === prop.id) ||
                    (Boolean(fechaFiltro) && gruposPorPropiedad.length <= 4);
              const haSidoMontada = estaDesplegada || !!propiedadesCargadas[prop.id];

              const totalPaginas = Math.ceil(grupo.incidencias.length / INCIDENCIAS_PAGE_SIZE) || 1;
              const paginaActual = Math.min(Math.max(1, paginasPorPropiedad[prop.id] ?? 1), totalPaginas);
              const inicio = (paginaActual - 1) * INCIDENCIAS_PAGE_SIZE;
              const fin = inicio + INCIDENCIAS_PAGE_SIZE;
              const incidenciasPagina = grupo.incidencias.slice(inicio, fin);

              // Agrupar las incidencias de la página por día en orden cronológico
              const gruposPorDia: Array<{
                fechaKey: string;
                cabecera: ReturnType<typeof formatearCabeceraFecha>;
                items: IncidenciaItem[];
              }> = [];

              for (const item of incidenciasPagina) {
                const d = new Date(item.fecha);
                const fechaKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

                let g = gruposPorDia.find((x) => x.fechaKey === fechaKey);
                if (!g) {
                  g = {
                    fechaKey,
                    cabecera: formatearCabeceraFecha(item.fecha),
                    items: [],
                  };
                  gruposPorDia.push(g);
                }
                g.items.push(item);
              }

              return (
                <section
                  key={prop.id}
                  className={`group/acordeon relative overflow-hidden bg-gradient-to-b from-white via-white to-slate-50/60 rounded-2xl sm:rounded-3xl border border-slate-200/90 border-b-[3px] border-b-slate-300/90 shadow-[0_4px_20px_-2px_rgba(28,37,57,0.07),0_2px_6px_-1px_rgba(28,37,57,0.04)] hover:shadow-[0_12px_28px_-4px_rgba(28,37,57,0.11),0_4px_8px_-2px_rgba(28,37,57,0.05)] transition-all duration-300 ${
                    estaDesplegada ? "border-slate-300/90 ring-1 ring-slate-300/60 shadow-md" : ""
                  }`}
                >
                  {/* Resplandor ambiental en esquina superior izquierda */}
                  <div className="absolute -top-8 -left-8 w-28 h-28 pointer-events-none overflow-hidden rounded-full z-0">
                    <div className="absolute inset-0 rounded-full bg-emerald-500/15 blur-xl" />
                    <div className="absolute inset-3 rounded-full border border-emerald-500/20 bg-emerald-500/[0.05]" />
                    <div className="absolute inset-7 rounded-full bg-gradient-to-br from-emerald-500/20 to-transparent transition-transform duration-500 group-hover/acordeon:scale-125" />
                  </div>

                  {/* Cabecera del Inmueble (Clickeable) */}
                  <div
                    onClick={() => toggleDesplieguePropiedad(prop.id)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        toggleDesplieguePropiedad(prop.id);
                      }
                    }}
                    className="w-full relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 p-4 sm:p-5 cursor-pointer hover:bg-slate-50/40 transition-colors select-none text-left"
                    title={estaDesplegada ? "Clic para cerrar reportes" : "Clic para ver novedades"}
                  >
                    {/* Información Principal */}
                    <div className="flex items-start sm:items-center gap-3 min-w-0">
                      <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-white/95 text-slate-800 flex items-center justify-center shrink-0 border border-slate-200/90 shadow-2xs backdrop-blur-xs mt-0.5 sm:mt-0">
                        <Building2 className="w-5 h-5 text-[#1C2539]" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-base sm:text-lg font-black text-black font-heading tracking-tight">
                            {prop.nombre}
                          </h3>
                        </div>
                        {prop.ciudad && (
                          <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                            <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                            <span>{prop.ciudad}</span>
                          </p>
                        )}

                        {/* Badges de conteo */}
                        <div className="flex items-center gap-1.5 mt-2 flex-wrap text-xs">
                          <span className="px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-700 font-bold border border-slate-200/70 text-[11px]">
                            {grupo.incidencias.length} {grupo.incidencias.length === 1 ? "reporte" : "reportes"}
                          </span>
                          {grupo.hoyCount > 0 && (
                            <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 font-bold text-[11px] border border-emerald-200/70">
                              {grupo.hoyCount} hoy
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Botón Desplegable */}
                    <div className="w-full sm:w-auto flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                      <div className="flex items-center gap-2 cursor-pointer text-slate-700 hover:text-black transition-colors">
                        <div
                          className={`w-8 h-8 rounded-xl flex items-center justify-center border border-slate-200/90 bg-white/95 text-slate-700 hover:text-black hover:bg-slate-100 transition-all duration-300 shadow-2xs ${
                            estaDesplegada ? "rotate-180 bg-slate-100 text-black border-slate-300" : ""
                          }`}
                        >
                          <ChevronDown className="w-4 h-4 stroke-[2.5]" />
                        </div>
                        <span className="text-xs font-bold text-slate-600 select-none">
                          {estaDesplegada ? "Cerrar" : "Ver novedades"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Contenedor Animado con CSS Grid */}
                  <div
                    className={`grid transition-all duration-300 ease-in-out ${
                      estaDesplegada
                        ? "grid-rows-[1fr] opacity-100"
                        : "grid-rows-[0fr] opacity-0 pointer-events-none"
                    }`}
                  >
                    <div className="overflow-hidden">
                      {haSidoMontada && (
                        <div className="border-t border-slate-100 p-4 sm:p-5 pt-3 sm:pt-4 space-y-4">
                          {grupo.incidencias.length === 0 ? (
                            <div className="p-6 text-center text-slate-400 text-xs">
                              No hay reportes de seguridad en este inmueble para el período seleccionado.
                            </div>
                          ) : (
                            <>
                              <div className="space-y-8 sm:space-y-10">
                                {gruposPorDia.map((grupoDia) => (
                                  <div key={grupoDia.fechaKey} className="space-y-3.5 sm:space-y-4">
                                    {/* Separador Institucional de Fecha */}
                                    <div className="flex items-center gap-2.5 sm:gap-3 pt-2">
                                      <div className="flex items-center gap-2 shrink-0">
                                        <span className="text-xs sm:text-sm font-black font-heading text-slate-800 tracking-tight flex items-center gap-1.5">
                                          <Calendar className="w-4 h-4 text-slate-500 shrink-0" />
                                          <span>{grupoDia.cabecera.fechaLimpia}</span>
                                        </span>

                                        <span className="text-[11px] font-bold text-[#175E38] bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/80">
                                          {grupoDia.items.length} {grupoDia.items.length === 1 ? "novedad" : "novedades"}
                                        </span>
                                      </div>

                                      <div className="h-px bg-slate-200/80 flex-1" />
                                    </div>

                                    {/* Grid de 4 columnas para este día */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
                                      {grupoDia.items.map((item) => {
                                        const catCfg =
                                          CATEGORIA_NOVEDAD_CONFIG[item.categoria] ||
                                          CATEGORIA_NOVEDAD_CONFIG.OTRO;
                                        const { badgeLabel, tituloLimpio } = parseNovedadTitulo(
                                          item.categoria,
                                          item.titulo
                                        );

                                        const whatsappUrl = item.empleadoTelefono
                                          ? getWhatsAppUrl(
                                              item.empleadoTelefono,
                                              `Hola ${item.empleadoNombre}, te contacto respecto al reporte de seguridad "${tituloLimpio}" registrado el ${item.fechaFormateada}.`
                                            )
                                          : null;

                                        return (
                                          <article
                                            key={item.id}
                                            className="group/card rounded-2xl bg-white border border-slate-200/90 hover:border-slate-300 p-4 sm:p-4.5 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between relative overflow-hidden gap-3"
                                          >
                                            {/* Sol Lite ambiental temático según categoría */}
                                            <div className="absolute -top-7 -left-7 w-20 h-20 pointer-events-none rounded-full overflow-hidden z-0">
                                              <div
                                                className={`absolute inset-0 rounded-full ${catCfg.solClass || "bg-emerald-500/15"} blur-xl opacity-80 group-hover/card:opacity-100 group-hover/card:scale-125 transition-all duration-500`}
                                              />
                                            </div>

                                            <div className="space-y-2.5 relative z-10">
                                              {/* Fila superior: Categoría, Fotos y Hora */}
                                              <div className="flex items-center justify-between gap-2">
                                                <span
                                                  className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-extrabold border ${catCfg.badgeClass}`}
                                                >
                                                  {badgeLabel}
                                                </span>

                                                <div className="flex items-center gap-2 shrink-0">
                                                  {item.fotos && item.fotos.length > 0 && (
                                                    <span
                                                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500"
                                                      title={`${item.fotos.length} fotografías adjuntas`}
                                                    >
                                                      <Camera className="w-3.5 h-3.5 text-slate-400" />
                                                      <span>{item.fotos.length}</span>
                                                    </span>
                                                  )}
                                                  <span className="text-[11px] text-slate-400 font-medium">
                                                    {item.horaFormateada}
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

                                            {/* Pie de la tarjeta: Autor + 3 Botones */}
                                            <div className="pt-3 mt-auto border-t border-slate-100 space-y-2.5 relative z-10">
                                              {/* Fila 1: Nombre del Personal */}
                                              <div className="flex items-center justify-between gap-2 text-xs">
                                                <span className="font-bold text-slate-700 text-xs flex items-center gap-1.5 min-w-0">
                                                  <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                                  <span className="truncate">{item.empleadoNombre}</span>
                                                </span>
                                              </div>

                                              {/* Fila 2: Los 3 botones organizados con altura táctil ergonómica en móvil */}
                                              <div className="flex items-center gap-2">
                                                <button
                                                  type="button"
                                                  onClick={() => setNovedadFicha(item)}
                                                  className="flex-1 h-10 sm:h-8.5 px-3 rounded-xl text-xs font-bold bg-[#1C2539] text-white hover:bg-[#2a3754] transition-all cursor-pointer shadow-xs active:translate-y-0.5 flex items-center justify-center gap-1.5"
                                                >
                                                  <Eye className="w-3.5 h-3.5 shrink-0" />
                                                  <span>Ver Ficha</span>
                                                </button>

                                                {whatsappUrl && (
                                                  <a
                                                    href={whatsappUrl}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="h-10 w-10 sm:h-8.5 sm:w-8.5 rounded-xl bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200/90 flex items-center justify-center transition-all cursor-pointer shrink-0 shadow-2xs active:scale-95"
                                                    title="Contactar al vigilante por WhatsApp"
                                                  >
                                                    <WhatsAppIcon className="w-4 h-4 text-[#25D366]" />
                                                  </a>
                                                )}

                                                <button
                                                  type="button"
                                                  onClick={() => {
                                                    setIncidenciaAEditar(item);
                                                    setIsReportModalOpen(true);
                                                  }}
                                                  className="h-10 w-10 sm:h-8.5 sm:w-8.5 rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200/90 flex items-center justify-center transition-all cursor-pointer shrink-0 shadow-2xs active:scale-95"
                                                  title="Editar reporte de seguridad"
                                                >
                                                  <Pencil className="w-4 h-4" />
                                                </button>

                                                <button
                                                  type="button"
                                                  onClick={() => setIncidenciaAEliminar(item)}
                                                  className="h-10 w-10 sm:h-8.5 sm:w-8.5 rounded-xl bg-rose-50 text-rose-600 hover:bg-rose-100 border border-rose-200/90 flex items-center justify-center transition-all cursor-pointer shrink-0 shadow-2xs active:scale-95"
                                                  title="Eliminar reporte de auditoría"
                                                >
                                                  <Trash2 className="w-4 h-4" />
                                                </button>
                                              </div>
                                            </div>
                                          </article>
                                        );
                                      })}
                                    </div>
                                  </div>
                                ))}
                              </div>


                              {/* Paginación Local */}
                              {totalPaginas > 1 && (
                                <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                  <p className="text-xs text-slate-400 font-medium">
                                    {inicio + 1}–{Math.min(fin, grupo.incidencias.length)} de{" "}
                                    <span className="font-bold text-slate-600">{grupo.incidencias.length}</span> reportes
                                  </p>

                                  <div className="flex items-center gap-1.5 self-center sm:self-auto">
                                    <button
                                      type="button"
                                      disabled={paginaActual === 1}
                                      onClick={() => cambiarPaginaPropiedad(prop.id, paginaActual - 1)}
                                      className="w-8 h-8 rounded-lg border border-slate-200 bg-white text-slate-500 flex items-center justify-center transition-all hover:bg-slate-50 hover:border-slate-300 disabled:opacity-30 disabled:cursor-not-allowed shadow-2xs"
                                      aria-label="Página anterior"
                                    >
                                      <ChevronDown className="w-3.5 h-3.5 rotate-90" />
                                    </button>

                                    {Array.from({ length: totalPaginas }, (_, i) => i + 1)
                                      .filter((p) => {
                                        if (totalPaginas <= 5) return true;
                                        return p === 1 || p === totalPaginas || Math.abs(p - paginaActual) <= 1;
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
                                            onClick={() => cambiarPaginaPropiedad(prop.id, pItem as number)}
                                            className={`w-8 h-8 rounded-lg border text-xs font-bold transition-all shadow-2xs ${
                                              pItem === paginaActual
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
                                      disabled={paginaActual === totalPaginas}
                                      onClick={() => cambiarPaginaPropiedad(prop.id, paginaActual + 1)}
                                      className="w-8 h-8 rounded-lg border border-slate-200 bg-white text-slate-500 flex items-center justify-center transition-all hover:bg-slate-50 hover:border-slate-300 disabled:opacity-30 disabled:cursor-not-allowed shadow-2xs"
                                      aria-label="Página siguiente"
                                    >
                                      <ChevronDown className="w-3.5 h-3.5 -rotate-90" />
                                    </button>
                                  </div>
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </section>


      {/* Modal de Ficha Detallada de Novedad (con carga diferida de fotos) */}
      <NovedadFichaModal
        novedad={novedadFicha}
        isOpen={!!novedadFicha}
        onClose={() => setNovedadFicha(null)}
        onEditar={(item) => {
          setIncidenciaAEditar(item);
          setIsReportModalOpen(true);
        }}
        onEliminar={(item) => setIncidenciaAEliminar(item)}
        esAdmin={true}
      />

      {/* Modal de Registro y Edición de Novedades */}
      <ReportarNovedadModal
        isOpen={isReportModalOpen}
        onClose={() => {
          setIsReportModalOpen(false);
          setIncidenciaAEditar(null);
        }}
        propiedadId={incidenciaAEditar?.propiedadId || initialData.propiedades[0]?.id || ""}
        propiedades={initialData.propiedades}
        esAdmin={true}
        incidenciaAEditar={incidenciaAEditar}
        onNovedadRegistrada={() => {
          setIsReportModalOpen(false);
          setIncidenciaAEditar(null);
          router.refresh();
        }}
      />

      {/* Modal de Confirmación de Borrado */}
      {incidenciaAEliminar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in-0 duration-200">
          <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden">
            <div className="bg-[#CC1A22] text-white p-4 flex items-center gap-3">
              <Trash2 className="w-5 h-5 shrink-0" />
              <div>
                <h3 className="font-heading font-bold text-sm">Eliminar Registro de Bitácora</h3>
                <p className="text-[11px] text-rose-100">Esta acción no se puede deshacer</p>
              </div>
            </div>
            <div className="p-5 space-y-3">
              <p className="text-xs text-slate-600 leading-relaxed">
                ¿Estás seguro de que deseas eliminar permanentemente el reporte{" "}
                <span className="font-bold text-slate-800">
                  &ldquo;{incidenciaAEliminar.titulo}&rdquo;
                </span>{" "}
                asentado por {incidenciaAEliminar.empleadoNombre}?
              </p>
              <div className="grid grid-cols-2 gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIncidenciaAEliminar(null)}
                  disabled={isDeleting}
                  className="h-10 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={confirmarEliminar}
                  disabled={isDeleting}
                  className="h-10 rounded-xl bg-[#CC1A22] hover:bg-[#a81219] text-white text-xs font-bold cursor-pointer transition-all flex items-center justify-center gap-1.5 shadow-sm"
                >
                  {isDeleting ? "Eliminando..." : "Eliminar Reporte"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
