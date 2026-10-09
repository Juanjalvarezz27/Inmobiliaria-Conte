"use client";

import React, { useState, useTransition, useCallback, useMemo } from "react";
import {
  Building2,
  Plus,
  Store,
  Key,
  UserCheck,
  CheckCircle2,
  Wrench,
  Archive,
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
import { PropiedadesFiltrosBar } from "./PropiedadesFiltrosBar";
import { EliminarPropiedadModal } from "./EliminarPropiedadModal";
import { EliminarUnidadModal } from "./EliminarUnidadModal";
import {
  createPropiedad,
  updatePropiedad,
  deletePropiedad,
  reactivarPropiedad,
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
  const [vistaPropiedadesArchivadas, setVistaPropiedadesArchivadas] = useState<boolean>(false);
  const [filtroTipo, setFiltroTipo] = useState<string>("TODOS");
  const [busqueda, setBusqueda] = useState<string>("");

  // Filtros de espacios y acordeón desplegable
  const [filtroPropiedad, setFiltroPropiedad] = useState<string>("TODAS");
  const [filtroEstadoUnidad, setFiltroEstadoUnidad] = useState<string>("ACTIVOS");
  const [propiedadesDesplegadas, setPropiedadesDesplegadas] = useState<Record<string, boolean>>({});
  const [propiedadesCargadas, setPropiedadesCargadas] = useState<Record<string, boolean>>({});
  const [paginasPorPropiedad, setPaginasPorPropiedad] = useState<Record<string, number>>({});

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
    setFiltroEstadoUnidad("ACTIVOS");
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
    const totalPropsActivas = updatedProps.filter((p) => p.activo !== false).length;
    const totalUnidades = updatedUnidades.length;
    const ocupadas = updatedUnidades.filter((u) => u.estado === EstadoUnidad.OCUPADO).length;
    const disponibles = updatedUnidades.filter((u) => u.estado === EstadoUnidad.DISPONIBLE).length;
    const tasaOcupacion = totalUnidades > 0 ? Math.round((ocupadas / totalUnidades) * 100) : 0;

    setStats({
      totalPropiedades: totalPropsActivas,
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


  const estadosUnidadDisponibles = useMemo(() => {
    const totalActivos = unidades.filter((u) => u.estado !== EstadoUnidad.INACTIVO).length;
    const totalDisponibles = unidades.filter((u) => u.estado === EstadoUnidad.DISPONIBLE).length;
    const totalOcupados = unidades.filter((u) => u.estado === EstadoUnidad.OCUPADO).length;
    const totalMantenimiento = unidades.filter((u) => u.estado === EstadoUnidad.MANTENIMIENTO).length;
    const totalInactivos = unidades.filter((u) => u.estado === EstadoUnidad.INACTIVO).length;

    return [
      {
        value: "ACTIVOS",
        label: "Activos / Operativos",
        icon: CheckCircle2,
        count: totalActivos,
      },
      {
        value: EstadoUnidad.DISPONIBLE,
        label: "Disponibles",
        icon: Store,
        count: totalDisponibles,
      },
      {
        value: EstadoUnidad.OCUPADO,
        label: "Ocupados / Alquilados",
        icon: UserCheck,
        count: totalOcupados,
      },
      {
        value: EstadoUnidad.MANTENIMIENTO,
        label: "En Mantenimiento",
        icon: Wrench,
        count: totalMantenimiento,
      },
      {
        value: EstadoUnidad.INACTIVO,
        label: "Inactivos",
        icon: Archive,
        count: totalInactivos,
      },
    ];
  }, [unidades]);


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
      const coincideActivo = vistaPropiedadesArchivadas ? p.activo === false : p.activo !== false;
      const coincideTipo = filtroTipoEfectivo === "TODOS" || p.tipo === filtroTipoEfectivo;
      const q = busqueda.toLowerCase().trim();
      const coincideBusqueda =
        !q ||
        p.nombre.toLowerCase().includes(q) ||
        p.ciudad.toLowerCase().includes(q) ||
        p.direccion.toLowerCase().includes(q);
      return coincideActivo && coincideTipo && coincideBusqueda;
    });
  }, [propiedades, vistaPropiedadesArchivadas, filtroTipoEfectivo, busqueda]);

  const unidadesFiltradas = useMemo(() => {
    return unidades.filter((u) => {
      const coincidePropiedad =
        filtroPropiedad === "TODAS" || u.propiedadId === filtroPropiedad;

      const coincideEstado =
        filtroEstadoUnidad === "TODOS"
          ? true
          : filtroEstadoUnidad === "ACTIVOS"
          ? u.estado !== EstadoUnidad.INACTIVO
          : u.estado === filtroEstadoUnidad;

      const q = busqueda.toLowerCase().trim();
      const contratoActivo = u.contratos && u.contratos.length > 0 ? u.contratos[0] : null;
      const nombreInquilino = contratoActivo
        ? `${contratoActivo.inquilino.nombre} ${contratoActivo.inquilino.apellido ?? ""}`.toLowerCase()
        : "";
      const docInquilino = contratoActivo?.inquilino.documentoIdentidad?.toLowerCase() || "";
      const codContrato = contratoActivo?.codigo?.toLowerCase() || "";

      const coincideBusqueda =
        !q ||
        u.codigo.toLowerCase().includes(q) ||
        u.propiedad.nombre.toLowerCase().includes(q) ||
        TIPO_UNIDAD_LABEL[u.tipo].toLowerCase().includes(q) ||
        (u.piso?.toLowerCase().includes(q) ?? false) ||
        nombreInquilino.includes(q) ||
        docInquilino.includes(q) ||
        codContrato.includes(q);

      return coincidePropiedad && coincideEstado && coincideBusqueda;
    });
  }, [unidades, filtroPropiedad, filtroEstadoUnidad, busqueda]);

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
          if (res.archivada) {
            // Archivado integral / Soft Delete
            const updatedProps = propiedades.map((p) =>
              p.id === propiedadSeleccionada.id ? { ...p, activo: false } : p
            );
            const updatedUnidades = unidades.map((u) =>
              u.propiedadId === propiedadSeleccionada.id
                ? { ...u, estado: EstadoUnidad.INACTIVO }
                : u
            );
            setPropiedades(updatedProps);
            setUnidades(updatedUnidades);
            recalcStats(updatedUnidades, updatedProps);
            setPropiedadModal(null);
            setPropiedadSeleccionada(null);
            toast.success(res.message || "Propiedad archivada correctamente.");
          } else {
            // Borrado físico definitivo
            const updatedProps = propiedades.filter((p) => p.id !== propiedadSeleccionada.id);
            const updatedUnidades = unidades.filter((u) => u.propiedadId !== propiedadSeleccionada.id);
            setPropiedades(updatedProps);
            setUnidades(updatedUnidades);
            recalcStats(updatedUnidades, updatedProps);
            setPropiedadModal(null);
            setPropiedadSeleccionada(null);
            toast.success(res.message || "Propiedad eliminada definitivamente.");
          }
        } else {
          toast.error(res.error || "No se pudo eliminar la propiedad.");
        }
      } catch {
        toast.error("Error al procesar la eliminación de la propiedad.");
      }
    });
  };

  const handleReactivarPropiedad = (prop: PropiedadConConteo) => {
    startTransition(async () => {
      try {
        const res = await reactivarPropiedad(prop.id);
        if (res.success) {
          const updated = propiedades.map((p) =>
            p.id === prop.id ? { ...p, activo: true } : p
          );
          setPropiedades(updated);
          recalcStats(unidades, updated);
          toast.success(res.message || `Inmueble "${prop.nombre}" reactivado exitosamente.`);
        } else {
          toast.error(res.error || "No se pudo reactivar el inmueble.");
        }
      } catch {
        toast.error("Error inesperado al reactivar el inmueble.");
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
          if (res.inactivada && res.data) {
            const actualizada = res.data as UnidadConPropiedad;
            const updatedUnidades = unidades.map((u) =>
              u.id === unidadSeleccionada.id ? actualizada : u
            );
            setUnidades(updatedUnidades);
            recalcStats(updatedUnidades, propiedades);
            setUnidadModal(null);
            setUnidadSeleccionada(null);
            toast.success(
              res.message || `Espacio "${actualizada.codigo}" marcado como INACTIVO.`
            );
          } else {
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
            toast.success(res.message || "Espacio eliminado permanentemente.");
          }
        } else {
          toast.error(res.error || "No se pudo eliminar el espacio.");
        }
      } catch {
        toast.error("Error al procesar la solicitud del espacio.");
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

      {/* Barra de Navegación, Búsqueda y Filtros Modulares */}
      <PropiedadesFiltrosBar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        totalPropiedades={propiedades.length}
        totalUnidades={unidades.length}
        busqueda={busqueda}
        onBusquedaChange={setBusqueda}
        filtroTipo={filtroTipoEfectivo}
        onFiltroTipoChange={setFiltroTipo}
        tiposDisponibles={tiposDisponibles}
        filtroPropiedad={filtroPropiedad}
        onFiltroPropiedadChange={setFiltroPropiedad}
        propiedadesParaSelector={propiedadesParaSelector}
        propiedadActivaFiltro={propiedadActivaFiltro}
        filtroEstadoUnidad={filtroEstadoUnidad}
        onFiltroEstadoUnidadChange={setFiltroEstadoUnidad}
        estadosUnidadDisponibles={estadosUnidadDisponibles}
      />

      {/* Contenido Pestaña Propiedades */}
      {activeTab === "propiedades" && (
        <PropiedadesTab
          propiedades={propiedades}
          propiedadesFiltradas={propiedadesFiltradas}
          isPending={isPending}
          vistaArchivadas={vistaPropiedadesArchivadas}
          onToggleVistaArchivadas={setVistaPropiedadesArchivadas}
          onAbrirCrearPropiedad={abrirModalCrearPropiedad}
          onEditarPropiedad={(prop) => {
            setPropiedadSeleccionada(prop);
            setPropiedadModal("editar");
          }}
          onEliminarPropiedad={(prop) => {
            setPropiedadSeleccionada(prop);
            setPropiedadModal("eliminar");
          }}
          onReactivarPropiedad={handleReactivarPropiedad}
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
          filtroEstadoUnidad={filtroEstadoUnidad}
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
          onSetFiltroEstadoUnidad={setFiltroEstadoUnidad}
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

      {/* Modal Eliminar / Archivar Propiedad */}
      <EliminarPropiedadModal
        isOpen={propiedadModal === "eliminar"}
        onClose={() => {
          setPropiedadModal(null);
          setPropiedadSeleccionada(null);
        }}
        propiedad={propiedadSeleccionada}
        unidades={unidades}
        onEliminar={handleEliminarPropiedad}
        isLoading={isPending}
      />

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

      {/* Modal Eliminar / Inactivar Unidad */}
      <EliminarUnidadModal
        isOpen={unidadModal === "eliminar"}
        onClose={() => {
          setUnidadModal(null);
          setUnidadSeleccionada(null);
        }}
        unidad={unidadSeleccionada}
        onEliminar={handleEliminarUnidad}
        isLoading={isPending}
      />

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
