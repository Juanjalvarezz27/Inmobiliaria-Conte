"use client";

import React, { useState, useMemo, useTransition, useEffect } from "react";
import {
  Users,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Camera,
  Plus,
  Search,
  Layers,
  Calendar,
  Briefcase,
  FileCheck2,
  ExternalLink,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  ShieldCheck,
  Building2,
  ArrowRight,
  LogOut,
  MapPin,
  Wrench,
  Power,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { FilterDropdown, type FilterDropdownOption } from "@/components/ui/filter-dropdown";
import { EmptyState } from "@/components/ui/empty-state";
import { ImageViewerModal } from "@/components/ui/image-viewer-modal";
import { ConfirmActionModal } from "@/components/ui/confirm-action-modal";
import { CargoEmpleado, EstadoAsistencia, EstadoTarea } from "@prisma/client";
import { EmpleadoCard } from "./EmpleadoCard";
import { AsistenciaCard } from "./AsistenciaCard";
import { TareaCard } from "./TareaCard";
import { EmpleadoFormModal } from "./EmpleadoFormModal";
import { AsistenciaModal } from "./AsistenciaModal";
import { TareaFormModal } from "./TareaFormModal";
import { TareaDetalleModal } from "./TareaDetalleModal";
import { EmpleadoDetalleModal } from "./EmpleadoDetalleModal";
import {
  CARGO_CONFIG,
  ESTADO_ASISTENCIA_CONFIG,
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

const PAGE_SIZE_TAREAS = 6;
const PAGE_SIZE_ASISTENCIA = 8;

interface PersonalClientProps {
  initialData: PersonalDashboardData;
}

export function PersonalClient({ initialData }: PersonalClientProps) {
  const [data, setData] = useState<PersonalDashboardData>(initialData);
  const [activeTab, setActiveTab] = useState<"directorio" | "asistencia" | "tareas">("directorio");

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

  // Estados de acordeones desplegables para las 3 pestañas
  const [acordeonesDirectorio, setAcordeonesDirectorio] = useState<Record<string, boolean>>({});
  const [acordeonesAsistencia, setAcordeonesAsistencia] = useState<Record<string, boolean>>({});
  const [acordeonesTareas, setAcordeonesTareas] = useState<Record<string, boolean>>({});

  // Paginación local de 18 en 18 para Órdenes de Trabajo por Inmueble
  const [paginasTareas, setPaginasTareas] = useState<Record<string, number>>({});
  // Paginación local de 12 en 12 para Asistencia por Inmueble
  const [paginasAsistencia, setPaginasAsistencia] = useState<Record<string, number>>({});
  const [empleadoParaDesactivar, setEmpleadoParaDesactivar] = useState<EmpleadoItem | null>(null);

  // Resetear páginas locales de órdenes de trabajo y asistencia al cambiar filtros o búsqueda
  useEffect(() => {
    setPaginasTareas({});
  }, [filtroPropiedad, filtroEstadoTarea, busqueda]);

  useEffect(() => {
    setPaginasAsistencia({});
  }, [filtroPropiedad, filtroCargo, filtroEstado, busqueda]);

  const cambiarPaginaTarea = (grupoId: string, nuevaPagina: number) => {
    setPaginasTareas((prev) => ({
      ...prev,
      [grupoId]: nuevaPagina,
    }));
  };

  const cambiarPaginaAsistencia = (grupoId: string, nuevaPagina: number) => {
    setPaginasAsistencia((prev) => ({
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

  const toggleAcordeonAsistencia = (id: string) => {
    setAcordeonesAsistencia((prev) => ({
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

  const estaDesplegadaAsistencia = (id: string) =>
    acordeonesAsistencia[id] !== undefined
      ? acordeonesAsistencia[id]
      : busqueda.trim() !== "" || (filtroPropiedad !== "TODAS" && filtroPropiedad === id);

  const estaDesplegadaTareas = (id: string) =>
    acordeonesTareas[id] !== undefined
      ? acordeonesTareas[id]
      : busqueda.trim() !== "" || (filtroPropiedad !== "TODAS" && filtroPropiedad === id);

  // Helper para sol decorativo en esquina del acordeón
  const getCornerSunConfig = (tipo?: string) => {
    switch (tipo) {
      case "CENTRO_COMERCIAL":
        return {
          glow: "bg-blue-500/20",
          ring: "bg-blue-500/[0.08] border-blue-400/25",
          sun: "from-blue-600/25 to-blue-400/5",
        };
      case "EDIFICIO":
        return {
          glow: "bg-indigo-500/20",
          ring: "bg-indigo-500/[0.08] border-indigo-400/25",
          sun: "from-indigo-600/25 to-indigo-400/5",
        };
      case "CASA":
        return {
          glow: "bg-emerald-500/20",
          ring: "bg-emerald-500/[0.08] border-emerald-400/25",
          sun: "from-[#175E38]/30 to-emerald-400/5",
        };
      case "SEDE_CENTRAL":
        return {
          glow: "bg-slate-500/20",
          ring: "bg-slate-500/[0.08] border-slate-400/25",
          sun: "from-[#1C2539]/25 to-slate-400/5",
        };
      default:
        return {
          glow: "bg-emerald-500/20",
          ring: "bg-emerald-500/[0.08] border-emerald-400/25",
          sun: "from-[#175E38]/25 to-transparent",
        };
    }
  };

  // Helper para badge de tipología de propiedad
  const getPropiedadBadge = (tipo?: string) => {
    switch (tipo) {
      case "CENTRO_COMERCIAL":
        return { label: "Centro Comercial", bg: "bg-blue-50 text-blue-800 border-blue-200" };
      case "EDIFICIO":
        return { label: "Edificio", bg: "bg-indigo-50 text-indigo-800 border-indigo-200" };
      case "CASA":
        return { label: "Casa Sola", bg: "bg-emerald-50 text-emerald-800 border-emerald-200" };
      case "SEDE_CENTRAL":
        return { label: "Corporativo", bg: "bg-slate-100 text-slate-800 border-slate-300" };
      default:
        return { label: "Inmueble", bg: "bg-slate-50 text-slate-800 border-slate-200" };
    }
  };

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
      },
      ...data.propiedades.map((p) => ({
        value: p.id,
        label: p.nombre,
        subtitle: p.ciudad,
        count: counts[p.id] || 0,
      })),
      {
        value: "GENERAL",
        label: "Sede Central / Multipropiedad",
        count: counts["GENERAL"] || 0,
      },
    ];
  }, [data.empleados, data.propiedades]);

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

  // Opciones para el selector de Módulo / Sección Activa (FilterDropdown en Móviles)
  const opcionesModulos: FilterDropdownOption[] = useMemo(
    () => [
      {
        value: "directorio",
        label: "Directorio de Personal",
        icon: Users,
        iconClassName: "text-[#175E38]",
        count: data.empleados.length,
      },
      {
        value: "asistencia",
        label: "Control de Asistencia",
        icon: Clock,
        iconClassName: "text-blue-600",
        count: data.asistenciasHoy.length,
      },
      {
        value: "tareas",
        label: "Órdenes de Trabajo",
        icon: FileCheck2,
        iconClassName: "text-amber-600",
        count: data.metricas.tareasPendientesCount,
      },
    ],
    [data.empleados.length, data.asistenciasHoy.length, data.metricas.tareasPendientesCount]
  );

  // Opciones para el selector de Estado de Tareas (FilterDropdown)
  const opcionesEstadoTarea: FilterDropdownOption[] = useMemo(() => {
    const counts = data.tareas.reduce((acc, t) => {
      acc[t.estado] = (acc[t.estado] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return [
      { value: "TODAS", label: "Todas las Tareas", isGlobal: true, count: data.tareas.length },
      { value: "PENDIENTE", label: "Pendientes", count: counts["PENDIENTE"] || 0 },
      { value: "EN_PROCESO", label: "En Proceso", count: counts["EN_PROCESO"] || 0 },
      { value: "COMPLETADA", label: "Completadas", count: counts["COMPLETADA"] || 0 },
    ];
  }, [data.tareas]);

  // Filtrado de empleados en tiempo real
  const empleadosFiltrados = useMemo(() => {
    return data.empleados.filter((emp) => {
      // Filtro Inmueble
      if (filtroPropiedad !== "TODAS") {
        if (filtroPropiedad === "GENERAL") {
          if (emp.propiedadId) return false;
        } else if (emp.propiedadId !== filtroPropiedad) {
          return false;
        }
      }

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
  }, [data.empleados, filtroPropiedad, filtroCargo, filtroEstado, busqueda]);

  // Agrupación de empleados por Inmueble para el Directorio
  const gruposDirectorio = useMemo(() => {
    const mapa = new Map<string, EmpleadoItem[]>();
    for (const emp of empleadosFiltrados) {
      const key = emp.propiedadId || "GENERAL";
      if (!mapa.has(key)) mapa.set(key, []);
      mapa.get(key)!.push(emp);
    }

    const resultado: Array<{
      id: string;
      propiedad: {
        id: string;
        nombre: string;
        ciudad?: string;
        tipo?: string;
      };
      empleados: EmpleadoItem[];
    }> = [];

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
  }, [empleadosFiltrados, data.propiedades]);

  // Filtrado de empleados para la pestaña de asistencia
  const empleadosAsistenciaFiltrados = useMemo(() => {
    return data.empleados.filter((emp) => {
      if (!emp.activo) return false;

      if (filtroPropiedad !== "TODAS") {
        if (filtroPropiedad === "GENERAL") {
          if (emp.propiedadId) return false;
        } else if (emp.propiedadId !== filtroPropiedad) {
          return false;
        }
      }

      if (busqueda.trim()) {
        const query = busqueda.toLowerCase().trim();
        const matchNombre = emp.nombre.toLowerCase().includes(query);
        const matchApellido = emp.apellido?.toLowerCase().includes(query);
        const matchCedula = emp.cedula.toLowerCase().includes(query);
        return matchNombre || matchApellido || matchCedula;
      }

      return true;
    });
  }, [data.empleados, filtroPropiedad, busqueda]);

  // Agrupación de asistencia por Inmueble
  const gruposAsistencia = useMemo(() => {
    const mapa = new Map<string, EmpleadoItem[]>();
    for (const emp of empleadosAsistenciaFiltrados) {
      const key = emp.propiedadId || "GENERAL";
      if (!mapa.has(key)) mapa.set(key, []);
      mapa.get(key)!.push(emp);
    }

    const resultado: Array<{
      id: string;
      propiedad: {
        id: string;
        nombre: string;
        ciudad?: string;
        tipo?: string;
      };
      empleados: EmpleadoItem[];
    }> = [];

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
  }, [empleadosAsistenciaFiltrados, data.propiedades]);

  // Filtrado de tareas
  const tareasFiltradas = useMemo(() => {
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
  }, [data.tareas, data.empleados, filtroPropiedad, filtroEstadoTarea, busqueda]);

  // Agrupación de tareas por Inmueble
  const gruposTareas = useMemo(() => {
    const mapa = new Map<string, TareaEmpleadoItem[]>();
    for (const t of tareasFiltradas) {
      const empAsignado = data.empleados.find((e) => e.id === t.empleadoId);
      const key = t.propiedadId || empAsignado?.propiedadId || "GENERAL";
      if (!mapa.has(key)) mapa.set(key, []);
      mapa.get(key)!.push(t);
    }

    const resultado: Array<{
      id: string;
      propiedad: {
        id: string;
        nombre: string;
        ciudad?: string;
        tipo?: string;
      };
      tareas: TareaEmpleadoItem[];
    }> = [];

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
  }, [tareasFiltradas, data.propiedades, data.empleados]);

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
              toast.success("Trabajador actualizado exitosamente.");
              // Actualización optimista local
              const propiedadActualizada = input.propiedadId
                ? data.propiedades.find((p) => p.id === input.propiedadId) || null
                : null;

              setData((prev) => ({
                ...prev,
                empleados: prev.empleados.map((e) =>
                  e.id === empleadoAEditar.id
                    ? {
                        ...e,
                        ...res.data,
                        propiedadId: res.data.propiedadId,
                        propiedad: propiedadActualizada,
                        fechaIngreso: res.data.fechaIngreso.toISOString(),
                        usuarioId: res.data.usuarioId,
                      }
                    : e
                ),
              }));
              resolve(true);
            } else {
              toast.error(res.error || "No se pudo actualizar el trabajador.");
              resolve(false);
            }
          } else {
            const res = await crearEmpleadoAction(input);
            if (res.success && res.data) {
              toast.success("Trabajador registrado exitosamente.");
              const propiedadNueva = input.propiedadId
                ? data.propiedades.find((p) => p.id === input.propiedadId) || null
                : null;

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
                propiedadId: res.data.propiedadId,
                propiedad: propiedadNueva,
                usuarioId: res.data.usuarioId,
                asistenciaHoy: null,
                _count: { tareas: 0, asistencias: 0 },
                tareasPendientesCount: 0,
                asistenciasCount: 0,
                inasistenciasCount: 0,
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
              toast.error(res.error || "No se pudo registrar el trabajador.");
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

  // Ejecutar cambio de estado del colaborador en BD y estado local
  const ejecutarToggleEstado = (emp: EmpleadoItem, nuevoEstado: boolean) => {
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

  // Disparador: confirmar antes de desactivar a un trabajador activo
  const handleToggleEstadoEmpleado = (emp: EmpleadoItem) => {
    if (emp.activo) {
      setEmpleadoParaDesactivar(emp);
    } else {
      ejecutarToggleEstado(emp, true);
    }
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
            const esAsistencia =
              input.estado === EstadoAsistencia.PRESENTE ||
              input.estado === EstadoAsistencia.RETARDO ||
              input.estado === EstadoAsistencia.PERMISO;
            const esInasistencia =
              input.estado === EstadoAsistencia.FALTA_JUSTIFICADA ||
              input.estado === EstadoAsistencia.FALTA_INJUSTIFICADA;

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
                    asistenciasCount: esAsistencia
                      ? (e.asistenciasCount ?? 0) + (e.asistenciaHoy ? 0 : 1)
                      : e.asistenciasCount ?? 0,
                    inasistenciasCount: esInasistencia
                      ? (e.inasistenciasCount ?? 0) + (e.asistenciaHoy ? 0 : 1)
                      : e.inasistenciasCount ?? 0,
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

          // Sincronizar modal de detalle si está abierto
          setEmpleadoSeleccionadoDetalle((prevDet) => {
            if (!prevDet || prevDet.id !== input.empleadoId) return prevDet;
            const esAsist =
              input.estado === EstadoAsistencia.PRESENTE ||
              input.estado === EstadoAsistencia.RETARDO ||
              input.estado === EstadoAsistencia.PERMISO;
            return {
              ...prevDet,
              asistenciasCount: esAsist
                ? (prevDet.asistenciasCount ?? 0) + 1
                : prevDet.asistenciasCount,
              inasistenciasCount: !esAsist
                ? (prevDet.inasistenciasCount ?? 0) + 1
                : Math.max(0, (prevDet.inasistenciasCount ?? 1) - 1),
            };
          });

          setRegistroParaAsistencia(null);
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
            empleadoNombre: emp ? `${emp.nombre} ${emp.apellido || ""}`.trim() : "Trabajador",
            empleadoCargo: emp ? emp.cargo : CargoEmpleado.CONSERJE,
            propiedadId: res.data.propiedadId,
            propiedadNombre: prop ? prop.nombre : null,
            prioridad: res.data.prioridad,
            estado: res.data.estado,
            fechaLimite: res.data.fechaLimite ? res.data.fechaLimite.toISOString() : null,
            fechaCompletada: null,
            evidencias: res.data.evidencias,
            notasResolucion: res.data.notasResolucion,
            requiereEvidencia: res.data.requiereEvidencia ?? false,
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

  // Manejador interactivo para el botón de órdenes/tareas en la tarjeta
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
        {/* Personal Activo */}
        <StatCard
          title="Personal Activo"
          value={data.metricas.activosCount}
          icon={Users}
          color="emerald"
          subtitle={`${data.metricas.totalEmpleados} trabajadores en nómina`}
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

        {/* Tareas Completadas del Mes */}
        <StatCard
          title="Tareas Completadas"
          value={data.metricas.tareasCompletadasMesCount}
          icon={CheckCircle2}
          color="navy"
          subtitle="Labores resueltas en el mes"
        />
      </div>

      {/* Selector de Pestañas de Navegación Operativa (3 Opciones Visibles en Mobile y Desktop) */}
      <div className="grid grid-cols-3 sm:flex sm:items-center gap-1 sm:gap-1.5 p-1 sm:p-1.5 rounded-2xl bg-slate-100/90 border border-slate-200/90 w-full sm:w-fit">
        {/* Pestaña: Directorio de Personal */}
        <button
          type="button"
          onClick={() => setActiveTab("directorio")}
          className={`h-13 sm:h-10 px-1 sm:px-4 rounded-xl text-xs font-bold transition-all flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-2 cursor-pointer ${
            activeTab === "directorio"
              ? "bg-white text-slate-900 shadow-sm border border-slate-200/80"
              : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
          }`}
        >
          <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
            <Users className="w-4 h-4 sm:w-3.5 sm:h-3.5 text-[#175E38] shrink-0" />
            <span
              className={`sm:hidden text-[10px] font-extrabold px-1.5 py-0.2 rounded-full leading-none shrink-0 ${
                activeTab === "directorio"
                  ? "bg-emerald-100 text-emerald-800"
                  : "bg-slate-200/90 text-slate-600"
              }`}
            >
              {data.empleados.length}
            </span>
          </div>
          <span className="text-[11px] sm:text-xs font-bold tracking-tight text-center truncate max-w-full">
            <span className="sm:hidden">Personal</span>
            <span className="hidden sm:inline">Directorio de Personal</span>
          </span>
          <span className="hidden sm:inline-flex text-[10px] px-1.5 py-0.5 rounded-md bg-slate-100 font-bold shrink-0">
            {data.empleados.length}
          </span>
        </button>

        {/* Pestaña: Control de Asistencia */}
        <button
          type="button"
          onClick={() => setActiveTab("asistencia")}
          className={`h-13 sm:h-10 px-1 sm:px-4 rounded-xl text-xs font-bold transition-all flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-2 cursor-pointer ${
            activeTab === "asistencia"
              ? "bg-white text-slate-900 shadow-sm border border-slate-200/80"
              : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
          }`}
        >
          <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
            <Clock className="w-4 h-4 sm:w-3.5 sm:h-3.5 text-blue-600 shrink-0" />
            <span
              className={`sm:hidden text-[10px] font-extrabold px-1.5 py-0.2 rounded-full leading-none shrink-0 ${
                activeTab === "asistencia"
                  ? "bg-blue-100 text-blue-800"
                  : "bg-slate-200/90 text-slate-600"
              }`}
            >
              {data.asistenciasHoy.length}
            </span>
          </div>
          <span className="text-[11px] sm:text-xs font-bold tracking-tight text-center truncate max-w-full">
            <span className="sm:hidden">Asistencia</span>
            <span className="hidden sm:inline">Control de Asistencia</span>
          </span>
          <span className="hidden sm:inline-flex text-[10px] px-1.5 py-0.5 rounded-md bg-slate-100 font-bold shrink-0">
            {data.asistenciasHoy.length}
          </span>
        </button>

        {/* Pestaña: Órdenes de Trabajo */}
        <button
          type="button"
          onClick={() => setActiveTab("tareas")}
          className={`h-13 sm:h-10 px-1 sm:px-4 rounded-xl text-xs font-bold transition-all flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-2 cursor-pointer ${
            activeTab === "tareas"
              ? "bg-white text-slate-900 shadow-sm border border-slate-200/80"
              : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
          }`}
        >
          <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
            <FileCheck2 className="w-4 h-4 sm:w-3.5 sm:h-3.5 text-amber-600 shrink-0" />
            {data.metricas.tareasPendientesCount > 0 && (
              <span className="sm:hidden text-[10px] font-extrabold px-1.5 py-0.2 rounded-full leading-none bg-amber-100 text-amber-800 shrink-0">
                {data.metricas.tareasPendientesCount}
              </span>
            )}
          </div>
          <span className="text-[11px] sm:text-xs font-bold tracking-tight text-center truncate max-w-full">
            <span className="sm:hidden">Tareas</span>
            <span className="hidden sm:inline">Órdenes de Trabajo</span>
          </span>
          {data.metricas.tareasPendientesCount > 0 && (
            <span className="hidden sm:inline-flex text-[10px] px-1.5 py-0.5 rounded-md bg-amber-100 text-amber-800 font-bold shrink-0">
              {data.metricas.tareasPendientesCount}
            </span>
          )}
        </button>
      </div>

      {/* Barra de Filtros Híbridos */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 bg-white p-3 sm:p-4 rounded-2xl border border-slate-200/90 shadow-2xs">
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
                ? "Buscar trabajador..."
                : "Buscar por título de tarea o trabajador..."
            }
            className="w-full h-11 pl-10 pr-4 rounded-xl border border-slate-200 text-xs sm:text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#175E38]/20 focus:border-[#175E38] transition-all bg-slate-50/50"
          />
        </div>

        {/* Desplegables de Filtro Híbridos según la Pestaña */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:flex lg:items-center gap-2 w-full lg:w-auto">
          {/* Filtro Inmueble transversal a todas las pestañas */}
          <FilterDropdown
            value={filtroPropiedad}
            onChange={setFiltroPropiedad}
            options={opcionesPropiedadesFiltro}
            placeholder="Inmueble"
            icon={Building2}
            className="w-full lg:w-60"
          />

          {activeTab === "directorio" && (
            <>
              {/* Filtro Cargo */}
              <FilterDropdown
                value={filtroCargo}
                onChange={setFiltroCargo}
                options={opcionesCargo}
                placeholder="Cargo"
                icon={Briefcase}
                className="w-full lg:w-56"
              />

              {/* Filtro Estado */}
              <FilterDropdown
                value={filtroEstado}
                onChange={setFiltroEstado}
                options={opcionesEstado}
                placeholder="Estado"
                icon={Layers}
                className="w-full lg:w-48"
              />
            </>
          )}

          {activeTab === "tareas" && (
            <FilterDropdown
              value={filtroEstadoTarea}
              onChange={(val) => setFiltroEstadoTarea(val as any)}
              options={opcionesEstadoTarea}
              placeholder="Estado labor"
              icon={Layers}
              className="w-full lg:w-48"
            />
          )}
        </div>
      </div>

      {/* ==================== CONTENIDO DE LAS PESTAÑAS ==================== */}

      {/* PESTAÑA 1: DIRECTORIO DE PERSONAL (Acordeones Desplegables por Inmueble) */}
      {activeTab === "directorio" && (
        <div>
          {gruposDirectorio.length === 0 ? (
            <EmptyState
              title="No se encontraron trabajadores"
              description="No hay personal que coincida con los filtros seleccionados o la nómina aún está vacía."
              icon="users"
              action={{
                label: "Registrar Trabajador",
                onClick: () => {
                  setEmpleadoAEditar(null);
                  setPropiedadPreseleccionadaEmpleado(null);
                  setModalEmpleadoOpen(true);
                },
              }}
            />
          ) : (
            <div className="space-y-4 sm:space-y-5">
              {gruposDirectorio.map((grupo) => {
                const cornerSun = getCornerSunConfig(grupo.propiedad.tipo);
                const badgeConfig = getPropiedadBadge(grupo.propiedad.tipo);
                const estaDesplegada = estaDesplegadaDirectorio(grupo.id);
                const activosCount = grupo.empleados.filter((e) => e.activo).length;
                const inactivosCount = grupo.empleados.length - activosCount;

                return (
                  <section
                    key={grupo.id}
                    className={`group/acordeon relative overflow-hidden bg-gradient-to-b from-white via-white to-slate-50/60 rounded-2xl sm:rounded-3xl border border-slate-200/90 border-b-[3px] border-b-slate-300/90 shadow-[0_4px_20px_-2px_rgba(28,37,57,0.07),0_2px_6px_-1px_rgba(28,37,57,0.04)] hover:shadow-[0_12px_28px_-4px_rgba(28,37,57,0.11),0_4px_8px_-2px_rgba(28,37,57,0.05)] transition-shadow duration-200 ${
                      estaDesplegada ? "border-slate-300/90 ring-1 ring-slate-300/60 shadow-md" : ""
                    }`}
                  >
                    {/* Sol decorativo en esquina superior izquierda */}
                    <div className="absolute -top-8 -left-8 w-28 h-28 pointer-events-none overflow-hidden rounded-full z-0">
                      <div className={`absolute inset-0 rounded-full ${cornerSun.glow} blur-xl`} />
                      <div className={`absolute inset-3 rounded-full ${cornerSun.ring} border`} />
                      <div className={`absolute inset-7 rounded-full bg-gradient-to-br ${cornerSun.sun} transition-transform duration-500 group-hover/acordeon:scale-125`} />
                    </div>

                    {/* Cabecera del Inmueble (Clickeable) */}
                    <div
                      onClick={() => toggleAcordeonDirectorio(grupo.id)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          toggleAcordeonDirectorio(grupo.id);
                        }
                      }}
                      className="w-full relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 p-4 sm:p-5 cursor-pointer hover:bg-slate-50/40 transition-colors select-none text-left"
                      title={estaDesplegada ? "Clic para contraer trabajadores" : "Clic para desplegar trabajadores"}
                    >
                      {/* Información Principal del Inmueble */}
                      <div className="flex items-start sm:items-center gap-3 min-w-0">
                        <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-white/95 text-slate-800 flex items-center justify-center shrink-0 border border-slate-200/90 shadow-2xs backdrop-blur-xs mt-0.5 sm:mt-0">
                          <Building2 className="w-5 h-5 text-black" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="text-base sm:text-lg font-black text-black font-heading tracking-tight">
                              {grupo.propiedad.nombre}
                            </h3>
                            {badgeConfig && (
                              <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md border shrink-0 ${badgeConfig.bg}`}>
                                {badgeConfig.label}
                              </span>
                            )}
                          </div>
                          {grupo.propiedad.ciudad && (
                            <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                              <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                              <span>{grupo.propiedad.ciudad}</span>
                            </p>
                          )}

                          {/* Conteo de Trabajadores y Estados */}
                          <div className="flex items-center gap-1.5 mt-2 flex-wrap text-xs">
                            <span className="px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-700 font-bold border border-slate-200/70 text-[11px]">
                              {grupo.empleados.length} {grupo.empleados.length === 1 ? "trabajador" : "trabajadores"}
                            </span>
                            {activosCount > 0 && (
                              <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 font-bold text-[11px] border border-emerald-200/70">
                                {activosCount} activo{activosCount > 1 ? "s" : ""}
                              </span>
                            )}
                            {inactivosCount > 0 && (
                              <span className="px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 font-bold text-[11px] border border-rose-200/70">
                                {inactivosCount} inactivo{inactivosCount > 1 ? "s" : ""}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Acciones: Desplegar a la izquierda y Registrar Trabajador a la derecha */}
                      <div className="w-full sm:w-auto flex items-center justify-between sm:justify-end gap-2.5 sm:gap-3 pt-2.5 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                        <div className="flex items-center gap-2 cursor-pointer text-slate-700 hover:text-black transition-colors shrink-0">
                          <div
                            className={`w-8 h-8 rounded-xl flex items-center justify-center border border-slate-200/90 bg-white/95 text-slate-700 hover:text-black hover:bg-slate-100 transition-transform duration-200 ease-out shadow-2xs ${
                              estaDesplegada ? "rotate-180 bg-slate-100 text-black border-slate-300" : ""
                            }`}
                          >
                            <ChevronDown className="w-4 h-4 stroke-[2.5]" />
                          </div>
                          <span className="text-xs font-bold text-slate-600 select-none">
                            {estaDesplegada ? "Cerrar" : <><span className="hidden min-[380px]:inline">Ver </span>Trabajadores</>}
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEmpleadoAEditar(null);
                            setPropiedadPreseleccionadaEmpleado(grupo.id === "GENERAL" ? null : grupo.id);
                            setModalEmpleadoOpen(true);
                          }}
                          className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-[#175E38] text-white text-xs font-bold hover:bg-[#124b2d] transition-all shadow-xs cursor-pointer active:translate-y-0.5 whitespace-nowrap shrink-0"
                        >
                          <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                          <span><span className="hidden min-[400px]:inline">Registrar </span>Trabajador</span>
                        </button>
                      </div>
                    </div>

                    {/* Contenedor Animado con CSS Grid */}
                    <div
                      className={`grid transition-[grid-template-rows,opacity] duration-200 ease-out ${
                        estaDesplegada
                          ? "grid-rows-[1fr] opacity-100"
                          : "grid-rows-[0fr] opacity-0 pointer-events-none"
                      }`}
                    >
                      <div className="overflow-hidden min-h-0 border-t border-slate-100">
                        <div className="p-4 sm:p-5">
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                            {grupo.empleados.map((emp) => (
                              <EmpleadoCard
                                key={emp.id}
                                empleado={emp}
                                onEditar={(e) => {
                                  setEmpleadoAEditar(e);
                                  setPropiedadPreseleccionadaEmpleado(e.propiedadId);
                                  setModalEmpleadoOpen(true);
                                }}
                                onToggleEstado={handleToggleEstadoEmpleado}
                                onVerDetalle={(e) => {
                                  setEmpleadoSeleccionadoDetalle(e);
                                  setScrollToSeccionDetalle(null);
                                  setModalDetalleEmpleadoOpen(true);
                                }}
                                onAsignarTarea={(e) => {
                                  setEmpleadoPreseleccionadoTarea(e);
                                  setPropiedadPreseleccionadaTarea(e.propiedadId);
                                  setModalTareaOpen(true);
                                }}
                                onRegistrarAsistencia={(e) => {
                                  setEmpleadoParaAsistencia(e);
                                  setModalAsistenciaOpen(true);
                                }}
                                onVerTareas={handleVerTareasEmpleado}
                                isPending={isPending}
                              />
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </section>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* PESTAÑA 2: CONTROL DE ASISTENCIA DIARIA (Acordeones Desplegables por Inmueble) */}
      {activeTab === "asistencia" && (
        <div>
          {gruposAsistencia.length === 0 ? (
            <EmptyState
              title="Sin personal para asistencia"
              description="No hay trabajadores activos en el inmueble seleccionado o según los criterios de búsqueda."
              icon="clock"
            />
          ) : (
            <div className="space-y-4 sm:space-y-5">
              {gruposAsistencia.map((grupo) => {
                const cornerSun = getCornerSunConfig(grupo.propiedad.tipo);
                const badgeConfig = getPropiedadBadge(grupo.propiedad.tipo);
                const estaDesplegada = estaDesplegadaAsistencia(grupo.id);

                const registradosHoy = grupo.empleados.filter((e) => Boolean(e.asistenciaHoy)).length;
                const presentesHoy = grupo.empleados.filter(
                  (e) =>
                    e.asistenciaHoy?.estado === EstadoAsistencia.PRESENTE ||
                    e.asistenciaHoy?.estado === EstadoAsistencia.RETARDO
                ).length;
                const justificadosHoy = grupo.empleados.filter(
                  (e) =>
                    e.asistenciaHoy?.estado === EstadoAsistencia.FALTA_JUSTIFICADA ||
                    e.asistenciaHoy?.estado === EstadoAsistencia.PERMISO
                ).length;
                const ausentesHoy = grupo.empleados.filter(
                  (e) => e.asistenciaHoy?.estado === EstadoAsistencia.FALTA_INJUSTIFICADA
                ).length;
                const sinMarcar = grupo.empleados.length - registradosHoy;

                // Paginación local de 12 en 12 por Inmueble para Asistencia
                const paginaActualAsis = paginasAsistencia[grupo.id] ?? 1;
                const totalPaginasAsis = Math.ceil(grupo.empleados.length / PAGE_SIZE_ASISTENCIA);
                const paginaSeguraAsis = totalPaginasAsis > 0 ? Math.min(Math.max(1, paginaActualAsis), totalPaginasAsis) : 1;
                const inicioAsis = (paginaSeguraAsis - 1) * PAGE_SIZE_ASISTENCIA;
                const finAsis = inicioAsis + PAGE_SIZE_ASISTENCIA;
                const empleadosPagina = grupo.empleados.slice(inicioAsis, finAsis);

                return (
                  <section
                    key={grupo.id}
                    className={`group/acordeon relative overflow-hidden bg-gradient-to-b from-white via-white to-slate-50/60 rounded-2xl sm:rounded-3xl border border-slate-200/90 border-b-[3px] border-b-slate-300/90 shadow-[0_4px_20px_-2px_rgba(28,37,57,0.07),0_2px_6px_-1px_rgba(28,37,57,0.04)] hover:shadow-[0_12px_28px_-4px_rgba(28,37,57,0.11),0_4px_8px_-2px_rgba(28,37,57,0.05)] transition-shadow duration-200 ${
                      estaDesplegada ? "border-slate-300/90 ring-1 ring-slate-300/60 shadow-md" : ""
                    }`}
                  >
                    {/* Sol decorativo */}
                    <div className="absolute -top-8 -left-8 w-28 h-28 pointer-events-none overflow-hidden rounded-full z-0">
                      <div className={`absolute inset-0 rounded-full ${cornerSun.glow} blur-xl`} />
                      <div className={`absolute inset-3 rounded-full ${cornerSun.ring} border`} />
                      <div className={`absolute inset-7 rounded-full bg-gradient-to-br ${cornerSun.sun} transition-transform duration-500 group-hover/acordeon:scale-125`} />
                    </div>

                    {/* Cabecera del Inmueble */}
                    <div
                      onClick={() => toggleAcordeonAsistencia(grupo.id)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          toggleAcordeonAsistencia(grupo.id);
                        }
                      }}
                      className="w-full relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 p-4 sm:p-5 cursor-pointer hover:bg-slate-50/40 transition-colors select-none text-left"
                      title={estaDesplegada ? "Clic para contraer asistencia" : "Clic para desplegar asistencia"}
                    >
                      <div className="flex items-start sm:items-center gap-3 min-w-0">
                        <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-white/95 text-slate-800 flex items-center justify-center shrink-0 border border-slate-200/90 shadow-2xs backdrop-blur-xs mt-0.5 sm:mt-0">
                          <Clock className="w-5 h-5 text-black" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="text-base sm:text-lg font-black text-black font-heading tracking-tight">
                              {grupo.propiedad.nombre}
                            </h3>
                            {badgeConfig && (
                              <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md border shrink-0 ${badgeConfig.bg}`}>
                                {badgeConfig.label}
                              </span>
                            )}
                          </div>
                          {grupo.propiedad.ciudad && (
                            <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                              <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                              <span>{grupo.propiedad.ciudad}</span>
                            </p>
                          )}

                          {/* Conteo de Asistencia */}
                          <div className="flex items-center gap-1.5 mt-2 flex-wrap text-xs">
                            <span className="px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-700 font-bold border border-slate-200/70 text-[11px]">
                              {grupo.empleados.length} {grupo.empleados.length === 1 ? "trabajador" : "trabajadores"}
                            </span>
                            {presentesHoy > 0 && (
                              <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 font-bold text-[11px] border border-emerald-200/70">
                                {presentesHoy} {presentesHoy > 1 ? "presentes" : "presente"}
                              </span>
                            )}
                            {justificadosHoy > 0 && (
                              <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 font-bold text-[11px] border border-blue-200/70">
                                {justificadosHoy} {justificadosHoy > 1 ? "justificados" : "justificado"}
                              </span>
                            )}
                            {ausentesHoy > 0 && (
                              <span className="px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 font-bold text-[11px] border border-rose-200/70">
                                {ausentesHoy} {ausentesHoy > 1 ? "ausentes" : "ausente"}
                              </span>
                            )}
                            {sinMarcar > 0 && (
                              <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 font-bold text-[11px] border border-amber-200">
                                {sinMarcar} sin marcar
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="w-full sm:w-auto flex items-center justify-between sm:justify-end gap-2.5 sm:gap-3 pt-2.5 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                        <div className="flex items-center gap-2 cursor-pointer text-slate-700 hover:text-black transition-colors shrink-0">
                          <div
                            className={`w-8 h-8 rounded-xl flex items-center justify-center border border-slate-200/90 bg-white/95 text-slate-700 hover:text-black hover:bg-slate-100 transition-transform duration-200 ease-out shadow-2xs ${
                              estaDesplegada ? "rotate-180 bg-slate-100 text-black border-slate-300" : ""
                            }`}
                          >
                            <ChevronDown className="w-4 h-4 stroke-[2.5]" />
                          </div>
                          <span className="text-xs font-bold text-slate-600 select-none">
                            {estaDesplegada ? "Cerrar" : <><span className="hidden min-[380px]:inline">Ver </span>Asistencia</>}
                          </span>
                        </div>

                        <span className="text-xs font-bold text-slate-700 bg-white border border-slate-200/90 px-2.5 sm:px-3 py-1.5 rounded-xl shadow-2xs shrink-0">
                          {registradosHoy} de {grupo.empleados.length} hoy
                        </span>
                      </div>
                    </div>

                    {/* Contenedor Animado con CSS Grid */}
                    <div
                      className={`grid transition-[grid-template-rows,opacity] duration-200 ease-out ${
                        estaDesplegada
                          ? "grid-rows-[1fr] opacity-100"
                          : "grid-rows-[0fr] opacity-0 pointer-events-none"
                      }`}
                    >
                      <div className="overflow-hidden min-h-0 border-t border-slate-100 p-4 sm:p-5">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                          {empleadosPagina.map((emp) => (
                            <AsistenciaCard
                              key={emp.id}
                              empleado={emp}
                              onRegistrarAsistencia={(colab) => {
                                setEmpleadoParaAsistencia(colab);
                                setRegistroParaAsistencia(null);
                                setModalAsistenciaOpen(true);
                              }}
                              onAjustarMarcaje={(colab, reg) => {
                                setEmpleadoParaAsistencia(colab);
                                setRegistroParaAsistencia(reg || colab.asistenciaHoy || null);
                                setModalAsistenciaOpen(true);
                              }}
                              onMarcarSalida={(params) => setAsistenciaParaSalida(params)}
                              onVerFicha={(colab) => {
                                setEmpleadoSeleccionadoDetalle(colab);
                                setModalDetalleEmpleadoOpen(true);
                              }}
                              isPending={isPending}
                            />
                          ))}
                        </div>

                        {/* Controles de paginación */}
                        {grupo.empleados.length > 0 && (
                          <div className="pt-4 mt-5 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                            <p className="text-slate-500 font-medium shrink-0">
                              Mostrando{" "}
                              <strong className="text-slate-800 font-bold">{inicioAsis + 1}</strong> a{" "}
                              <strong className="text-slate-800 font-bold">
                                {Math.min(finAsis, grupo.empleados.length)}
                              </strong>{" "}
                              de <strong className="text-slate-800 font-bold">{grupo.empleados.length}</strong>{" "}
                              {grupo.empleados.length === 1 ? "trabajador" : "trabajadores"}
                            </p>

                            <div className="flex items-center gap-1.5 flex-wrap justify-center">
                              {/* Anterior */}
                              <button
                                type="button"
                                disabled={paginaSeguraAsis === 1}
                                onClick={() => cambiarPaginaAsistencia(grupo.id, paginaSeguraAsis - 1)}
                                className="w-8 h-8 rounded-lg border border-slate-200 bg-white text-slate-500 flex items-center justify-center transition-all hover:bg-slate-50 hover:border-slate-300 disabled:opacity-30 disabled:cursor-not-allowed shadow-2xs cursor-pointer"
                                aria-label="Página anterior"
                              >
                                <ChevronLeft className="w-3.5 h-3.5" />
                              </button>

                              {/* Números de página */}
                              {Array.from({ length: Math.max(1, totalPaginasAsis) }, (_, i) => i + 1)
                                .filter((p) => {
                                  if (totalPaginasAsis <= 5) return true;
                                  return p === 1 || p === totalPaginasAsis || Math.abs(p - paginaSeguraAsis) <= 1;
                                })
                                .reduce<(number | "...")[]>((acc, p, idx, arr) => {
                                  if (
                                    idx > 0 &&
                                    typeof arr[idx - 1] === "number" &&
                                    (p as number) - (arr[idx - 1] as number) > 1
                                  ) {
                                    acc.push("...");
                                  }
                                  acc.push(p);
                                  return acc;
                                }, [])
                                .map((item, idx) =>
                                  item === "..." ? (
                                    <span
                                      key={`ellipsis-${idx}`}
                                      className="w-8 h-8 flex items-center justify-center text-xs text-slate-400"
                                    >
                                      ···
                                    </span>
                                  ) : (
                                    <button
                                      key={item}
                                      type="button"
                                      onClick={() => cambiarPaginaAsistencia(grupo.id, item as number)}
                                      className={`w-8 h-8 rounded-lg text-xs font-bold transition-all flex items-center justify-center cursor-pointer ${
                                        paginaSeguraAsis === item
                                          ? "bg-[#175E38] text-white shadow-xs"
                                          : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-300"
                                      }`}
                                    >
                                      {item}
                                    </button>
                                  )
                                )}

                              {/* Siguiente */}
                              <button
                                type="button"
                                disabled={paginaSeguraAsis === totalPaginasAsis || totalPaginasAsis <= 1}
                                onClick={() => cambiarPaginaAsistencia(grupo.id, paginaSeguraAsis + 1)}
                                className="w-8 h-8 rounded-lg border border-slate-200 bg-white text-slate-500 flex items-center justify-center transition-all hover:bg-slate-50 hover:border-slate-300 disabled:opacity-30 disabled:cursor-not-allowed shadow-2xs cursor-pointer"
                                aria-label="Página siguiente"
                              >
                                <ChevronRight className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </section>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* PESTAÑA 3: TABLERO DE TAREAS Y ÓRDENES DE TRABAJO (Acordeones Desplegables por Inmueble) */}
      {activeTab === "tareas" && (
        <div>
          {gruposTareas.length === 0 ? (
            <EmptyState
              title="No hay tareas asignadas"
              description="No hay labores operativas con el filtro seleccionado. Puedes crear una nueva orden de trabajo con responsable y fecha límite."
              icon="wrench"
              action={{
                label: "Asignar Nueva Tarea",
                onClick: () => {
                  setEmpleadoPreseleccionadoTarea(null);
                  setPropiedadPreseleccionadaTarea(null);
                  setModalTareaOpen(true);
                },
              }}
            />
          ) : (
            <div className="space-y-4 sm:space-y-5">
              {gruposTareas.map((grupo) => {
                const cornerSun = getCornerSunConfig(grupo.propiedad.tipo);
                const badgeConfig = getPropiedadBadge(grupo.propiedad.tipo);
                const estaDesplegada = estaDesplegadaTareas(grupo.id);

                const pendientesCount = grupo.tareas.filter((t) => t.estado === EstadoTarea.PENDIENTE).length;
                const enProcesoCount = grupo.tareas.filter((t) => t.estado === EstadoTarea.EN_PROCESO).length;
                const completadasCount = grupo.tareas.filter((t) => t.estado === EstadoTarea.COMPLETADA).length;

                // Paginación local de 18 en 18 por Inmueble
                const paginaActual = paginasTareas[grupo.id] ?? 1;
                const totalPaginas = Math.ceil(grupo.tareas.length / PAGE_SIZE_TAREAS);
                const paginaSegura = totalPaginas > 0 ? Math.min(Math.max(1, paginaActual), totalPaginas) : 1;
                const inicio = (paginaSegura - 1) * PAGE_SIZE_TAREAS;
                const fin = inicio + PAGE_SIZE_TAREAS;
                const tareasPagina = grupo.tareas.slice(inicio, fin);

                return (
                  <section
                    key={grupo.id}
                    className={`group/acordeon relative overflow-hidden bg-gradient-to-b from-white via-white to-slate-50/60 rounded-2xl sm:rounded-3xl border border-slate-200/90 border-b-[3px] border-b-slate-300/90 shadow-[0_4px_20px_-2px_rgba(28,37,57,0.07),0_2px_6px_-1px_rgba(28,37,57,0.04)] hover:shadow-[0_12px_28px_-4px_rgba(28,37,57,0.11),0_4px_8px_-2px_rgba(28,37,57,0.05)] transition-shadow duration-200 ${
                      estaDesplegada ? "border-slate-300/90 ring-1 ring-slate-300/60 shadow-md" : ""
                    }`}
                  >
                    {/* Sol decorativo */}
                    <div className="absolute -top-8 -left-8 w-28 h-28 pointer-events-none overflow-hidden rounded-full z-0">
                      <div className={`absolute inset-0 rounded-full ${cornerSun.glow} blur-xl`} />
                      <div className={`absolute inset-3 rounded-full ${cornerSun.ring} border`} />
                      <div className={`absolute inset-7 rounded-full bg-gradient-to-br ${cornerSun.sun} transition-transform duration-500 group-hover/acordeon:scale-125`} />
                    </div>

                    {/* Cabecera del Inmueble */}
                    <div
                      onClick={() => toggleAcordeonTareas(grupo.id)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          toggleAcordeonTareas(grupo.id);
                        }
                      }}
                      className="w-full relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 p-4 sm:p-5 cursor-pointer hover:bg-slate-50/40 transition-colors select-none text-left"
                      title={estaDesplegada ? "Clic para contraer órdenes de trabajo" : "Clic para desplegar órdenes de trabajo"}
                    >
                      <div className="flex items-start sm:items-center gap-3 min-w-0">
                        <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-white/95 text-slate-800 flex items-center justify-center shrink-0 border border-slate-200/90 shadow-2xs backdrop-blur-xs mt-0.5 sm:mt-0">
                          <Wrench className="w-5 h-5 text-black" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="text-base sm:text-lg font-black text-black font-heading tracking-tight">
                              {grupo.propiedad.nombre}
                            </h3>
                            {badgeConfig && (
                              <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md border shrink-0 ${badgeConfig.bg}`}>
                                {badgeConfig.label}
                              </span>
                            )}
                          </div>
                          {grupo.propiedad.ciudad && (
                            <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                              <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                              <span>{grupo.propiedad.ciudad}</span>
                            </p>
                          )}

                          {/* Conteo de Tareas */}
                          <div className="flex items-center gap-1.5 mt-2 flex-wrap text-xs">
                            <span className="px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-700 font-bold border border-slate-200/70 text-[11px]">
                              {grupo.tareas.length} {grupo.tareas.length === 1 ? "orden" : "órdenes"}
                            </span>
                            {pendientesCount > 0 && (
                              <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 font-bold text-[11px] border border-amber-200/70">
                                {pendientesCount} pendiente{pendientesCount > 1 ? "s" : ""}
                              </span>
                            )}
                            {enProcesoCount > 0 && (
                              <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 font-bold text-[11px] border border-blue-200/70">
                                {enProcesoCount} en proceso
                              </span>
                            )}
                            {completadasCount > 0 && (
                              <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 font-bold text-[11px] border border-emerald-200/70">
                                {completadasCount} completada{completadasCount > 1 ? "s" : ""}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="w-full sm:w-auto flex items-center justify-between sm:justify-end gap-2.5 sm:gap-3 pt-2.5 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                        <div className="flex items-center gap-2 cursor-pointer text-slate-700 hover:text-black transition-colors shrink-0">
                          <div
                            className={`w-8 h-8 rounded-xl flex items-center justify-center border border-slate-200/90 bg-white/95 text-slate-700 hover:text-black hover:bg-slate-100 transition-transform duration-200 ease-out shadow-2xs ${
                              estaDesplegada ? "rotate-180 bg-slate-100 text-black border-slate-300" : ""
                            }`}
                          >
                            <ChevronDown className="w-4 h-4 stroke-[2.5]" />
                          </div>
                          <span className="text-xs font-bold text-slate-600 select-none">
                            {estaDesplegada ? "Cerrar" : <><span className="hidden min-[380px]:inline">Ver </span>Órdenes</>}
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEmpleadoPreseleccionadoTarea(null);
                            setPropiedadPreseleccionadaTarea(grupo.id === "GENERAL" ? null : grupo.id);
                            setModalTareaOpen(true);
                          }}
                          className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-[#175E38] text-white text-xs font-bold hover:bg-[#124b2d] transition-all shadow-xs cursor-pointer active:translate-y-0.5 whitespace-nowrap shrink-0"
                        >
                          <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                          <span><span className="hidden min-[400px]:inline">Asignar </span>Tarea</span>
                        </button>
                      </div>
                    </div>

                    {/* Contenedor Animado con CSS Grid */}
                    <div
                      className={`grid transition-[grid-template-rows,opacity] duration-200 ease-out ${
                        estaDesplegada
                          ? "grid-rows-[1fr] opacity-100"
                          : "grid-rows-[0fr] opacity-0 pointer-events-none"
                      }`}
                    >
                      <div className="overflow-hidden min-h-0 border-t border-slate-100 p-4 sm:p-5">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                          {tareasPagina.map((t) => (
                            <TareaCard
                              key={t.id}
                              tarea={t}
                              onVerDetalle={(tarea) => {
                                setTareaSeleccionada(tarea);
                                setModalDetalleTareaOpen(true);
                              }}
                            />
                          ))}
                        </div>

                        {/* Controles de paginación */}
                        {grupo.tareas.length > 0 && (
                          <div className="pt-4 mt-5 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                            <p className="text-slate-500 font-medium shrink-0">
                              Mostrando{" "}
                              <strong className="text-slate-800 font-bold">{inicio + 1}</strong> a{" "}
                              <strong className="text-slate-800 font-bold">
                                {Math.min(fin, grupo.tareas.length)}
                              </strong>{" "}
                              de <strong className="text-slate-800 font-bold">{grupo.tareas.length}</strong>{" "}
                              {grupo.tareas.length === 1 ? "orden" : "órdenes"}
                            </p>

                            <div className="flex items-center gap-1.5 flex-wrap justify-center">
                              {/* Anterior */}
                              <button
                                type="button"
                                disabled={paginaSegura === 1}
                                onClick={() => cambiarPaginaTarea(grupo.id, paginaSegura - 1)}
                                className="w-8 h-8 rounded-lg border border-slate-200 bg-white text-slate-500 flex items-center justify-center transition-all hover:bg-slate-50 hover:border-slate-300 disabled:opacity-30 disabled:cursor-not-allowed shadow-2xs cursor-pointer"
                                aria-label="Página anterior"
                              >
                                <ChevronLeft className="w-3.5 h-3.5" />
                              </button>

                              {/* Números de página */}
                              {Array.from({ length: Math.max(1, totalPaginas) }, (_, i) => i + 1)
                                .filter((p) => {
                                  if (totalPaginas <= 5) return true;
                                  return p === 1 || p === totalPaginas || Math.abs(p - paginaSegura) <= 1;
                                })
                                .reduce<(number | "...")[]>((acc, p, idx, arr) => {
                                  if (
                                    idx > 0 &&
                                    typeof arr[idx - 1] === "number" &&
                                    (p as number) - (arr[idx - 1] as number) > 1
                                  ) {
                                    acc.push("...");
                                  }
                                  acc.push(p);
                                  return acc;
                                }, [])
                                .map((item, idx) =>
                                  item === "..." ? (
                                    <span
                                      key={`ellipsis-${idx}`}
                                      className="w-8 h-8 flex items-center justify-center text-xs text-slate-400"
                                    >
                                      ···
                                    </span>
                                  ) : (
                                    <button
                                      key={item}
                                      type="button"
                                      onClick={() => cambiarPaginaTarea(grupo.id, item as number)}
                                      className={`w-8 h-8 rounded-lg border text-xs font-bold transition-all shadow-2xs cursor-pointer ${
                                        item === paginaSegura
                                          ? "bg-[#175E38] border-[#175E38] text-white shadow-sm"
                                          : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300"
                                      }`}
                                      aria-label={`Ir a página ${item}`}
                                      aria-current={item === paginaSegura ? "page" : undefined}
                                    >
                                      {item}
                                    </button>
                                  )
                                )}

                              {/* Siguiente */}
                              <button
                                type="button"
                                disabled={paginaSegura === totalPaginas || totalPaginas <= 1}
                                onClick={() => cambiarPaginaTarea(grupo.id, paginaSegura + 1)}
                                className="w-8 h-8 rounded-lg border border-slate-200 bg-white text-slate-500 flex items-center justify-center transition-all hover:bg-slate-50 hover:border-slate-300 disabled:opacity-30 disabled:cursor-not-allowed shadow-2xs cursor-pointer"
                                aria-label="Página siguiente"
                              >
                                <ChevronRight className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </section>
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
        onClose={() => {
          setModalEmpleadoOpen(false);
          setPropiedadPreseleccionadaEmpleado(null);
        }}
        empleadoAEditar={empleadoAEditar}
        propiedadPreseleccionadaId={propiedadPreseleccionadaEmpleado}
        propiedades={data.propiedades}
        onSubmit={handleCrearOEditarEmpleado}
        isLoading={isPending}
      />

      {/* Modal de Asistencia Diaria */}
      <AsistenciaModal
        isOpen={modalAsistenciaOpen}
        onClose={() => {
          setModalAsistenciaOpen(false);
          setRegistroParaAsistencia(null);
        }}
        empleado={empleadoParaAsistencia}
        registroEditar={registroParaAsistencia}
        onSubmit={handleRegistrarAsistencia}
        isLoading={isPending}
      />

      {/* Modal de Asignación de Tarea */}
      <TareaFormModal
        isOpen={modalTareaOpen}
        onClose={() => {
          setModalTareaOpen(false);
          setEmpleadoPreseleccionadoTarea(null);
          setPropiedadPreseleccionadaTarea(null);
        }}
        empleados={data.empleados}
        propiedades={data.propiedades}
        empleadoPreseleccionado={empleadoPreseleccionadoTarea}
        propiedadPreseleccionadaId={propiedadPreseleccionadaTarea}
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

      {/* Modal de Ficha Integral del Trabajador */}
      <EmpleadoDetalleModal
        isOpen={modalDetalleEmpleadoOpen}
        onClose={() => {
          setModalDetalleEmpleadoOpen(false);
          setScrollToSeccionDetalle(null);
        }}
        empleado={empleadoSeleccionadoDetalle}
        scrollToSeccion={scrollToSeccionDetalle}
        tareasEmpleado={
          empleadoSeleccionadoDetalle
            ? data.tareas.filter((t) => t.empleadoId === empleadoSeleccionadoDetalle.id)
            : []
        }
        onAsignarTarea={(emp) => {
          setEmpleadoPreseleccionadoTarea(emp);
          setModalTareaOpen(true);
        }}
        onRegistrarAsistencia={(emp) => {
          setEmpleadoParaAsistencia(emp);
          setRegistroParaAsistencia(null);
          setModalAsistenciaOpen(true);
        }}
        onEditarAsistencia={(emp, reg) => {
          setEmpleadoParaAsistencia(emp);
          setRegistroParaAsistencia(reg);
          setModalAsistenciaOpen(true);
        }}
        onSeleccionarTarea={(tarea) => {
          setTareaSeleccionada(tarea);
          setModalDetalleTareaOpen(true);
        }}
        onVerFoto={handleVerFoto}
      />

      {/* Visor de Fotos / Comprobantes (ImageViewerModal) */}
      <ImageViewerModal
        isOpen={imageViewerOpen}
        onClose={() => setImageViewerOpen(false)}
        images={imageViewerUrls}
        initialIndex={imageViewerIndex}
        title="Evidencia Fotográfica de la Labor"
        subtitle="Fotografía tomada en campo por el trabajador de mantenimiento"
      />

      {/* Modal de Confirmación Reutilizable: Marcar Salida */}
      <ConfirmActionModal
        isOpen={Boolean(asistenciaParaSalida)}
        onClose={() => setAsistenciaParaSalida(null)}
        onConfirm={() => {
          if (!asistenciaParaSalida) return;
          const id = asistenciaParaSalida.id;
          setAsistenciaParaSalida(null);
          handleMarcarSalidaRapida(id);
        }}
        title="Registrar Salida de Jornada"
        subtitle="Confirmación de marcaje operativo"
        variant="warning"
        icon={LogOut}
        description="¿Confirmas el registro de salida para este colaborador? Se guardará la hora actual como la finalización formal de su jornada laboral de hoy."
        itemDetails={
          asistenciaParaSalida
            ? [
                { label: "Colaborador", value: asistenciaParaSalida.empleadoNombre },
                { label: "Cargo", value: CARGO_CONFIG[asistenciaParaSalida.empleadoCargo].label },
                {
                  label: "Hora de Entrada",
                  value: new Date(asistenciaParaSalida.horaEntrada).toLocaleTimeString("es-VE", {
                    hour: "2-digit",
                    minute: "2-digit",
                  }),
                },
              ]
            : []
        }
        confirmButtonText="Marcar Salida"
        cancelButtonText="Cancelar"
        isLoading={isPending}
      />

      {/* Modal de Confirmación Reutilizable: Desactivar Trabajador */}
      <ConfirmActionModal
        isOpen={Boolean(empleadoParaDesactivar)}
        onClose={() => setEmpleadoParaDesactivar(null)}
        onConfirm={() => {
          if (!empleadoParaDesactivar) return;
          const emp = empleadoParaDesactivar;
          setEmpleadoParaDesactivar(null);
          ejecutarToggleEstado(emp, false);
        }}
        title="Desactivar Trabajador"
        subtitle="Suspensión de cuenta y acceso operativo"
        variant="danger"
        icon={Power}
        description="¿Confirmas la desactivación de este colaborador? Se suspenderá temporalmente su acceso al portal del empleado y no se le podrán asignar nuevas órdenes de trabajo."
        itemDetails={
          empleadoParaDesactivar
            ? [
                {
                  label: "Colaborador",
                  value: `${empleadoParaDesactivar.nombre} ${empleadoParaDesactivar.apellido || ""}`.trim(),
                },
                {
                  label: "Cédula",
                  value: empleadoParaDesactivar.cedula,
                },
                {
                  label: "Cargo",
                  value: CARGO_CONFIG[empleadoParaDesactivar.cargo].label,
                },
              ]
            : []
        }
        confirmButtonText="Desactivar"
        cancelButtonText="Cancelar"
        isLoading={isPending}
      />
    </div>
  );
}
