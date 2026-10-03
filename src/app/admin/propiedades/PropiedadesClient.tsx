"use client";

import React, { useState, useTransition, useCallback, useMemo, useRef, useEffect } from "react";
import {
  Building2,
  Plus,
  Store,
  RefreshCw,
  Key,
  Search,
  ChevronDown,
  Check,
  X,
  UserCheck,
  Layers,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/ui/page-header";
import { Modal } from "@/components/ui/modal";
import { StatCard } from "@/components/ui/stat-card";
import { PropiedadForm } from "./PropiedadForm";
import { UnidadForm } from "./UnidadForm";
import { PropiedadesTab } from "./PropiedadesTab";
import { EspaciosTab } from "./EspaciosTab";
import { UnidadDetalleModal } from "./UnidadDetalleModal";
import {
  createPropiedad,
  updatePropiedad,
  deletePropiedad,
  type CreatePropiedadInput,
  type UpdatePropiedadInput,
} from "@/lib/actions/propiedades";
import {
  createUnidad,
  updateUnidad,
  deleteUnidad,
  type CreateUnidadInput,
  type UpdateUnidadInput,
} from "@/lib/actions/unidades";
import { TipoPropiedad, TipoUnidad, EstadoUnidad } from "@prisma/client";
import {
  TIPO_PROPIEDAD_LABEL,
  TIPO_PROPIEDAD_PLURAL,
  TIPO_UNIDAD_LABEL,
  tipoPropiedadBadgeConfig,
} from "./constants";
import type {
  PropiedadConConteo,
  UnidadConPropiedad,
  PropiedadesClientProps,
  Tab,
  ModalMode,
} from "./types";

// Re-exportar tipos para mantener compatibilidad total
export type { PropiedadConConteo, UnidadConPropiedad, PropiedadesClientProps };

// Componente orquestador del módulo de Propiedades y Espacios
export function PropiedadesClient({
  propiedades: initialPropiedades,
  unidades: initialUnidades,
  stats: initialStats,
}: PropiedadesClientProps) {
  const [activeTab, setActiveTab] = useState<Tab>("propiedades");
  const [filtroTipo, setFiltroTipo] = useState<string>("TODOS");
  const [busqueda, setBusqueda] = useState<string>("");

  // Filtros de espacios y acordeón desplegable
  const [filtroPropiedad, setFiltroPropiedad] = useState<string>("TODAS");
  const [propiedadesDesplegadas, setPropiedadesDesplegadas] = useState<Record<string, boolean>>({});
  const [propiedadesCargadas, setPropiedadesCargadas] = useState<Record<string, boolean>>({});
  const [paginasPorPropiedad, setPaginasPorPropiedad] = useState<Record<string, number>>({});
  const [isDropdownTipoOpen, setIsDropdownTipoOpen] = useState<boolean>(false);
  const [isDropdownPropiedadOpen, setIsDropdownPropiedadOpen] = useState<boolean>(false);

  const dropdownTipoRef = useRef<HTMLDivElement>(null);
  const dropdownPropiedadRef = useRef<HTMLDivElement>(null);

  const toggleDesplieguePropiedad = (propId: string) => {
    setPropiedadesDesplegadas((prev) => {
      const nuevoEstado = !prev[propId];
      if (nuevoEstado) {
        setPropiedadesCargadas((c) => ({ ...c, [propId]: true }));
        setPaginasPorPropiedad((p) => ({ ...p, [propId]: 1 }));
      }
      return { ...prev, [propId]: nuevoEstado };
    });
  };

  const irAEspaciosDePropiedad = (propiedadId: string) => {
    setFiltroPropiedad(propiedadId);
    setBusqueda("");
    setPropiedadesDesplegadas((prev) => ({ ...prev, [propiedadId]: true }));
    setPropiedadesCargadas((c) => ({ ...c, [propiedadId]: true }));
    setActiveTab("unidades");
  };

  const [propiedades, setPropiedades] = useState(initialPropiedades);
  const [unidades, setUnidades] = useState(initialUnidades);
  const [stats, setStats] = useState(initialStats);

  // Modales
  const [propiedadModal, setPropiedadModal] = useState<ModalMode>(null);
  const [propiedadSeleccionada, setPropiedadSeleccionada] = useState<PropiedadConConteo | null>(null);
  const [tipoModalPreseleccionado, setTipoModalPreseleccionado] = useState<TipoPropiedad | undefined>(undefined);

  const [unidadModal, setUnidadModal] = useState<ModalMode>(null);
  const [unidadSeleccionada, setUnidadSeleccionada] = useState<UnidadConPropiedad | null>(null);
  const [propiedadParaNuevaUnidad, setPropiedadParaNuevaUnidad] = useState<string | undefined>(undefined);

  const abrirDetalleUnidad = (unidad: UnidadConPropiedad) => {
    setUnidadSeleccionada(unidad);
    setUnidadModal("detalle");
  };

  const [isPending, startTransition] = useTransition();

  const recalcStats = useCallback((updatedUnidades: UnidadConPropiedad[], updatedProps: PropiedadConConteo[]) => {
    const totalUnidades = updatedUnidades.length;
    const ocupadas = updatedUnidades.filter((u) => u.estado === EstadoUnidad.OCUPADO).length;
    const disponibles = updatedUnidades.filter((u) => u.estado === EstadoUnidad.DISPONIBLE).length;
    const tasaOcupacion = totalUnidades > 0 ? Math.round((ocupadas / totalUnidades) * 100) : 0;

    setStats({
      totalPropiedades: updatedProps.length,
      totalUnidades,
      disponibles,
      ocupadas,
      tasaOcupacion,
    });
  }, []);

  // Tipologías registradas en BD
  const tiposDisponibles = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const p of propiedades) {
      counts[p.tipo] = (counts[p.tipo] || 0) + 1;
    }
    return Object.entries(counts).map(([tipo, count]) => ({
      tipo: tipo as TipoPropiedad,
      label: TIPO_PROPIEDAD_PLURAL[tipo as TipoPropiedad] || TIPO_PROPIEDAD_LABEL[tipo as TipoPropiedad] || tipo,
      count,
    }));
  }, [propiedades]);

  const filtroTipoEfectivo = useMemo(() => {
    if (filtroTipo === "TODOS") return "TODOS";
    return tiposDisponibles.some((t) => t.tipo === filtroTipo) ? filtroTipo : "TODOS";
  }, [filtroTipo, tiposDisponibles]);

  // Cierre de dropdowns al hacer clic fuera o presionar escape
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownTipoRef.current && !dropdownTipoRef.current.contains(e.target as Node)) {
        setIsDropdownTipoOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsDropdownTipoOpen(false);
    };
    if (isDropdownTipoOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isDropdownTipoOpen]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownPropiedadRef.current && !dropdownPropiedadRef.current.contains(e.target as Node)) {
        setIsDropdownPropiedadOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsDropdownPropiedadOpen(false);
    };
    if (isDropdownPropiedadOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isDropdownPropiedadOpen]);

  const activeFiltroConfig = useMemo(() => {
    if (filtroTipoEfectivo === "TODOS") {
      return {
        label: "Todos los tipos",
        icon: Layers,
      };
    }
    const item = tiposDisponibles.find((t) => t.tipo === filtroTipoEfectivo);
    return {
      label: item ? item.label : TIPO_PROPIEDAD_PLURAL[filtroTipoEfectivo as TipoPropiedad] || filtroTipoEfectivo,
      icon: tipoPropiedadBadgeConfig(filtroTipoEfectivo as TipoPropiedad).icon,
    };
  }, [filtroTipoEfectivo, tiposDisponibles]);

  const propiedadesParaSelector = useMemo(() => {
    return propiedades.map((p) => {
      const count = unidades.filter((u) => u.propiedadId === p.id).length;
      return {
        id: p.id,
        nombre: p.nombre,
        ciudad: p.ciudad,
        tipo: p.tipo,
        count,
      };
    });
  }, [propiedades, unidades]);

  const propiedadActivaFiltro = useMemo(() => {
    if (filtroPropiedad === "TODAS") return null;
    return propiedadesParaSelector.find((p) => p.id === filtroPropiedad) || null;
  }, [filtroPropiedad, propiedadesParaSelector]);

  // Filtrado de Datos
  const propiedadesFiltradas = useMemo(() => {
    return propiedades.filter((p) => {
      const coincideTipo = filtroTipoEfectivo === "TODOS" || p.tipo === filtroTipoEfectivo;
      const q = busqueda.toLowerCase().trim();
      const coincideBusqueda =
        !q ||
        p.nombre.toLowerCase().includes(q) ||
        p.ciudad.toLowerCase().includes(q) ||
        p.direccion.toLowerCase().includes(q);
      return coincideTipo && coincideBusqueda;
    });
  }, [propiedades, filtroTipoEfectivo, busqueda]);

  const unidadesFiltradas = useMemo(() => {
    return unidades.filter((u) => {
      const coincidePropiedad =
        filtroPropiedad === "TODAS" || u.propiedadId === filtroPropiedad;
      const q = busqueda.toLowerCase().trim();
      const coincideBusqueda =
        !q ||
        u.codigo.toLowerCase().includes(q) ||
        u.propiedad.nombre.toLowerCase().includes(q) ||
        TIPO_UNIDAD_LABEL[u.tipo].toLowerCase().includes(q) ||
        (u.piso?.toLowerCase().includes(q) ?? false);
      return coincidePropiedad && coincideBusqueda;
    });
  }, [unidades, filtroPropiedad, busqueda]);

  // Agrupación de unidades por Inmueble
  const gruposPorPropiedad = useMemo(() => {
    const mapa = new Map<string, UnidadConPropiedad[]>();
    for (const u of unidadesFiltradas) {
      if (!mapa.has(u.propiedadId)) {
        mapa.set(u.propiedadId, []);
      }
      mapa.get(u.propiedadId)!.push(u);
    }

    const resultado: Array<{
      propiedad: {
        id: string;
        nombre: string;
        ciudad: string;
        tipo: TipoPropiedad;
        direccion?: string | null;
      };
      unidades: UnidadConPropiedad[];
    }> = [];

    for (const prop of propiedades) {
      if (mapa.has(prop.id)) {
        resultado.push({
          propiedad: {
            id: prop.id,
            nombre: prop.nombre,
            ciudad: prop.ciudad,
            tipo: prop.tipo,
            direccion: prop.direccion,
          },
          unidades: mapa.get(prop.id)!,
        });
        mapa.delete(prop.id);
      }
    }

    for (const [propId, uList] of mapa.entries()) {
      if (uList.length > 0) {
        resultado.push({
          propiedad: {
            id: propId,
            nombre: uList[0].propiedad.nombre,
            ciudad: uList[0].propiedad.ciudad,
            tipo: uList[0].propiedad.tipo,
            direccion: null,
          },
          unidades: uList,
        });
      }
    }

    return resultado;
  }, [unidadesFiltradas, propiedades]);

  // Manejadores CRUD de Propiedad
  const abrirModalCrearPropiedad = (tipo?: TipoPropiedad) => {
    setTipoModalPreseleccionado(tipo);
    setPropiedadSeleccionada(null);
    setPropiedadModal("crear");
  };

  const handleCrearPropiedad = (data: CreatePropiedadInput | UpdatePropiedadInput) => {
    startTransition(async () => {
      try {
        const res = await createPropiedad(data as CreatePropiedadInput);
        if (res.success && res.data) {
          const nueva = res.data;
          const tieneUnidad = !!(data as CreatePropiedadInput).unidadInicial;
          const updated = [{ ...nueva, _count: { unidades: tieneUnidad ? 1 : 0 } }, ...propiedades];
          setPropiedades(updated);
          recalcStats(unidades, updated);
          setPropiedadModal(null);
          toast.success("Propiedad registrada exitosamente.");
        } else {
          toast.error(res.error || "No se pudo registrar la propiedad.");
        }
      } catch {
        toast.error("Ocurrió un error inesperado al registrar la propiedad.");
      }
    });
  };

  const handleEditarPropiedad = (data: CreatePropiedadInput | UpdatePropiedadInput) => {
    if (!propiedadSeleccionada) return;
    startTransition(async () => {
      try {
        const res = await updatePropiedad(propiedadSeleccionada.id, data as UpdatePropiedadInput);
        if (res.success && res.data) {
          const actualizada = res.data;
          const updated = propiedades.map((p) =>
            p.id === actualizada.id ? { ...actualizada, _count: p._count } : p
          );
          setPropiedades(updated);
          recalcStats(unidades, updated);
          setPropiedadModal(null);
          setPropiedadSeleccionada(null);
          toast.success("Propiedad actualizada exitosamente.");
        } else {
          toast.error(res.error || "No se pudo actualizar la propiedad.");
        }
      } catch {
        toast.error("Error al actualizar la propiedad.");
      }
    });
  };

  const handleEliminarPropiedad = () => {
    if (!propiedadSeleccionada) return;
    startTransition(async () => {
      try {
        const res = await deletePropiedad(propiedadSeleccionada.id);
        if (res.success) {
          const updatedProps = propiedades.filter((p) => p.id !== propiedadSeleccionada.id);
          const updatedUnidades = unidades.filter((u) => u.propiedadId !== propiedadSeleccionada.id);
          setPropiedades(updatedProps);
          setUnidades(updatedUnidades);
          recalcStats(updatedUnidades, updatedProps);
          setPropiedadModal(null);
          setPropiedadSeleccionada(null);
          toast.success("Propiedad y sus espacios eliminados correctamente.");
        } else {
          toast.error(res.error || "No se pudo eliminar la propiedad.");
        }
      } catch {
        toast.error("Error al eliminar la propiedad.");
      }
    });
  };

  // Manejadores CRUD de Unidad
  const abrirModalCrearUnidad = (propiedadId?: string) => {
    setPropiedadParaNuevaUnidad(propiedadId || (propiedades[0]?.id ?? undefined));
    setUnidadSeleccionada(null);
    setUnidadModal("crear");
  };

  const handleCrearUnidad = (data: CreateUnidadInput | UpdateUnidadInput) => {
    startTransition(async () => {
      try {
        const res = await createUnidad(data as CreateUnidadInput);
        if (res.success && res.data) {
          const nueva = res.data as UnidadConPropiedad;
          const updatedUnidades = [nueva, ...unidades];
          setUnidades(updatedUnidades);
          const updatedProps = propiedades.map((p) =>
            p.id === nueva.propiedadId ? { ...p, _count: { unidades: p._count.unidades + 1 } } : p
          );
          setPropiedades(updatedProps);
          recalcStats(updatedUnidades, updatedProps);
          setUnidadModal(null);
          toast.success(`Espacio "${nueva.codigo}" registrado exitosamente.`);
        } else {
          toast.error(res.error || "No se pudo registrar el espacio.");
        }
      } catch {
        toast.error("Error al registrar el espacio.");
      }
    });
  };

  const handleEditarUnidad = (data: CreateUnidadInput | UpdateUnidadInput) => {
    if (!unidadSeleccionada) return;
    startTransition(async () => {
      try {
        const res = await updateUnidad(unidadSeleccionada.id, data as UpdateUnidadInput);
        if (res.success && res.data) {
          const actualizada = res.data as UnidadConPropiedad;
          const updatedUnidades = unidades.map((u) =>
            u.id === actualizada.id ? actualizada : u
          );
          setUnidades(updatedUnidades);
          recalcStats(updatedUnidades, propiedades);
          setUnidadModal(null);
          setUnidadSeleccionada(null);
          toast.success(`Espacio "${actualizada.codigo}" actualizado.`);
        } else {
          toast.error(res.error || "No se pudo actualizar el espacio.");
        }
      } catch {
        toast.error("Error al actualizar el espacio.");
      }
    });
  };

  const handleEliminarUnidad = () => {
    if (!unidadSeleccionada) return;
    startTransition(async () => {
      try {
        const res = await deleteUnidad(unidadSeleccionada.id);
        if (res.success) {
          const updatedUnidades = unidades.filter((u) => u.id !== unidadSeleccionada.id);
          setUnidades(updatedUnidades);
          const updatedProps = propiedades.map((p) =>
            p.id === unidadSeleccionada.propiedadId
              ? { ...p, _count: { unidades: Math.max(0, p._count.unidades - 1) } }
              : p
          );
          setPropiedades(updatedProps);
          recalcStats(updatedUnidades, updatedProps);
          setUnidadModal(null);
          setUnidadSeleccionada(null);
          toast.success("Espacio eliminado.");
        } else {
          toast.error(res.error || "No se pudo eliminar el espacio.");
        }
      } catch {
        toast.error("Error al eliminar el espacio.");
      }
    });
  };

  const handleCambiarEstadoUnidad = (unidad: UnidadConPropiedad, nuevoEstado: EstadoUnidad) => {
    startTransition(async () => {
      try {
        const res = await updateUnidad(unidad.id, { estado: nuevoEstado });
        if (res.success) {
          const updatedUnidades = unidades.map((u) =>
            u.id === unidad.id ? { ...u, estado: nuevoEstado } : u
          );
          setUnidades(updatedUnidades);
          recalcStats(updatedUnidades, propiedades);
          toast.success(`Estado de "${unidad.codigo}" actualizado a ${nuevoEstado.toLowerCase()}.`);
        } else {
          toast.error("No se pudo actualizar el estado.");
        }
      } catch {
        toast.error("No se pudo actualizar el estado.");
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Encabezado Principal */}
      <PageHeader
        title="Propiedades y Espacios"
        icon={<Building2 className="w-6 h-6" />}
        actions={
          <div className="flex items-center justify-center gap-2.5 sm:gap-3 w-full sm:w-auto">
            <button
              id="btn-nueva-propiedad"
              onClick={() => abrirModalCrearPropiedad()}
              className="inline-flex items-center justify-center gap-1.5 px-4 sm:px-5 py-2.5 rounded-xl bg-[#175E38] text-white text-xs sm:text-sm font-semibold hover:bg-[#124b2d] transition-all shadow-sm hover:shadow cursor-pointer whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              Nueva Propiedad
            </button>
            <button
              id="btn-nueva-unidad"
              onClick={() => abrirModalCrearUnidad()}
              disabled={propiedades.length === 0}
              title={propiedades.length === 0 ? "Primero registra una propiedad" : ""}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#1C2539] text-white text-xs sm:text-sm font-semibold hover:bg-[#2a3754] transition-all shadow-sm hover:shadow cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              Nuevo Espacio
            </button>
          </div>
        }
      />

      {/* Tarjetas de Estadísticas Ejecutivas */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">
        <StatCard
          title="Propiedades"
          value={stats.totalPropiedades}
          icon={Building2}
          color="navy"
          subtitle={stats.totalPropiedades === 1 ? "inmueble" : "inmuebles"}
        />
        <StatCard
          title="Espacios"
          value={stats.totalUnidades}
          icon={Store}
          color="indigo"
          subtitle={stats.totalUnidades === 1 ? "espacio total" : "espacios totales"}
        />
        <StatCard
          title="Disponibles"
          value={stats.disponibles}
          icon={Key}
          color="emerald"
          subtitle="libres para alquilar"
        />
        <StatCard
          title="Alquilados"
          value={stats.ocupadas}
          icon={UserCheck}
          color="blue"
          subtitle={`de ${stats.totalUnidades} ${stats.totalUnidades === 1 ? "espacio" : "espacios"}`}
        />
      </div>

      {/* Barra de Navegación, Búsqueda y Filtros */}
      <div className="bg-[#1C2539]/[0.03] rounded-2xl p-3 sm:p-4 border border-[#1C2539]/10 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4">
        {/* Pestañas Principales */}
        <div className="grid grid-cols-2 md:flex md:items-center gap-1.5 bg-white/70 p-1 rounded-xl border border-slate-200/50 w-full md:w-auto">
          <button
            onClick={() => setActiveTab("propiedades")}
            className={`flex items-center justify-center gap-1.5 sm:gap-2 px-2.5 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === "propiedades"
                ? "bg-white text-slate-900 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Building2 className="w-4 h-4 shrink-0" />
            <span className="truncate">
              <span className="hidden sm:inline">Inmuebles y Edificios</span>
              <span className="sm:hidden">Inmuebles</span>
            </span>
            <span
              className={`text-[11px] sm:text-xs px-1.5 sm:px-2 py-0.5 rounded-full shrink-0 ${
                activeTab === "propiedades"
                  ? "bg-[#1C2539] text-white"
                  : "bg-slate-200 text-slate-700"
              }`}
            >
              {propiedades.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("unidades")}
            className={`flex items-center justify-center gap-1.5 sm:gap-2 px-2.5 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === "unidades"
                ? "bg-white text-slate-900 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Store className="w-4 h-4 shrink-0" />
            <span className="truncate">
              <span className="hidden sm:inline">Espacios en Alquiler</span>
              <span className="sm:hidden">Espacios</span>
            </span>
            <span
              className={`text-[11px] sm:text-xs px-1.5 sm:px-2 py-0.5 rounded-full shrink-0 ${
                activeTab === "unidades"
                  ? "bg-[#1C2539] text-white"
                  : "bg-slate-200 text-slate-700"
              }`}
            >
              {unidades.length}
            </span>
          </button>
        </div>

        {/* Buscador y Dropdowns de Filtro */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3 w-full md:w-auto">
          {/* Input de Búsqueda */}
          <div className="relative w-full sm:w-[220px] md:w-[260px] lg:w-[320px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder={
                activeTab === "propiedades"
                  ? "Buscar por nombre o ciudad..."
                  : "Buscar espacio o propiedad..."
              }
              className="w-full pl-9 pr-8 h-10 text-xs sm:text-sm border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1C2539]/20 focus:border-[#1C2539] transition-all"
            />
            {busqueda && (
              <button
                type="button"
                onClick={() => setBusqueda("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded-full hover:bg-slate-200/60 transition-colors cursor-pointer"
                title="Limpiar búsqueda"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            {/* Filtro por tipo (Pestaña Propiedades) */}
            {activeTab === "propiedades" && (
              <div ref={dropdownTipoRef} className="relative flex-1 sm:flex-initial">
                <select
                  value={filtroTipoEfectivo}
                  onChange={(e) => setFiltroTipo(e.target.value)}
                  className="md:hidden absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  aria-label="Filtrar por tipo"
                >
                  <option value="TODOS">
                    Todos los tipos {propiedades.length > 0 ? `(${propiedades.length})` : ""}
                  </option>
                  {tiposDisponibles.map((t) => (
                    <option key={t.tipo} value={t.tipo}>
                      {t.label} ({t.count})
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={() => setIsDropdownTipoOpen((prev) => !prev)}
                  className="w-full sm:w-auto flex items-center justify-between gap-2 px-3 sm:px-3.5 h-10 text-xs sm:text-sm font-medium border border-slate-200 rounded-xl bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50 transition-all shadow-2xs cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#1C2539]/20"
                >
                  <div className="flex items-center gap-2 truncate">
                    {React.createElement(activeFiltroConfig.icon, {
                      className: "w-4 h-4 text-slate-500 shrink-0",
                    })}
                    <span className="truncate">{activeFiltroConfig.label}</span>
                  </div>
                  <ChevronDown
                    className={`w-3.5 h-3.5 text-slate-400 shrink-0 transition-transform duration-200 ml-1 ${
                      isDropdownTipoOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {isDropdownTipoOpen && (
                  <div className="hidden md:block absolute right-0 top-full mt-1.5 w-60 bg-white border border-slate-200/90 rounded-xl shadow-xl py-1.5 z-50 animate-in fade-in-0 zoom-in-95 duration-100">
                    <button
                      type="button"
                      onClick={() => {
                        setFiltroTipo("TODOS");
                        setIsDropdownTipoOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2 text-xs sm:text-sm transition-colors cursor-pointer ${
                        filtroTipoEfectivo === "TODOS"
                          ? "bg-slate-50 text-slate-900 font-semibold"
                          : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <Layers className="w-4 h-4 text-slate-400 shrink-0" />
                        <span className="truncate">Todos los tipos</span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0 ml-2">
                        <span className="text-[11px] font-medium bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded-full">
                          {propiedades.length}
                        </span>
                        {filtroTipoEfectivo === "TODOS" && <Check className="w-3.5 h-3.5 text-[#175E38]" />}
                      </div>
                    </button>

                    {tiposDisponibles.length > 0 && (
                      <div className="my-1 border-t border-slate-100" />
                    )}

                    {tiposDisponibles.map((t) => {
                      const IconComponent = tipoPropiedadBadgeConfig(t.tipo).icon;
                      const isSelected = filtroTipoEfectivo === t.tipo;
                      return (
                        <button
                          key={t.tipo}
                          type="button"
                          onClick={() => {
                            setFiltroTipo(t.tipo);
                            setIsDropdownTipoOpen(false);
                          }}
                          className={`w-full flex items-center justify-between px-3 py-2 text-xs sm:text-sm transition-colors cursor-pointer ${
                            isSelected
                              ? "bg-slate-50 text-slate-900 font-semibold"
                              : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                          }`}
                        >
                          <div className="flex items-center gap-2 truncate">
                            <IconComponent className="w-4 h-4 text-slate-400 shrink-0" />
                            <span className="truncate">{t.label}</span>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0 ml-2">
                            <span className="text-[11px] font-medium bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded-full">
                              {t.count}
                            </span>
                            {isSelected && <Check className="w-3.5 h-3.5 text-[#175E38]" />}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Filtros para pestaña Espacios (Selector de Inmueble) */}
            {activeTab === "unidades" && (
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <div ref={dropdownPropiedadRef} className="relative flex-1 sm:flex-initial">
                  <select
                    value={filtroPropiedad}
                    onChange={(e) => setFiltroPropiedad(e.target.value)}
                    className="md:hidden absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    aria-label="Filtrar por inmueble"
                  >
                    <option value="TODAS">
                      Todos los inmuebles ({unidades.length})
                    </option>
                    {propiedadesParaSelector.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.nombre} ({p.count})
                      </option>
                    ))}
                  </select>

                  <button
                    type="button"
                    onClick={() => setIsDropdownPropiedadOpen((prev) => !prev)}
                    className="w-full sm:w-auto flex items-center justify-between gap-2 px-3 sm:px-3.5 h-10 text-xs sm:text-sm font-medium border border-slate-200 rounded-xl bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50 transition-all shadow-2xs cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#1C2539]/20"
                  >
                    <div className="flex items-center gap-2 truncate max-w-[200px]">
                      <Building2 className="w-4 h-4 text-slate-500 shrink-0" />
                      <span className="truncate">
                        {propiedadActivaFiltro ? propiedadActivaFiltro.nombre : "Todos los inmuebles"}
                      </span>
                    </div>
                    <ChevronDown
                      className={`w-3.5 h-3.5 text-slate-400 shrink-0 transition-transform duration-200 ml-1 ${
                        isDropdownPropiedadOpen ? "rotate-180" : ""
                      }`}
                    />
                  </button>

                  {isDropdownPropiedadOpen && (
                    <div className="hidden md:block absolute right-0 top-full mt-1.5 w-72 bg-white border border-slate-200/90 rounded-xl shadow-xl py-1.5 z-50 animate-in fade-in-0 zoom-in-95 duration-100 max-h-72 overflow-y-auto">
                      <button
                        type="button"
                        onClick={() => {
                          setFiltroPropiedad("TODAS");
                          setIsDropdownPropiedadOpen(false);
                        }}
                        className={`w-full flex items-center justify-between px-3 py-2 text-xs sm:text-sm transition-colors cursor-pointer ${
                          filtroPropiedad === "TODAS"
                            ? "bg-slate-50 text-slate-900 font-semibold"
                            : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate">
                          <Building2 className="w-4 h-4 text-slate-400 shrink-0" />
                          <span className="truncate">Todos los inmuebles</span>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0 ml-2">
                          <span className="text-[11px] font-medium bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded-full">
                            {unidades.length}
                          </span>
                          {filtroPropiedad === "TODAS" && <Check className="w-3.5 h-3.5 text-[#175E38]" />}
                        </div>
                      </button>

                      {propiedadesParaSelector.length > 0 && (
                        <div className="my-1 border-t border-slate-100" />
                      )}

                      {propiedadesParaSelector.map((p) => {
                        const isSelected = filtroPropiedad === p.id;
                        const IconComp = tipoPropiedadBadgeConfig(p.tipo).icon;
                        return (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => {
                              setFiltroPropiedad(p.id);
                              setIsDropdownPropiedadOpen(false);
                            }}
                            className={`w-full flex items-center justify-between px-3 py-2 text-xs sm:text-sm transition-colors cursor-pointer ${
                              isSelected
                                ? "bg-slate-50 text-slate-900 font-semibold"
                                : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                            }`}
                          >
                            <div className="flex items-center gap-2 truncate pr-2">
                              <IconComp className="w-4 h-4 text-slate-400 shrink-0" />
                              <div className="truncate text-left">
                                <p className="truncate font-medium">{p.nombre}</p>
                                <p className="text-[10px] text-slate-400 truncate">{p.ciudad}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <span className="text-[11px] font-medium bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded-full">
                                {p.count}
                              </span>
                              {isSelected && <Check className="w-3.5 h-3.5 text-[#175E38]" />}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Contenido Pestaña Propiedades */}
      {activeTab === "propiedades" && (
        <PropiedadesTab
          propiedades={propiedades}
          propiedadesFiltradas={propiedadesFiltradas}
          isPending={isPending}
          onAbrirCrearPropiedad={abrirModalCrearPropiedad}
          onEditarPropiedad={(prop) => {
            setPropiedadSeleccionada(prop);
            setPropiedadModal("editar");
          }}
          onEliminarPropiedad={(prop) => {
            setPropiedadSeleccionada(prop);
            setPropiedadModal("eliminar");
          }}
          onIrAEspacios={irAEspaciosDePropiedad}
          onAbrirCrearUnidad={abrirModalCrearUnidad}
          onLimpiarFiltros={() => {
            setBusqueda("");
            setFiltroTipo("TODOS");
          }}
        />
      )}

      {/* Contenido Pestaña Espacios */}
      {activeTab === "unidades" && (
        <EspaciosTab
          unidades={unidades}
          unidadesFiltradas={unidadesFiltradas}
          propiedades={propiedades}
          gruposPorPropiedad={gruposPorPropiedad}
          busqueda={busqueda}
          filtroPropiedad={filtroPropiedad}
          propiedadActivaFiltro={propiedadActivaFiltro}
          propiedadesDesplegadas={propiedadesDesplegadas}
          propiedadesCargadas={propiedadesCargadas}
          paginasPorPropiedad={paginasPorPropiedad}
          isPending={isPending}
          onToggleDesplieguePropiedad={toggleDesplieguePropiedad}
          onChangePaginaPropiedad={(propId, page) =>
            setPaginasPorPropiedad((p) => ({ ...p, [propId]: page }))
          }
          onSetFiltroPropiedad={setFiltroPropiedad}
          onLimpiarBusqueda={() => setBusqueda("")}
          onAbrirCrearUnidad={abrirModalCrearUnidad}
          onAbrirCrearPropiedad={() => abrirModalCrearPropiedad()}
          onAbrirDetalleUnidad={abrirDetalleUnidad}
          onEditarUnidad={(unidad) => {
            setUnidadSeleccionada(unidad);
            setUnidadModal("editar");
          }}
          onEliminarUnidad={(unidad) => {
            setUnidadSeleccionada(unidad);
            setUnidadModal("eliminar");
          }}
          onCambiarEstadoUnidad={handleCambiarEstadoUnidad}
          onIrAPropiedadesTab={() => setActiveTab("propiedades")}
        />
      )}

      {/* Modal Propiedad (Crear / Editar) */}
      <Modal
        isOpen={propiedadModal === "crear" || propiedadModal === "editar"}
        onClose={() => {
          setPropiedadModal(null);
          setPropiedadSeleccionada(null);
          setTipoModalPreseleccionado(undefined);
        }}
        title={propiedadModal === "crear" ? "Registrar Nueva Propiedad" : "Editar Propiedad"}
        icon={Building2}
        headerVariant="green"
        maxWidth="3xl"
      >
        <PropiedadForm
          initialData={propiedadSeleccionada ?? undefined}
          defaultTipo={tipoModalPreseleccionado}
          onSubmit={propiedadModal === "crear" ? handleCrearPropiedad : handleEditarPropiedad}
          onCancel={() => {
            setPropiedadModal(null);
            setPropiedadSeleccionada(null);
            setTipoModalPreseleccionado(undefined);
          }}
          isLoading={isPending}
        />
      </Modal>

      {/* Modal Eliminar Propiedad */}
      <Modal
        isOpen={propiedadModal === "eliminar"}
        onClose={() => {
          setPropiedadModal(null);
          setPropiedadSeleccionada(null);
        }}
        title="Eliminar Propiedad"
        headerVariant="red"
        maxWidth="md"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            ¿Estás seguro de que deseas eliminar permanentemente la propiedad{" "}
            <strong className="text-slate-900">{propiedadSeleccionada?.nombre}</strong>?
          </p>
          {propiedadSeleccionada && propiedadSeleccionada._count.unidades > 0 && (
            <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 leading-relaxed">
              ⚠️ Esta propiedad contiene <strong>{propiedadSeleccionada._count.unidades}</strong>{" "}
              espacio(s) asociado(s). Al eliminarla, se eliminarán también todas sus unidades y fotos.
            </div>
          )}
          <div className="flex justify-end gap-3 pt-2">
            <button
              onClick={() => {
                setPropiedadModal(null);
                setPropiedadSeleccionada(null);
              }}
              className="px-4 py-2 text-sm font-semibold text-slate-700 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              onClick={handleEliminarPropiedad}
              disabled={isPending}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-[#CC1A22] rounded-xl hover:bg-[#a81219] transition-colors disabled:opacity-50 cursor-pointer"
            >
              {isPending ? <RefreshCw className="w-4 h-4 animate-spin" /> : "Eliminar Definitivamente"}
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal Unidad / Espacio (Crear / Editar) */}
      <Modal
        isOpen={unidadModal === "crear" || unidadModal === "editar"}
        onClose={() => {
          setUnidadModal(null);
          setUnidadSeleccionada(null);
          setPropiedadParaNuevaUnidad(undefined);
        }}
        title={unidadModal === "crear" ? "Registrar Nuevo Espacio" : "Editar Espacio"}
        icon={Store}
        headerVariant="green"
        maxWidth="2xl"
      >
        <UnidadForm
          propiedades={propiedades}
          initialData={
            unidadSeleccionada ??
            (propiedadParaNuevaUnidad
              ? {
                  id: "",
                  codigo: "",
                  propiedadId: propiedadParaNuevaUnidad,
                  tipo: TipoUnidad.LOCAL,
                  piso: null,
                  areaMt2: null,
                  precioAlquiler: null,
                  descripcion: null,
                  estado: EstadoUnidad.DISPONIBLE,
                  imagenes: [],
                }
              : undefined)
          }
          onSubmit={unidadModal === "crear" ? handleCrearUnidad : handleEditarUnidad}
          onCancel={() => {
            setUnidadModal(null);
            setUnidadSeleccionada(null);
            setPropiedadParaNuevaUnidad(undefined);
          }}
          isLoading={isPending}
        />
      </Modal>

      {/* Modal Eliminar Unidad */}
      <Modal
        isOpen={unidadModal === "eliminar"}
        onClose={() => {
          setUnidadModal(null);
          setUnidadSeleccionada(null);
        }}
        title="Eliminar Espacio"
        headerVariant="red"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            ¿Estás seguro de que deseas eliminar el espacio{" "}
            <strong className="text-slate-900">{unidadSeleccionada?.codigo}</strong> de la propiedad{" "}
            <strong className="text-slate-900">{unidadSeleccionada?.propiedad.nombre}</strong>?
          </p>
          <div className="flex justify-end gap-3 pt-2">
            <button
              onClick={() => {
                setUnidadModal(null);
                setUnidadSeleccionada(null);
              }}
              className="px-4 py-2 text-sm font-semibold text-slate-700 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              onClick={handleEliminarUnidad}
              disabled={isPending}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-[#CC1A22] rounded-xl hover:bg-[#a81219] transition-colors disabled:opacity-50 cursor-pointer"
            >
              {isPending ? <RefreshCw className="w-4 h-4 animate-spin" /> : "Eliminar Espacio"}
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal Detalle de Espacio y Galería de Fotos */}
      <UnidadDetalleModal
        isOpen={unidadModal === "detalle" && !!unidadSeleccionada}
        unidad={unidadSeleccionada}
        onClose={() => {
          setUnidadModal(null);
          setUnidadSeleccionada(null);
        }}
        onEditar={() => {
          setUnidadModal("editar");
        }}
      />
    </div>
  );
}
