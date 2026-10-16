"use client";

import React, { useState, useMemo, useTransition } from "react";
import {
  Users,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Flame,
  Plus,
  Search,
  Layers,
  Calendar,
  Briefcase,
  FileCheck2,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  Building2,
  ArrowRight,
  LogOut,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { FilterDropdown, type FilterDropdownOption } from "@/components/ui/filter-dropdown";
import { EmptyState } from "@/components/ui/empty-state";
import { ImageViewerModal } from "@/components/ui/image-viewer-modal";
import { CargoEmpleado, EstadoAsistencia, EstadoTarea } from "@prisma/client";
import { EmpleadoCard } from "./EmpleadoCard";
import { EmpleadoFormModal } from "./EmpleadoFormModal";
import { AsistenciaModal } from "./AsistenciaModal";
import { TareaFormModal } from "./TareaFormModal";
import { TareaDetalleModal } from "./TareaDetalleModal";
import { EmpleadoDetalleModal } from "./EmpleadoDetalleModal";
import {
  CARGO_CONFIG,
  ESTADO_ASISTENCIA_CONFIG,
  PRIORIDAD_TAREA_CONFIG,
  ESTADO_TAREA_CONFIG,
  type PersonalDashboardData,
  type EmpleadoItem,
  type TareaEmpleadoItem,
  type RegistroAsistenciaItem,
} from "./types";
import {
  crearEmpleadoAction,
  actualizarEmpleadoAction,
  toggleEstadoEmpleadoAction,
  registrarAsistenciaAction,
  marcarSalidaAction,
  crearTareaAction,
  actualizarEstadoTareaAction,
  eliminarTareaAction,
  type CreateEmpleadoInput,
  type RegistrarAsistenciaInput,
  type CreateTareaInput,
} from "@/lib/actions/personal";

interface PersonalClientProps {
  initialData: PersonalDashboardData;
}

export function PersonalClient({ initialData }: PersonalClientProps) {
  const [data, setData] = useState<PersonalDashboardData>(initialData);
  const [activeTab, setActiveTab] = useState<"directorio" | "asistencia" | "tareas">("directorio");

  // Filtros de búsqueda
  const [busqueda, setBusqueda] = useState("");
  const [filtroCargo, setFiltroCargo] = useState("TODOS");
  const [filtroEstado, setFiltroEstado] = useState("TODOS");
  const [filtroEstadoTarea, setFiltroEstadoTarea] = useState("TODAS");

  const [isPending, startTransition] = useTransition();

  // Estados para Modales
  const [modalEmpleadoOpen, setModalEmpleadoOpen] = useState(false);
  const [empleadoAEditar, setEmpleadoAEditar] = useState<EmpleadoItem | null>(null);

  const [modalAsistenciaOpen, setModalAsistenciaOpen] = useState(false);
  const [empleadoParaAsistencia, setEmpleadoParaAsistencia] = useState<EmpleadoItem | null>(null);

  const [modalTareaOpen, setModalTareaOpen] = useState(false);
  const [empleadoPreseleccionadoTarea, setEmpleadoPreseleccionadoTarea] = useState<EmpleadoItem | null>(null);

  const [modalDetalleTareaOpen, setModalDetalleTareaOpen] = useState(false);
  const [tareaSeleccionada, setTareaSeleccionada] = useState<TareaEmpleadoItem | null>(null);

  const [modalDetalleEmpleadoOpen, setModalDetalleEmpleadoOpen] = useState(false);
  const [empleadoSeleccionadoDetalle, setEmpleadoSeleccionadoDetalle] = useState<EmpleadoItem | null>(null);

  // Visor de fotos
  const [imageViewerOpen, setImageViewerOpen] = useState(false);
  const [imageViewerUrls, setImageViewerUrls] = useState<string[]>([]);
  const [imageViewerIndex, setImageViewerIndex] = useState(0);

  // Opciones para el selector de Cargo (FilterDropdown)
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
      },
      ...Object.entries(CARGO_CONFIG).map(([key, config]) => ({
        value: key,
        label: config.label,
        count: counts[key] || 0,
      })),
    ];
  }, [data.empleados]);

  // Opciones para el selector de Estado
  const opcionesEstado: FilterDropdownOption[] = useMemo(() => {
    const activos = data.empleados.filter((e) => e.activo).length;
    const inactivos = data.empleados.length - activos;

    return [
      { value: "TODOS", label: "Todos los Estados", isGlobal: true, count: data.empleados.length },
      { value: "ACTIVOS", label: "Solo Activos", count: activos },
      { value: "INACTIVOS", label: "Solo Inactivos", count: inactivos },
    ];
  }, [data.empleados]);

  // Filtrado de empleados en tiempo real
  const empleadosFiltrados = useMemo(() => {
    return data.empleados.filter((emp) => {
      // Filtro Cargo
      if (filtroCargo !== "TODOS" && emp.cargo !== filtroCargo) return false;

      // Filtro Estado
      if (filtroEstado === "ACTIVOS" && !emp.activo) return false;
      if (filtroEstado === "INACTIVOS" && emp.activo) return false;

      // Filtro Búsqueda
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
  }, [data.empleados, filtroCargo, filtroEstado, busqueda]);

  // Filtrado de tareas
  const tareasFiltradas = useMemo(() => {
    return data.tareas.filter((t) => {
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
  }, [data.tareas, filtroEstadoTarea, busqueda]);

  // Abrir visor de fotos
  const handleVerFoto = (url: string) => {
    setImageViewerUrls([url]);
    setImageViewerIndex(0);
    setImageViewerOpen(true);
  };

  // ==================== ACCIONES DEL FORMULARIO DE EMPLEADO ====================
  const handleCrearOEditarEmpleado = async (input: CreateEmpleadoInput): Promise<boolean> => {
    return new Promise((resolve) => {
      startTransition(async () => {
        try {
          if (empleadoAEditar) {
            const res = await actualizarEmpleadoAction(empleadoAEditar.id, input);
            if (res.success && res.data) {
              toast.success("Colaborador actualizado exitosamente.");
              // Actualización optimista local
              setData((prev) => ({
                ...prev,
                empleados: prev.empleados.map((e) =>
                  e.id === empleadoAEditar.id
                    ? {
                        ...e,
                        ...res.data,
                        fechaIngreso: res.data.fechaIngreso.toISOString(),
                        usuarioId: res.data.usuarioId,
                      }
                    : e
                ),
              }));
              resolve(true);
            } else {
              toast.error(res.error || "No se pudo actualizar el colaborador.");
              resolve(false);
            }
          } else {
            const res = await crearEmpleadoAction(input);
            if (res.success && res.data) {
              toast.success("Colaborador registrado exitosamente.");
              // Agregar a la lista local
              const nuevoEmp: EmpleadoItem = {
                id: res.data.id,
                nombre: res.data.nombre,
                apellido: res.data.apellido,
                cedula: res.data.cedula,
                telefono: res.data.telefono,
                email: res.data.email,
                direccion: res.data.direccion,
                cargo: res.data.cargo,
                fechaIngreso: res.data.fechaIngreso.toISOString(),
                salarioMensual: res.data.salarioMensual,
                activo: res.data.activo,
                notas: res.data.notas,
                usuarioId: res.data.usuarioId,
                asistenciaHoy: null,
                _count: { tareas: 0, asistencias: 0 },
                tareasPendientesCount: 0,
              };

              setData((prev) => ({
                ...prev,
                empleados: [nuevoEmp, ...prev.empleados],
                metricas: {
                  ...prev.metricas,
                  totalEmpleados: prev.metricas.totalEmpleados + 1,
                  activosCount: prev.metricas.activosCount + 1,
                },
              }));
              resolve(true);
            } else {
              toast.error(res.error || "No se pudo registrar el colaborador.");
              resolve(false);
            }
          }
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : "Error inesperado";
          toast.error(msg);
          resolve(false);
        }
      });
    });
  };

  // Activar o desactivar empleado
  const handleToggleEstadoEmpleado = (emp: EmpleadoItem) => {
    const nuevoEstado = !emp.activo;
    startTransition(async () => {
      const res = await toggleEstadoEmpleadoAction(emp.id, nuevoEstado);
      if (res.success) {
        toast.success(res.message);
        setData((prev) => ({
          ...prev,
          empleados: prev.empleados.map((e) =>
            e.id === emp.id ? { ...e, activo: nuevoEstado } : e
          ),
          metricas: {
            ...prev.metricas,
            activosCount: nuevoEstado
              ? prev.metricas.activosCount + 1
              : prev.metricas.activosCount - 1,
          },
        }));
      } else {
        toast.error(res.error || "No se pudo modificar el estado.");
      }
    });
  };

  // ==================== ACCIONES DE ASISTENCIA ====================
  const handleRegistrarAsistencia = async (input: RegistrarAsistenciaInput): Promise<boolean> => {
    return new Promise((resolve) => {
      startTransition(async () => {
        const res = await registrarAsistenciaAction(input);
        if (res.success && res.data) {
          toast.success(res.message);

          const asistenciaItem: RegistroAsistenciaItem = {
            id: res.data.id,
            empleadoId: res.data.empleadoId,
            fecha: res.data.fecha.toISOString(),
            horaEntrada: res.data.horaEntrada.toISOString(),
            horaSalida: res.data.horaSalida?.toISOString() || null,
            estado: res.data.estado,
            ubicacionEntrada: res.data.ubicacionEntrada,
            ubicacionSalida: res.data.ubicacionSalida,
            observaciones: res.data.observaciones,
            createdAt: res.data.createdAt.toISOString(),
          };

          setData((prev) => {
            const empleadosActualizados = prev.empleados.map((e) =>
              e.id === input.empleadoId
                ? {
                    ...e,
                    asistenciaHoy: asistenciaItem,
                    _count: {
                      ...e._count,
                      asistencias: e.asistenciaHoy
                        ? e._count.asistencias
                        : e._count.asistencias + 1,
                    },
                  }
                : e
            );

            const asistenciasActualizadas = [
              asistenciaItem,
              ...prev.asistenciasHoy.filter((a) => a.empleadoId !== input.empleadoId),
            ];

            const presentesCount = asistenciasActualizadas.filter(
              (a) =>
                a.estado === EstadoAsistencia.PRESENTE || a.estado === EstadoAsistencia.RETARDO
            ).length;

            return {
              ...prev,
              empleados: empleadosActualizados,
              asistenciasHoy: asistenciasActualizadas,
              metricas: {
                ...prev.metricas,
                asistieronHoyCount: presentesCount,
              },
            };
          });
          resolve(true);
        } else {
          toast.error(res.error || "Error al registrar asistencia");
          resolve(false);
        }
      });
    });
  };

  // Marcar salida rápida
  const handleMarcarSalidaRapida = (asistenciaId: string) => {
    startTransition(async () => {
      const res = await marcarSalidaAction(asistenciaId);
      if (res.success && res.data) {
        toast.success(res.message);
        setData((prev) => ({
          ...prev,
          asistenciasHoy: prev.asistenciasHoy.map((a) =>
            a.id === asistenciaId
              ? {
                  ...a,
                  horaSalida: res.data.horaSalida ? res.data.horaSalida.toISOString() : null,
                }
              : a
          ),
          empleados: prev.empleados.map((e) =>
            e.asistenciaHoy?.id === asistenciaId
              ? {
                  ...e,
                  asistenciaHoy: {
                    ...e.asistenciaHoy,
                    horaSalida: res.data.horaSalida ? res.data.horaSalida.toISOString() : null,
                  },
                }
              : e
          ),
        }));
      } else {
        toast.error(res.error || "No se pudo registrar la salida.");
      }
    });
  };

  // ==================== ACCIONES DE TAREAS ====================
  const handleCrearTarea = async (input: CreateTareaInput): Promise<boolean> => {
    return new Promise((resolve) => {
      startTransition(async () => {
        const res = await crearTareaAction(input);
        if (res.success && res.data) {
          toast.success(res.message);

          const emp = data.empleados.find((e) => e.id === input.empleadoId);
          const prop = data.propiedades.find((p) => p.id === input.propiedadId);

          const nuevaTareaItem: TareaEmpleadoItem = {
            id: res.data.id,
            titulo: res.data.titulo,
            descripcion: res.data.descripcion,
            empleadoId: res.data.empleadoId,
            empleadoNombre: emp ? `${emp.nombre} ${emp.apellido || ""}`.trim() : "Colaborador",
            empleadoCargo: emp ? emp.cargo : CargoEmpleado.CONSERJE,
            propiedadId: res.data.propiedadId,
            propiedadNombre: prop ? prop.nombre : null,
            prioridad: res.data.prioridad,
            estado: res.data.estado,
            fechaLimite: res.data.fechaLimite ? res.data.fechaLimite.toISOString() : null,
            fechaCompletada: null,
            evidencias: res.data.evidencias,
            notasResolucion: res.data.notasResolucion,
            createdAt: res.data.createdAt.toISOString(),
          };

          setData((prev) => ({
            ...prev,
            tareas: [nuevaTareaItem, ...prev.tareas],
            empleados: prev.empleados.map((e) =>
              e.id === input.empleadoId
                ? {
                    ...e,
                    tareasPendientesCount: e.tareasPendientesCount + 1,
                    _count: { ...e._count, tareas: e._count.tareas + 1 },
                  }
                : e
            ),
            metricas: {
              ...prev.metricas,
              tareasPendientesCount: prev.metricas.tareasPendientesCount + 1,
              tareasUrgentesCount:
                res.data.prioridad === "URGENTE"
                  ? prev.metricas.tareasUrgentesCount + 1
                  : prev.metricas.tareasUrgentesCount,
            },
          }));
          resolve(true);
        } else {
          toast.error(res.error || "No se pudo asignar la tarea");
          resolve(false);
        }
      });
    });
  };

  const handleActualizarEstadoTarea = async (
    tareaId: string,
    estado: EstadoTarea,
    notasResolucion?: string | null,
    nuevasEvidencias?: string[]
  ): Promise<boolean> => {
    return new Promise((resolve) => {
      startTransition(async () => {
        const res = await actualizarEstadoTareaAction(
          tareaId,
          estado,
          notasResolucion,
          nuevasEvidencias
        );
        if (res.success && res.data) {
          toast.success(res.message);

          setData((prev) => {
            const tareasActualizadas = prev.tareas.map((t) =>
              t.id === tareaId
                ? {
                    ...t,
                    estado: res.data.estado,
                    notasResolucion: res.data.notasResolucion,
                    evidencias: res.data.evidencias,
                    fechaCompletada: res.data.fechaCompletada
                      ? res.data.fechaCompletada.toISOString()
                      : null,
                  }
                : t
            );

            const pendientesCount = tareasActualizadas.filter(
              (t) => t.estado === EstadoTarea.PENDIENTE || t.estado === EstadoTarea.EN_PROCESO
            ).length;

            return {
              ...prev,
              tareas: tareasActualizadas,
              metricas: {
                ...prev.metricas,
                tareasPendientesCount: pendientesCount,
              },
            };
          });
          resolve(true);
        } else {
          toast.error(res.error || "No se pudo actualizar el estado de la tarea");
          resolve(false);
        }
      });
    });
  };

  const handleEliminarTarea = async (tareaId: string): Promise<boolean> => {
    return new Promise((resolve) => {
      startTransition(async () => {
        const res = await eliminarTareaAction(tareaId);
        if (res.success) {
          toast.success(res.message);
          setData((prev) => ({
            ...prev,
            tareas: prev.tareas.filter((t) => t.id !== tareaId),
          }));
          resolve(true);
        } else {
          toast.error(res.error || "No se pudo eliminar la tarea");
          resolve(false);
        }
      });
    });
  };

  return (
    <div className="space-y-6">
      {/* PageHeader con Breadcrumbs y Botones de Acción */}
      <PageHeader
        title="Equipo de Trabajo y Asistencia"
        description="Coordinación del personal operativo, control diario de asistencia y seguimiento de órdenes de trabajo con evidencias."
        icon={<Users className="w-6 h-6 text-[#175E38]" />}
        breadcrumbs={[
          { label: "Admin", href: "/admin/dashboard" },
          { label: "Personal & Asistencia" },
        ]}
        actions={
          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              type="button"
              onClick={() => {
                setEmpleadoPreseleccionadoTarea(null);
                setModalTareaOpen(true);
              }}
              className="h-11 px-4 rounded-xl text-xs font-bold bg-[#1C2539] text-white hover:bg-[#2a3754] transition-all flex items-center gap-2 cursor-pointer shadow-xs active:translate-y-0.5"
            >
              <FileCheck2 className="w-4 h-4" />
              <span>Asignar Tarea</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setEmpleadoAEditar(null);
                setModalEmpleadoOpen(true);
              }}
              className="h-11 px-5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-[#175E38] to-[#124b2d] border-b-[3px] border-b-[#0e3a23] active:translate-y-0.5 transition-all flex items-center gap-2 cursor-pointer shadow-[0_2px_8px_rgba(23,94,56,0.25)]"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Nuevo Colaborador</span>
            </button>
          </div>
        }
      />

      {/* 4 StatCards Ejecutivas con Efecto Sol Ambiental */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Personal Activo */}
        <StatCard
          title="Personal Activo"
          value={data.metricas.activosCount}
          icon={Users}
          color="emerald"
          subtitle={`${data.metricas.totalEmpleados} colaboradores en nómina`}
        />

        {/* Asistencia de Hoy */}
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

        {/* Tareas Pendientes */}
        <StatCard
          title="Tareas en Curso"
          value={data.metricas.tareasPendientesCount}
          icon={AlertTriangle}
          color="amber"
          subtitle="Labores operativas abiertas"
        />

        {/* Tareas Urgentes */}
        <StatCard
          title="Tareas Urgentes"
          value={data.metricas.tareasUrgentesCount}
          icon={Flame}
          color="rose"
          subtitle="Atención prioritaria inmediata"
        />
      </div>

      {/* Selector de Pestañas de Navegación Operativa */}
      <div className="flex items-center gap-1.5 p-1.5 rounded-2xl bg-slate-100/90 border border-slate-200/90 max-w-fit">
        <button
          type="button"
          onClick={() => setActiveTab("directorio")}
          className={`h-10 px-4 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === "directorio"
              ? "bg-white text-slate-900 shadow-sm"
              : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
          }`}
        >
          <Users className="w-3.5 h-3.5 text-[#175E38]" />
          <span>Directorio de Personal</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-slate-100 font-bold">
            {data.empleados.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("asistencia")}
          className={`h-10 px-4 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === "asistencia"
              ? "bg-white text-slate-900 shadow-sm"
              : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
          }`}
        >
          <Clock className="w-3.5 h-3.5 text-blue-600" />
          <span>Control de Asistencia</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-slate-100 font-bold">
            {data.asistenciasHoy.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("tareas")}
          className={`h-10 px-4 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === "tareas"
              ? "bg-white text-slate-900 shadow-sm"
              : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
          }`}
        >
          <FileCheck2 className="w-3.5 h-3.5 text-amber-600" />
          <span>Órdenes de Trabajo</span>
          {data.metricas.tareasPendientesCount > 0 && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-amber-100 text-amber-800 font-bold">
              {data.metricas.tareasPendientesCount}
            </span>
          )}
        </button>
      </div>

      {/* Barra de Filtros Híbridos */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 sm:p-4 rounded-2xl border border-slate-200/90 shadow-2xs">
        {/* Buscador en tiempo real */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder={
              activeTab === "directorio"
                ? "Buscar por nombre, cédula o teléfono..."
                : activeTab === "asistencia"
                ? "Buscar colaborador..."
                : "Buscar por título de tarea o colaborador..."
            }
            className="w-full h-11 pl-10 pr-4 rounded-xl border border-slate-200 text-xs sm:text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#175E38]/20 focus:border-[#175E38] transition-all bg-slate-50/50"
          />
        </div>

        {/* Desplegables de Filtro Híbridos según la Pestaña */}
        <div className="flex items-center gap-2 flex-wrap">
          {activeTab === "directorio" && (
            <>
              {/* Filtro Cargo */}
              <FilterDropdown
                value={filtroCargo}
                onChange={setFiltroCargo}
                options={opcionesCargo}
                placeholder="Cargo"
                icon={Briefcase}
                className="w-full sm:w-56"
              />

              {/* Filtro Estado */}
              <FilterDropdown
                value={filtroEstado}
                onChange={setFiltroEstado}
                options={opcionesEstado}
                placeholder="Estado"
                icon={Layers}
                className="w-full sm:w-48"
              />
            </>
          )}

          {activeTab === "tareas" && (
            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl">
              {(["TODAS", "PENDIENTE", "EN_PROCESO", "COMPLETADA"] as const).map((est) => (
                <button
                  key={est}
                  type="button"
                  onClick={() => setFiltroEstadoTarea(est)}
                  className={`h-8 px-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    filtroEstadoTarea === est
                      ? "bg-white text-slate-900 shadow-2xs"
                      : "text-slate-500 hover:text-slate-900"
                  }`}
                >
                  {est === "TODAS"
                    ? "Todas"
                    : est === "PENDIENTE"
                    ? "Pendientes"
                    : est === "EN_PROCESO"
                    ? "En Curso"
                    : "Completadas"}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ==================== CONTENIDO DE LAS PESTAÑAS ==================== */}

      {/* PESTAÑA 1: DIRECTORIO DE PERSONAL (Cards Grid Pattern) */}
      {activeTab === "directorio" && (
        <div>
          {empleadosFiltrados.length === 0 ? (
            <EmptyState
              title="No se encontraron colaboradores"
              description="No hay personal que coincida con los filtros seleccionados o la nómina aún está vacía."
              icon="users"
              action={{
                label: "Registrar Colaborador",
                onClick: () => {
                  setEmpleadoAEditar(null);
                  setModalEmpleadoOpen(true);
                },
              }}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {empleadosFiltrados.map((emp) => (
                <EmpleadoCard
                  key={emp.id}
                  empleado={emp}
                  onEditar={(e) => {
                    setEmpleadoAEditar(e);
                    setModalEmpleadoOpen(true);
                  }}
                  onToggleEstado={handleToggleEstadoEmpleado}
                  onVerDetalle={(e) => {
                    setEmpleadoSeleccionadoDetalle(e);
                    setModalDetalleEmpleadoOpen(true);
                  }}
                  onAsignarTarea={(e) => {
                    setEmpleadoPreseleccionadoTarea(e);
                    setModalTareaOpen(true);
                  }}
                  onRegistrarAsistencia={(e) => {
                    setEmpleadoParaAsistencia(e);
                    setModalAsistenciaOpen(true);
                  }}
                  isPending={isPending}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* PESTAÑA 2: CONTROL DE ASISTENCIA DIARIA */}
      {activeTab === "asistencia" && (
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
          {/* Cabecera del tablero de asistencia */}
          <div className="p-4 sm:p-5 border-b border-slate-200/80 bg-slate-50/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="font-heading font-black text-slate-900 text-base">
                Jornada Laboral de Hoy
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {new Date().toLocaleDateString("es-VE", {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-600 bg-white border border-slate-200 px-3 py-1.5 rounded-xl shadow-2xs">
                {data.metricas.asistieronHoyCount} de {data.metricas.activosCount} registrados
              </span>
            </div>
          </div>

          {/* Lista de Colaboradores y su Asistencia Hoy */}
          <div className="divide-y divide-slate-100">
            {data.empleados
              .filter((e) => e.activo)
              .map((emp) => {
                const asist = emp.asistenciaHoy;
                const cargoConfig = CARGO_CONFIG[emp.cargo];

                return (
                  <div
                    key={emp.id}
                    className="p-4 sm:p-5 hover:bg-slate-50/80 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    {/* Información del Colaborador */}
                    <div className="flex items-start sm:items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center font-heading font-black text-[#175E38] shrink-0">
                        {emp.nombre.charAt(0)}
                        {emp.apellido ? emp.apellido.charAt(0) : ""}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-slate-900 text-sm">
                            {emp.nombre} {emp.apellido || ""}
                          </span>
                          <span className="text-[11px] font-mono text-slate-400">
                            {emp.cedula}
                          </span>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded ${cargoConfig.badgeClass}`}
                          >
                            {cargoConfig.label}
                          </span>
                        </div>

                        {/* Estado y Horas de Marcaje */}
                        <div className="mt-1 flex items-center gap-3 text-xs text-slate-500 flex-wrap">
                          {asist ? (
                            <>
                              <span
                                className={`inline-flex items-center gap-1 font-bold text-[11px] px-2 py-0.5 rounded ${
                                  ESTADO_ASISTENCIA_CONFIG[asist.estado].badgeClass
                                }`}
                              >
                                <span
                                  className={`w-1.5 h-1.5 rounded-full ${
                                    ESTADO_ASISTENCIA_CONFIG[asist.estado].dotColor
                                  }`}
                                />
                                {ESTADO_ASISTENCIA_CONFIG[asist.estado].label}
                              </span>

                              <span>
                                Entrada:{" "}
                                <strong className="text-slate-800">
                                  {new Date(asist.horaEntrada).toLocaleTimeString("es-VE", {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </strong>
                              </span>

                              {asist.horaSalida ? (
                                <span>
                                  Salida:{" "}
                                  <strong className="text-slate-800">
                                    {new Date(asist.horaSalida).toLocaleTimeString("es-VE", {
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    })}
                                  </strong>
                                </span>
                              ) : (
                                <span className="text-amber-600 font-semibold text-[11px]">
                                  Jornada en curso
                                </span>
                              )}

                              {asist.ubicacionEntrada && (
                                <span className="text-slate-400 text-[11px]">
                                  • {asist.ubicacionEntrada}
                                </span>
                              )}
                            </>
                          ) : (
                            <span className="text-slate-400 italic">
                              Sin registro de asistencia hoy
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Acciones de Asistencia */}
                    <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                      {asist && !asist.horaSalida && (
                        <button
                          type="button"
                          onClick={() => handleMarcarSalidaRapida(asist.id)}
                          disabled={isPending}
                          className="h-9 px-3 rounded-xl text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
                        >
                          <LogOut className="w-3.5 h-3.5" />
                          <span>Marcar Salida</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => {
                          setEmpleadoParaAsistencia(emp);
                          setModalAsistenciaOpen(true);
                        }}
                        className="h-9 px-3 rounded-xl text-xs font-bold bg-[#175E38] text-white hover:bg-[#124b2d] border-b-[3px] border-b-[#0e3a23] active:translate-y-0.5 transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
                      >
                        <Clock className="w-3.5 h-3.5" />
                        <span>{asist ? "Ajustar Marcaje" : "Registrar Entrada"}</span>
                      </button>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* PESTAÑA 3: TABLERO DE TAREAS Y ÓRDENES DE TRABAJO */}
      {activeTab === "tareas" && (
        <div>
          {tareasFiltradas.length === 0 ? (
            <EmptyState
              title="No hay tareas asignadas"
              description="No hay labores operativas con el filtro seleccionado. Puedes crear una nueva orden de trabajo con responsable y fecha límite."
              icon="wrench"
              action={{
                label: "Asignar Nueva Tarea",
                onClick: () => {
                  setEmpleadoPreseleccionadoTarea(null);
                  setModalTareaOpen(true);
                },
              }}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {tareasFiltradas.map((t) => {
                const prioridadConfig = PRIORIDAD_TAREA_CONFIG[t.prioridad];
                const estadoConfig = ESTADO_TAREA_CONFIG[t.estado];

                return (
                  <div
                    key={t.id}
                    onClick={() => {
                      setTareaSeleccionada(t);
                      setModalDetalleTareaOpen(true);
                    }}
                    className="group/tcard p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/90 border-b-[3px] border-b-slate-300/90 shadow-[0_4px_16px_-2px_rgba(28,37,57,0.05)] hover:shadow-[0_12px_28px_-4px_rgba(28,37,57,0.1)] hover:-translate-y-1 transition-all cursor-pointer flex flex-col justify-between space-y-3"
                  >
                    <div className="space-y-2.5">
                      {/* Cabecera de la tarea: Prioridad y Estado */}
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase tracking-wider ${prioridadConfig.badgeClass}`}
                        >
                          {prioridadConfig.label}
                        </span>

                        <span
                          className={`text-[11px] font-bold px-2 py-0.5 rounded border ${estadoConfig.badgeClass}`}
                        >
                          {estadoConfig.label}
                        </span>
                      </div>

                      {/* Título de la tarea */}
                      <h4 className="font-heading font-black text-slate-900 text-sm sm:text-base line-clamp-2 group-hover/tcard:text-[#175E38] transition-colors">
                        {t.titulo}
                      </h4>

                      {t.descripcion && (
                        <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                          {t.descripcion}
                        </p>
                      )}
                    </div>

                    {/* Metadatos inferiores */}
                    <div className="space-y-2 pt-2 border-t border-slate-100 text-xs">
                      <div className="flex items-center justify-between text-slate-600">
                        <span className="font-bold truncate max-w-[150px]">
                          {t.empleadoNombre}
                        </span>
                        <span className="text-[11px] text-slate-400 font-medium">
                          {t.propiedadNombre || "Sede General"}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-slate-400">
                        <span>
                          Límite:{" "}
                          <strong className="text-slate-700">
                            {t.fechaLimite
                              ? new Date(t.fechaLimite).toLocaleDateString("es-VE", {
                                  day: "2-digit",
                                  month: "short",
                                })
                              : "Sin límite"}
                          </strong>
                        </span>

                        {t.evidencias.length > 0 && (
                          <span className="inline-flex items-center gap-1 font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                            📷 {t.evidencias.length} fotos
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ==================== MODALES DEL MÓDULO ==================== */}

      {/* Modal de Crear / Editar Empleado */}
      <EmpleadoFormModal
        isOpen={modalEmpleadoOpen}
        onClose={() => setModalEmpleadoOpen(false)}
        empleadoAEditar={empleadoAEditar}
        onSubmit={handleCrearOEditarEmpleado}
        isLoading={isPending}
      />

      {/* Modal de Asistencia Diaria */}
      <AsistenciaModal
        isOpen={modalAsistenciaOpen}
        onClose={() => setModalAsistenciaOpen(false)}
        empleado={empleadoParaAsistencia}
        onSubmit={handleRegistrarAsistencia}
        isLoading={isPending}
      />

      {/* Modal de Asignación de Tarea */}
      <TareaFormModal
        isOpen={modalTareaOpen}
        onClose={() => setModalTareaOpen(false)}
        empleados={data.empleados}
        propiedades={data.propiedades}
        empleadoPreseleccionado={empleadoPreseleccionadoTarea}
        onSubmit={handleCrearTarea}
        isLoading={isPending}
      />

      {/* Modal de Detalle de Tarea con Evidencias */}
      <TareaDetalleModal
        isOpen={modalDetalleTareaOpen}
        onClose={() => setModalDetalleTareaOpen(false)}
        tarea={tareaSeleccionada}
        onActualizarEstado={handleActualizarEstadoTarea}
        onEliminarTarea={handleEliminarTarea}
        onVerFoto={handleVerFoto}
        isLoading={isPending}
      />

      {/* Modal de Ficha Integral del Colaborador */}
      <EmpleadoDetalleModal
        isOpen={modalDetalleEmpleadoOpen}
        onClose={() => setModalDetalleEmpleadoOpen(false)}
        empleado={empleadoSeleccionadoDetalle}
        tareasEmpleado={
          empleadoSeleccionadoDetalle
            ? data.tareas.filter((t) => t.empleadoId === empleadoSeleccionadoDetalle.id)
            : []
        }
        asistenciasEmpleado={
          empleadoSeleccionadoDetalle
            ? data.asistenciasHoy.filter((a) => a.empleadoId === empleadoSeleccionadoDetalle.id)
            : []
        }
        onAsignarTarea={(emp) => {
          setEmpleadoPreseleccionadoTarea(emp);
          setModalTareaOpen(true);
        }}
        onRegistrarAsistencia={(emp) => {
          setEmpleadoParaAsistencia(emp);
          setModalAsistenciaOpen(true);
        }}
        onSeleccionarTarea={(tarea) => {
          setTareaSeleccionada(tarea);
          setModalDetalleTareaOpen(true);
        }}
      />

      {/* Visor de Fotos / Comprobantes (ImageViewerModal) */}
      <ImageViewerModal
        isOpen={imageViewerOpen}
        onClose={() => setImageViewerOpen(false)}
        images={imageViewerUrls}
        initialIndex={imageViewerIndex}
        title="Evidencia Fotográfica de la Labor"
        subtitle="Fotografía tomada en campo por el colaborador de mantenimiento"
      />
    </div>
  );
}
