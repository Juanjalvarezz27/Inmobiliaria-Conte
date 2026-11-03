"use client";

import React, { useState, useMemo, useTransition, useEffect } from "react";
import {
  Users,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Plus,
  Search,
  Layers,
  FileCheck2,
  Building2,
  Briefcase,
  X,
  UserCheck,
  UserX,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { FilterDropdown, type FilterDropdownOption } from "@/components/ui/filter-dropdown";
import { CargoEmpleado, EstadoAsistencia, EstadoTarea } from "@prisma/client";
import { PersonalModalsContainer } from "./PersonalModalsContainer";
import {
  CARGO_CONFIG,
  type PersonalDashboardData,
  type EmpleadoItem,
  type TareaEmpleadoItem,
  type RegistroAsistenciaItem,
} from "./types";
import {
  type GrupoDirectorio,
  type GrupoTareas,
} from "./tabs/tab-helpers";
import { PersonalDirectorioTab } from "./tabs/PersonalDirectorioTab";
import { PersonalTareasTab } from "./tabs/PersonalTareasTab";
import { usePersonalMutations } from "./hooks/usePersonalMutations";

interface PersonalClientProps {
  initialData: PersonalDashboardData;
}

export function PersonalClient({ initialData }: PersonalClientProps) {
  const [data, setData] = useState<PersonalDashboardData>(initialData);
  const [activeTab, setActiveTab] = useState<"directorio" | "tareas">("directorio");

  // Filtros de búsqueda
  const [busqueda, setBusqueda] = useState("");
  const [filtroPropiedad, setFiltroPropiedad] = useState("TODAS");
  const [filtroCargo, setFiltroCargo] = useState("TODOS");
  const [filtroEstado, setFiltroEstado] = useState("TODOS");
  const [filtroEstadoTarea, setFiltroEstadoTarea] = useState("TODAS");

  const [isPending, startTransition] = useTransition();

  // Estados para Modales
  const [modalEmpleadoOpen, setModalEmpleadoOpen] = useState(false);
  const [empleadoAEditar, setEmpleadoAEditar] = useState<EmpleadoItem | null>(null);
  const [propiedadPreseleccionadaEmpleado, setPropiedadPreseleccionadaEmpleado] = useState<string | null>(null);

  const [modalAsistenciaOpen, setModalAsistenciaOpen] = useState(false);
  const [empleadoParaAsistencia, setEmpleadoParaAsistencia] = useState<EmpleadoItem | null>(null);
  const [registroParaAsistencia, setRegistroParaAsistencia] = useState<RegistroAsistenciaItem | null>(null);
  const [asistenciaParaSalida, setAsistenciaParaSalida] = useState<{
    id: string;
    empleadoNombre: string;
    empleadoCargo: CargoEmpleado;
    horaEntrada: string;
  } | null>(null);

  const [modalTareaOpen, setModalTareaOpen] = useState(false);
  const [empleadoPreseleccionadoTarea, setEmpleadoPreseleccionadoTarea] = useState<EmpleadoItem | null>(null);
  const [propiedadPreseleccionadaTarea, setPropiedadPreseleccionadaTarea] = useState<string | null>(null);

  const [modalDetalleTareaOpen, setModalDetalleTareaOpen] = useState(false);
  const [tareaSeleccionada, setTareaSeleccionada] = useState<TareaEmpleadoItem | null>(null);

  const [modalDetalleEmpleadoOpen, setModalDetalleEmpleadoOpen] = useState(false);
  const [empleadoSeleccionadoDetalle, setEmpleadoSeleccionadoDetalle] = useState<EmpleadoItem | null>(null);
  const [scrollToSeccionDetalle, setScrollToSeccionDetalle] = useState<"TAREAS" | null>(null);

  // Estados de acordeones desplegables para las 2 pestañas
  const [acordeonesDirectorio, setAcordeonesDirectorio] = useState<Record<string, boolean>>({});
  const [acordeonesTareas, setAcordeonesTareas] = useState<Record<string, boolean>>({});

  // Paginación local por Inmueble
  const [paginasTareas, setPaginasTareas] = useState<Record<string, number>>({});
  const [empleadoParaDesactivar, setEmpleadoParaDesactivar] = useState<EmpleadoItem | null>(null);

  // Visor de fotos
  const [imageViewerOpen, setImageViewerOpen] = useState(false);
  const [imageViewerUrls, setImageViewerUrls] = useState<string[]>([]);
  const [imageViewerIndex, setImageViewerIndex] = useState(0);

  // Resetear páginas locales al cambiar filtros o búsqueda
  useEffect(() => {
    setPaginasTareas({});
  }, [filtroPropiedad, filtroEstadoTarea, busqueda]);

  const cambiarPaginaTarea = (grupoId: string, nuevaPagina: number) => {
    setPaginasTareas((prev) => ({
      ...prev,
      [grupoId]: nuevaPagina,
    }));
  };

  const toggleAcordeonDirectorio = (id: string) => {
    setAcordeonesDirectorio((prev) => ({
      ...prev,
      [id]: prev[id] !== undefined ? !prev[id] : true,
    }));
  };

  const toggleAcordeonTareas = (id: string) => {
    setAcordeonesTareas((prev) => ({
      ...prev,
      [id]: prev[id] !== undefined ? !prev[id] : true,
    }));
  };

  const estaDesplegadaDirectorio = (id: string) =>
    acordeonesDirectorio[id] !== undefined
      ? acordeonesDirectorio[id]
      : busqueda.trim() !== "" || (filtroPropiedad !== "TODAS" && filtroPropiedad === id);

  const estaDesplegadaTareas = (id: string) =>
    acordeonesTareas[id] !== undefined
      ? acordeonesTareas[id]
      : busqueda.trim() !== "" || (filtroPropiedad !== "TODAS" && filtroPropiedad === id);

  // Opciones para el selector de Cargo
  const opcionesCargo: FilterDropdownOption[] = useMemo(() => {
    const counts = data.empleados.reduce((acc, emp) => {
      acc[emp.cargo] = (acc[emp.cargo] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return [
      {
        value: "TODOS",
        label: "Todos los Cargos",
        isGlobal: true,
        count: data.empleados.length,
        icon: Briefcase,
      },
      ...Object.entries(CARGO_CONFIG).map(([key, config]) => ({
        value: key,
        label: config.label,
        count: counts[key] || 0,
        icon: Briefcase,
      })),
    ];
  }, [data.empleados]);

  // Opciones para el selector de Inmuebles
  const opcionesPropiedadesFiltro: FilterDropdownOption[] = useMemo(() => {
    const counts = data.empleados.reduce((acc, emp) => {
      const key = emp.propiedadId || "GENERAL";
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return [
      {
        value: "TODAS",
        label: "Todos los Inmuebles",
        isGlobal: true,
        count: data.empleados.length,
        icon: Building2,
      },
      ...data.propiedades.map((p) => ({
        value: p.id,
        label: p.nombre,
        subtitle: p.ciudad,
        count: counts[p.id] || 0,
        icon: Building2,
      })),
      {
        value: "GENERAL",
        label: "Sede Central / Multipropiedad",
        count: counts["GENERAL"] || 0,
        icon: Building2,
      },
    ];
  }, [data.empleados, data.propiedades]);

  // Opciones para el selector de Estado / Presencia
  const opcionesEstado: FilterDropdownOption[] = useMemo(() => {
    const activos = data.empleados.filter((e) => e.activo).length;
    const inactivos = data.empleados.length - activos;
    const presentesHoy = data.empleados.filter(
      (e) =>
        e.activo &&
        e.asistenciaHoy &&
        (e.asistenciaHoy.estado === EstadoAsistencia.PRESENTE ||
          e.asistenciaHoy.estado === EstadoAsistencia.RETARDO)
    ).length;
    const sinMarcarHoy = data.empleados.filter((e) => e.activo && !e.asistenciaHoy).length;
    const faltasHoy = data.empleados.filter(
      (e) =>
        e.asistenciaHoy &&
        (e.asistenciaHoy.estado === EstadoAsistencia.FALTA_INJUSTIFICADA ||
          e.asistenciaHoy.estado === EstadoAsistencia.FALTA_JUSTIFICADA ||
          e.asistenciaHoy.estado === EstadoAsistencia.PERMISO)
    ).length;

    return [
      { value: "TODOS", label: "Todos los Colaboradores", isGlobal: true, count: data.empleados.length, icon: Layers },
      { value: "PRESENTES_HOY", label: "Presentes Hoy", count: presentesHoy, icon: CheckCircle2, iconClassName: "text-emerald-600" },
      { value: "SIN_MARCAR_HOY", label: "Sin Marcar Hoy", count: sinMarcarHoy, icon: Clock, iconClassName: "text-amber-500" },
      ...(faltasHoy > 0
        ? [
            {
              value: "FALTAS_HOY",
              label: "Faltas / Permisos Hoy",
              count: faltasHoy,
              icon: UserX,
              iconClassName: "text-rose-500",
            },
          ]
        : []),
      { value: "ACTIVOS", label: "Solo Activos", count: activos, icon: UserCheck, iconClassName: "text-[#175E38]" },
      { value: "INACTIVOS", label: "Solo Inactivos", count: inactivos, icon: UserX, iconClassName: "text-slate-400" },
    ];
  }, [data.empleados]);

  // Opciones para el selector de Estado de Tareas
  const opcionesEstadoTarea: FilterDropdownOption[] = useMemo(() => {
    const counts = data.tareas.reduce((acc, t) => {
      acc[t.estado] = (acc[t.estado] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return [
      { value: "TODAS", label: "Todas las Tareas", isGlobal: true, count: data.tareas.length, icon: Layers },
      { value: "PENDIENTE", label: "Pendientes", count: (counts["PENDIENTE"] || 0) + (counts["EN_PROCESO"] || 0), icon: Clock, iconClassName: "text-amber-600" },
      { value: "COMPLETADA", label: "Completadas", count: counts["COMPLETADA"] || 0, icon: CheckCircle2, iconClassName: "text-[#175E38]" },
    ];
  }, [data.tareas]);

  // Filtrado de empleados en tiempo real
  const empleadosFiltrados = useMemo(() => {
    return data.empleados.filter((emp) => {
      if (filtroPropiedad !== "TODAS") {
        if (filtroPropiedad === "GENERAL") {
          if (emp.propiedadId) return false;
        } else if (emp.propiedadId !== filtroPropiedad) {
          return false;
        }
      }

      if (filtroCargo !== "TODOS" && emp.cargo !== filtroCargo) return false;
      if (filtroEstado === "ACTIVOS" && !emp.activo) return false;
      if (filtroEstado === "INACTIVOS" && emp.activo) return false;
      if (filtroEstado === "PRESENTES_HOY") {
        if (
          !emp.asistenciaHoy ||
          (emp.asistenciaHoy.estado !== EstadoAsistencia.PRESENTE &&
            emp.asistenciaHoy.estado !== EstadoAsistencia.RETARDO)
        )
          return false;
      }
      if (filtroEstado === "SIN_MARCAR_HOY") {
        if (!emp.activo || emp.asistenciaHoy) return false;
      }
      if (filtroEstado === "FALTAS_HOY") {
        if (
          !emp.asistenciaHoy ||
          (emp.asistenciaHoy.estado !== EstadoAsistencia.FALTA_INJUSTIFICADA &&
            emp.asistenciaHoy.estado !== EstadoAsistencia.FALTA_JUSTIFICADA &&
            emp.asistenciaHoy.estado !== EstadoAsistencia.PERMISO)
        )
          return false;
      }

      if (busqueda.trim()) {
        const query = busqueda.toLowerCase().trim();
        const matchNombre = emp.nombre.toLowerCase().includes(query);
        const matchApellido = emp.apellido?.toLowerCase().includes(query);
        const matchCedula = emp.cedula.toLowerCase().includes(query);
        const matchTelefono = emp.telefono.includes(query);
        const matchEmail = emp.email?.toLowerCase().includes(query);
        return matchNombre || matchApellido || matchCedula || matchTelefono || matchEmail;
      }

      return true;
    });
  }, [data.empleados, filtroPropiedad, filtroCargo, filtroEstado, busqueda]);

  // Agrupación de empleados por Inmueble para el Directorio (solo calculada en tab de directorio)
  const gruposDirectorio: GrupoDirectorio[] = useMemo(() => {
    if (activeTab !== "directorio") return [];
    const mapa = new Map<string, EmpleadoItem[]>();
    for (const emp of empleadosFiltrados) {
      const key = emp.propiedadId || "GENERAL";
      if (!mapa.has(key)) mapa.set(key, []);
      mapa.get(key)!.push(emp);
    }

    const resultado: GrupoDirectorio[] = [];

    for (const prop of data.propiedades) {
      if (mapa.has(prop.id)) {
        resultado.push({
          id: prop.id,
          propiedad: {
            id: prop.id,
            nombre: prop.nombre,
            ciudad: prop.ciudad,
            tipo: prop.tipo,
          },
          empleados: mapa.get(prop.id)!,
        });
        mapa.delete(prop.id);
      }
    }

    if (mapa.has("GENERAL") && mapa.get("GENERAL")!.length > 0) {
      resultado.push({
        id: "GENERAL",
        propiedad: {
          id: "GENERAL",
          nombre: "Sede Central / Multipropiedad",
          ciudad: "Operaciones Generales",
          tipo: "SEDE_CENTRAL",
        },
        empleados: mapa.get("GENERAL")!,
      });
      mapa.delete("GENERAL");
    }

    for (const [key, empList] of mapa.entries()) {
      if (empList.length > 0) {
        resultado.push({
          id: key,
          propiedad: {
            id: key,
            nombre: empList[0].propiedad?.nombre || "Inmueble Asignado",
            ciudad: empList[0].propiedad?.ciudad || "",
          },
          empleados: empList,
        });
      }
    }

    return resultado;
  }, [activeTab, empleadosFiltrados, data.propiedades]);

  // Filtrado de tareas (solo activo en tab tareas)
  const tareasFiltradas = useMemo(() => {
    if (activeTab !== "tareas") return [];
    return data.tareas.filter((t) => {
      const empAsignado = data.empleados.find((e) => e.id === t.empleadoId);
      const propIdEfectivo = t.propiedadId || empAsignado?.propiedadId || null;

      if (filtroPropiedad !== "TODAS") {
        if (filtroPropiedad === "GENERAL") {
          if (propIdEfectivo) return false;
        } else if (propIdEfectivo !== filtroPropiedad) {
          return false;
        }
      }

      if (filtroEstadoTarea !== "TODAS" && t.estado !== filtroEstadoTarea) return false;

      if (busqueda.trim()) {
        const query = busqueda.toLowerCase().trim();
        const matchTitulo = t.titulo.toLowerCase().includes(query);
        const matchDesc = t.descripcion?.toLowerCase().includes(query);
        const matchResp = t.empleadoNombre.toLowerCase().includes(query);
        const matchProp = t.propiedadNombre?.toLowerCase().includes(query);
        return matchTitulo || matchDesc || matchResp || matchProp;
      }

      return true;
    });
  }, [activeTab, data.tareas, data.empleados, filtroPropiedad, filtroEstadoTarea, busqueda]);

  // Agrupación de tareas por Inmueble (solo calculada en tab tareas)
  const gruposTareas: GrupoTareas[] = useMemo(() => {
    if (activeTab !== "tareas") return [];
    const mapa = new Map<string, TareaEmpleadoItem[]>();
    for (const t of tareasFiltradas) {
      const empAsignado = data.empleados.find((e) => e.id === t.empleadoId);
      const key = t.propiedadId || empAsignado?.propiedadId || "GENERAL";
      if (!mapa.has(key)) mapa.set(key, []);
      mapa.get(key)!.push(t);
    }

    const resultado: GrupoTareas[] = [];

    for (const prop of data.propiedades) {
      if (mapa.has(prop.id)) {
        resultado.push({
          id: prop.id,
          propiedad: {
            id: prop.id,
            nombre: prop.nombre,
            ciudad: prop.ciudad,
            tipo: prop.tipo,
          },
          tareas: mapa.get(prop.id)!,
        });
        mapa.delete(prop.id);
      }
    }

    if (mapa.has("GENERAL") && mapa.get("GENERAL")!.length > 0) {
      resultado.push({
        id: "GENERAL",
        propiedad: {
          id: "GENERAL",
          nombre: "Sede Central / Multipropiedad",
          ciudad: "Operaciones Generales",
          tipo: "SEDE_CENTRAL",
        },
        tareas: mapa.get("GENERAL")!,
      });
      mapa.delete("GENERAL");
    }

    for (const [key, tList] of mapa.entries()) {
      if (tList.length > 0) {
        resultado.push({
          id: key,
          propiedad: {
            id: key,
            nombre: tList[0].propiedadNombre || "Inmueble Asignado",
            ciudad: "",
          },
          tareas: tList,
        });
      }
    }

    return resultado;
  }, [activeTab, tareasFiltradas, data.propiedades, data.empleados]);

  // Abrir visor de fotos
  const handleVerFoto = (url: string) => {
    setImageViewerUrls([url]);
    setImageViewerIndex(0);
    setImageViewerOpen(true);
  };

  // Mutaciones desacopladas del módulo de Personal
  const {
    handleCrearOEditarEmpleado,
    ejecutarToggleEstado,
    handleToggleEstadoEmpleado,
    handleRegistrarAsistencia,
    handleMarcarSalidaRapida,
    handleCrearTarea,
    handleActualizarEstadoTarea,
    handleEliminarTarea,
  } = usePersonalMutations({
    data,
    setData,
    startTransition,
    empleadoAEditar,
    setEmpleadoParaDesactivar,
    setRegistroParaAsistencia,
    setEmpleadoSeleccionadoDetalle,
  });

  const handleVerTareasEmpleado = (emp: EmpleadoItem) => {
    setEmpleadoSeleccionadoDetalle(emp);
    setScrollToSeccionDetalle("TAREAS");
    setModalDetalleEmpleadoOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* PageHeader con Título y Botones de Acción */}
      <PageHeader
        title="Equipo de Trabajo y Asistencia"
        icon={<Users className="w-6 h-6 text-white" />}
        actions={
          <div className="grid grid-cols-2 gap-2 w-full sm:w-auto sm:flex sm:items-center sm:gap-2.5">
            <button
              type="button"
              onClick={() => {
                setEmpleadoPreseleccionadoTarea(null);
                setModalTareaOpen(true);
              }}
              className="h-11 px-2.5 sm:px-4 rounded-xl text-xs font-bold bg-[#1C2539] text-white hover:bg-[#2a3754] transition-all flex items-center justify-center gap-1.5 sm:gap-2 cursor-pointer shadow-xs active:translate-y-0.5"
            >
              <FileCheck2 className="w-4 h-4 shrink-0" />
              <span className="truncate">Asignar Tarea</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setEmpleadoAEditar(null);
                setModalEmpleadoOpen(true);
              }}
              className="h-11 px-2.5 sm:px-5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-[#175E38] to-[#124b2d] border-b-[3px] border-b-[#0e3a23] active:translate-y-0.5 transition-all flex items-center justify-center gap-1.5 sm:gap-2 cursor-pointer shadow-[0_2px_8px_rgba(23,94,56,0.25)]"
            >
              <Plus className="w-4 h-4 stroke-[2.5] shrink-0" />
              <span className="truncate">Registrar Trabajador</span>
            </button>
          </div>
        }
      />

      {/* 4 StatCards Ejecutivas con Efecto Sol Ambiental */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Personal Activo"
          value={data.metricas.activosCount}
          icon={Users}
          color="emerald"
          subtitle={`${data.metricas.totalEmpleados} trabajadores en nómina`}
        />

        <StatCard
          title="Asistencia de Hoy"
          value={`${data.metricas.asistieronHoyCount} / ${data.metricas.activosCount}`}
          icon={Clock}
          color="navy"
          subtitle={`${
            data.metricas.activosCount > 0
              ? Math.round((data.metricas.asistieronHoyCount / data.metricas.activosCount) * 100)
              : 0
          }% presentes en la jornada`}
          progressPercent={
            data.metricas.activosCount > 0
              ? (data.metricas.asistieronHoyCount / data.metricas.activosCount) * 100
              : 0
          }
        />

        <StatCard
          title="Tareas en Curso"
          value={data.metricas.tareasPendientesCount}
          icon={AlertTriangle}
          color="amber"
          subtitle="Labores operativas abiertas"
        />

        <StatCard
          title="Tareas Completadas"
          value={data.metricas.tareasCompletadasMesCount}
          icon={CheckCircle2}
          color="navy"
          subtitle="Labores resueltas en el mes"
        />
      </div>

      {/* Selector Segmentado de Pestañas (Navegación Primaria de Vista) */}
      <div className="flex items-center justify-start">
        <div className="grid grid-cols-2 sm:inline-flex sm:items-center gap-1 sm:gap-1.5 p-1 sm:p-1.5 rounded-2xl bg-white/90 border border-slate-200/90 shadow-2xs w-full sm:w-auto">
          {/* Pestaña: Directorio de Personal */}
          <button
            type="button"
            onClick={() => setActiveTab("directorio")}
            className={`group relative h-12 sm:h-11 px-2.5 sm:px-5 rounded-xl text-xs sm:text-sm font-bold transition-all flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2.5 cursor-pointer ${
              activeTab === "directorio"
                ? "bg-white text-slate-950 shadow-[0_2px_8px_rgba(28,37,57,0.08)] border border-slate-200/90"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
            }`}
          >
            <div
              className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                activeTab === "directorio"
                  ? "bg-emerald-50 text-[#175E38]"
                  : "bg-slate-200/70 text-slate-500 group-hover:bg-white group-hover:text-slate-700"
              }`}
            >
              <Users className="w-3.5 h-3.5" />
            </div>
            <span className="font-heading font-black tracking-tight truncate">
              <span className="sm:hidden text-[11px]">Directorio</span>
              <span className="hidden sm:inline">Directorio de Personal</span>
            </span>
            <span
              className={`px-2 py-0.5 rounded-full text-[11px] font-mono font-bold shrink-0 transition-colors ${
                activeTab === "directorio"
                  ? "bg-[#175E38] text-white shadow-2xs"
                  : "bg-white/90 text-slate-600 border border-slate-200/80 shadow-2xs"
              }`}
            >
              {data.empleados.length}
            </span>
          </button>

          {/* Pestaña: Tareas Asignadas */}
          <button
            type="button"
            onClick={() => setActiveTab("tareas")}
            className={`group relative h-12 sm:h-11 px-2.5 sm:px-5 rounded-xl text-xs sm:text-sm font-bold transition-all flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2.5 cursor-pointer ${
              activeTab === "tareas"
                ? "bg-white text-slate-950 shadow-[0_2px_8px_rgba(28,37,57,0.08)] border border-slate-200/90"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
            }`}
          >
            <div
              className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                activeTab === "tareas"
                  ? "bg-amber-50 text-amber-700"
                  : "bg-slate-200/70 text-slate-500 group-hover:bg-white group-hover:text-slate-700"
              }`}
            >
              <FileCheck2 className="w-3.5 h-3.5" />
            </div>
            <span className="font-heading font-black tracking-tight truncate">
              <span className="sm:hidden text-[11px]">Tareas</span>
              <span className="hidden sm:inline">Tareas Asignadas</span>
            </span>
            <span
              className={`px-2 py-0.5 rounded-full text-[11px] font-mono font-bold shrink-0 transition-colors ${
                activeTab === "tareas"
                  ? "bg-amber-600 text-white shadow-2xs"
                  : data.metricas.tareasPendientesCount > 0
                  ? "bg-amber-50 text-amber-800 border border-amber-200 shadow-2xs"
                  : "bg-white/90 text-slate-600 border border-slate-200/80 shadow-2xs"
              }`}
            >
              {data.metricas.tareasPendientesCount}
            </span>
          </button>
        </div>
      </div>

      {/* Barra de Herramientas Unificada: Buscador Elástico + Filtros Dimensionales */}
      <div className="bg-white p-3 sm:p-3.5 rounded-2xl border border-slate-200/90 border-b-[3px] border-b-slate-300/90 shadow-2xs">
        <div className="flex flex-col lg:flex-row lg:items-center gap-2.5 sm:gap-3">
          {/* Buscador Elástico Balanceado */}
          <div className="relative flex-1 min-w-[280px] sm:min-w-[340px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder={
                activeTab === "directorio"
                  ? "Buscar por nombre, cédula o teléfono..."
                  : "Buscar por título de tarea o trabajador..."
              }
              className="w-full h-11 pl-10 pr-9 rounded-xl border border-slate-200 text-xs sm:text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#175E38]/20 focus:border-[#175E38] transition-all bg-slate-50/50 hover:bg-white focus:bg-white shadow-2xs"
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

          {/* Desplegables de Filtro con Anchos Proporcionales Calibrados (Sin huecos vacíos y sin cortes) */}
          {activeTab === "directorio" && (
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-2.5 w-full lg:w-auto shrink-0">
              <FilterDropdown
                value={filtroPropiedad}
                onChange={setFiltroPropiedad}
                options={opcionesPropiedadesFiltro}
                placeholder="Inmueble"
                icon={Building2}
                className="w-full sm:w-64 lg:w-[270px]"
                menuWidth="w-72 sm:w-80"
                align="left"
                ariaLabel="Filtrar por inmueble"
              />

              <FilterDropdown
                value={filtroCargo}
                onChange={setFiltroCargo}
                options={opcionesCargo}
                placeholder="Cargo"
                icon={Briefcase}
                className="w-full sm:w-56 lg:w-[245px]"
                menuWidth="w-72 sm:w-80"
                align="left"
                ariaLabel="Filtrar por cargo"
              />

              <FilterDropdown
                value={filtroEstado}
                onChange={setFiltroEstado}
                options={opcionesEstado}
                placeholder="Estado"
                icon={Layers}
                className="w-full sm:w-52 lg:w-[235px]"
                menuWidth="w-64 sm:w-72"
                align="right"
                ariaLabel="Filtrar por estado"
              />
            </div>
          )}

          {activeTab === "tareas" && (
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-2.5 w-full lg:w-auto shrink-0">
              <FilterDropdown
                value={filtroPropiedad}
                onChange={setFiltroPropiedad}
                options={opcionesPropiedadesFiltro}
                placeholder="Inmueble"
                icon={Building2}
                className="w-full sm:w-64 lg:w-[280px]"
                menuWidth="w-72 sm:w-80"
                align="left"
                ariaLabel="Filtrar por inmueble"
              />

              <FilterDropdown
                value={filtroEstadoTarea}
                onChange={(val) => setFiltroEstadoTarea(val)}
                options={opcionesEstadoTarea}
                placeholder="Estado de tarea"
                icon={Layers}
                className="w-full sm:w-56 lg:w-[240px]"
                menuWidth="w-64 sm:w-72"
                align="right"
                ariaLabel="Filtrar por estado de tarea"
              />
            </div>
          )}
        </div>
      </div>

      {/* Pestaña 1: Directorio */}
      {activeTab === "directorio" && (
        <PersonalDirectorioTab
          gruposDirectorio={gruposDirectorio}
          estaDesplegada={estaDesplegadaDirectorio}
          onToggleAcordeon={toggleAcordeonDirectorio}
          onNuevoEmpleado={(propiedadId) => {
            setEmpleadoAEditar(null);
            setPropiedadPreseleccionadaEmpleado(propiedadId || null);
            setModalEmpleadoOpen(true);
          }}
          onEditarEmpleado={(emp) => {
            setEmpleadoAEditar(emp);
            setPropiedadPreseleccionadaEmpleado(emp.propiedadId);
            setModalEmpleadoOpen(true);
          }}
          onToggleEstadoEmpleado={handleToggleEstadoEmpleado}
          onVerDetalleEmpleado={(emp) => {
            setEmpleadoSeleccionadoDetalle(emp);
            setScrollToSeccionDetalle(null);
            setModalDetalleEmpleadoOpen(true);
          }}
          onAsignarTarea={(emp) => {
            setEmpleadoPreseleccionadoTarea(emp);
            setPropiedadPreseleccionadaTarea(emp.propiedadId);
            setModalTareaOpen(true);
          }}
          onRegistrarAsistencia={(emp) => {
            setEmpleadoParaAsistencia(emp);
            setRegistroParaAsistencia(null);
            setModalAsistenciaOpen(true);
          }}
          onAjustarMarcaje={(emp, reg) => {
            setEmpleadoParaAsistencia(emp);
            setRegistroParaAsistencia(reg || emp.asistenciaHoy || null);
            setModalAsistenciaOpen(true);
          }}
          onMarcarSalida={(params) => setAsistenciaParaSalida(params)}
          onVerTareasEmpleado={handleVerTareasEmpleado}
          isPending={isPending}
        />
      )}

      {/* Pestaña 2: Tareas */}
      {activeTab === "tareas" && (
        <PersonalTareasTab
          gruposTareas={gruposTareas}
          estaDesplegada={estaDesplegadaTareas}
          onToggleAcordeon={toggleAcordeonTareas}
          paginasTareas={paginasTareas}
          onCambiarPagina={cambiarPaginaTarea}
          onNuevaTarea={(propiedadId) => {
            setEmpleadoPreseleccionadoTarea(null);
            setPropiedadPreseleccionadaTarea(propiedadId || null);
            setModalTareaOpen(true);
          }}
          onVerDetalleTarea={(tarea) => {
            setTareaSeleccionada(tarea);
            setModalDetalleTareaOpen(true);
          }}
        />
      )}

      {/* Contenedor Modularizado de Modales y Diálogos */}
      <PersonalModalsContainer
        modalEmpleadoOpen={modalEmpleadoOpen}
        onCloseModalEmpleado={() => {
          setModalEmpleadoOpen(false);
          setPropiedadPreseleccionadaEmpleado(null);
        }}
        empleadoAEditar={empleadoAEditar}
        propiedadPreseleccionadaEmpleado={propiedadPreseleccionadaEmpleado}
        propiedades={data.propiedades}
        onSubmitEmpleado={handleCrearOEditarEmpleado}

        modalAsistenciaOpen={modalAsistenciaOpen}
        onCloseModalAsistencia={() => {
          setModalAsistenciaOpen(false);
          setRegistroParaAsistencia(null);
        }}
        empleadoParaAsistencia={empleadoParaAsistencia}
        registroParaAsistencia={registroParaAsistencia}
        onSubmitAsistencia={handleRegistrarAsistencia}

        modalTareaOpen={modalTareaOpen}
        onCloseModalTarea={() => {
          setModalTareaOpen(false);
          setEmpleadoPreseleccionadoTarea(null);
          setPropiedadPreseleccionadaTarea(null);
        }}
        empleados={data.empleados}
        empleadoPreseleccionadoTarea={empleadoPreseleccionadoTarea}
        propiedadPreseleccionadaTarea={propiedadPreseleccionadaTarea}
        onSubmitTarea={handleCrearTarea}

        modalDetalleTareaOpen={modalDetalleTareaOpen}
        onCloseModalDetalleTarea={() => setModalDetalleTareaOpen(false)}
        tareaSeleccionada={tareaSeleccionada}
        onActualizarEstadoTarea={handleActualizarEstadoTarea}
        onEliminarTarea={handleEliminarTarea}
        onVerFoto={handleVerFoto}

        modalDetalleEmpleadoOpen={modalDetalleEmpleadoOpen}
        onCloseModalDetalleEmpleado={() => {
          setModalDetalleEmpleadoOpen(false);
          setScrollToSeccionDetalle(null);
        }}
        empleadoSeleccionadoDetalle={empleadoSeleccionadoDetalle}
        scrollToSeccionDetalle={scrollToSeccionDetalle}
        tareasEmpleado={
          empleadoSeleccionadoDetalle
            ? data.tareas.filter((t) => t.empleadoId === empleadoSeleccionadoDetalle.id)
            : []
        }
        onAsignarTareaDesdeDetalle={(emp) => {
          setEmpleadoPreseleccionadoTarea(emp);
          setModalTareaOpen(true);
        }}
        onRegistrarAsistenciaDesdeDetalle={(emp) => {
          setEmpleadoParaAsistencia(emp);
          setRegistroParaAsistencia(null);
          setModalAsistenciaOpen(true);
        }}
        onEditarAsistenciaDesdeDetalle={(emp, reg) => {
          setEmpleadoParaAsistencia(emp);
          setRegistroParaAsistencia(reg);
          setModalAsistenciaOpen(true);
        }}
        onSeleccionarTareaDesdeDetalle={(tarea) => {
          setTareaSeleccionada(tarea);
          setModalDetalleTareaOpen(true);
        }}

        imageViewerOpen={imageViewerOpen}
        onCloseImageViewer={() => setImageViewerOpen(false)}
        imageViewerUrls={imageViewerUrls}
        imageViewerIndex={imageViewerIndex}

        asistenciaParaSalida={asistenciaParaSalida}
        onCloseConfirmSalida={() => setAsistenciaParaSalida(null)}
        onConfirmSalida={() => {
          if (!asistenciaParaSalida) return;
          const id = asistenciaParaSalida.id;
          setAsistenciaParaSalida(null);
          handleMarcarSalidaRapida(id);
        }}

        empleadoParaDesactivar={empleadoParaDesactivar}
        onCloseConfirmDesactivar={() => setEmpleadoParaDesactivar(null)}
        onConfirmDesactivar={() => {
          if (!empleadoParaDesactivar) return;
          const emp = empleadoParaDesactivar;
          setEmpleadoParaDesactivar(null);
          ejecutarToggleEstado(emp, false);
        }}

        isLoading={isPending}
      />
    </div>
  );
}
