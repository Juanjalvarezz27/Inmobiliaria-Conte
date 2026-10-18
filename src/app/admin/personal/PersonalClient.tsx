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
  ChevronDown,
  ShieldCheck,
  Building2,
  ArrowRight,
  LogOut,
  MapPin,
  Wrench,
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

  const [modalTareaOpen, setModalTareaOpen] = useState(false);
  const [empleadoPreseleccionadoTarea, setEmpleadoPreseleccionadoTarea] = useState<EmpleadoItem | null>(null);
  const [propiedadPreseleccionadaTarea, setPropiedadPreseleccionadaTarea] = useState<string | null>(null);

  const [modalDetalleTareaOpen, setModalDetalleTareaOpen] = useState(false);
  const [tareaSeleccionada, setTareaSeleccionada] = useState<TareaEmpleadoItem | null>(null);

  const [modalDetalleEmpleadoOpen, setModalDetalleEmpleadoOpen] = useState(false);
  const [empleadoSeleccionadoDetalle, setEmpleadoSeleccionadoDetalle] = useState<EmpleadoItem | null>(null);

  // Estados de acordeones desplegables para las 3 pestañas
  const [acordeonesDirectorio, setAcordeonesDirectorio] = useState<Record<string, boolean>>({});
  const [acordeonesAsistencia, setAcordeonesAsistencia] = useState<Record<string, boolean>>({});
  const [acordeonesTareas, setAcordeonesTareas] = useState<Record<string, boolean>>({});

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
              toast.success("Colaborador actualizado exitosamente.");
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
              toast.error(res.error || "No se pudo actualizar el colaborador.");
              resolve(false);
            }
          } else {
            const res = await crearEmpleadoAction(input);
            if (res.success && res.data) {
              toast.success("Colaborador registrado exitosamente.");
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
      {/* PageHeader con Título y Botones de Acción */}
      <PageHeader
        title="Equipo de Trabajo y Asistencia"
        icon={<Users className="w-6 h-6 text-white" />}
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
          {/* Filtro Inmueble transversal a todas las pestañas */}
          <FilterDropdown
            value={filtroPropiedad}
            onChange={setFiltroPropiedad}
            options={opcionesPropiedadesFiltro}
            placeholder="Inmueble"
            icon={Building2}
            className="w-full sm:w-60"
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

      {/* PESTAÑA 1: DIRECTORIO DE PERSONAL (Acordeones Desplegables por Inmueble) */}
      {activeTab === "directorio" && (
        <div>
          {gruposDirectorio.length === 0 ? (
            <EmptyState
              title="No se encontraron colaboradores"
              description="No hay personal que coincida con los filtros seleccionados o la nómina aún está vacía."
              icon="users"
              action={{
                label: "Registrar Colaborador",
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
                const conAccesoCount = grupo.empleados.filter((e) => Boolean(e.usuarioId)).length;

                return (
                  <section
                    key={grupo.id}
                    className={`group/acordeon relative overflow-hidden bg-gradient-to-b from-white via-white to-slate-50/60 rounded-2xl sm:rounded-3xl border border-slate-200/90 border-b-[3px] border-b-slate-300/90 shadow-[0_4px_20px_-2px_rgba(28,37,57,0.07),0_2px_6px_-1px_rgba(28,37,57,0.04)] hover:shadow-[0_12px_28px_-4px_rgba(28,37,57,0.11),0_4px_8px_-2px_rgba(28,37,57,0.05)] transition-all duration-300 ${
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
                      title={estaDesplegada ? "Clic para contraer colaboradores" : "Clic para desplegar colaboradores"}
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

                          {/* Conteo de Colaboradores y Estados */}
                          <div className="flex items-center gap-1.5 mt-2 flex-wrap text-xs">
                            <span className="px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-700 font-bold border border-slate-200/70 text-[11px]">
                              {grupo.empleados.length} {grupo.empleados.length === 1 ? "colaborador" : "colaboradores"}
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
                            {conAccesoCount > 0 && (
                              <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 font-bold text-[11px] border border-blue-200/70">
                                {conAccesoCount} con portal web
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Acciones: Desplegar a la izquierda y Registrar Colaborador a la derecha */}
                      <div className="w-full sm:w-auto flex items-center justify-between sm:justify-end gap-3 pt-2.5 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                        <div className="flex items-center gap-2 cursor-pointer text-slate-700 hover:text-black transition-colors">
                          <div
                            className={`w-8 h-8 rounded-xl flex items-center justify-center border border-slate-200/90 bg-white/95 text-slate-700 hover:text-black hover:bg-slate-100 transition-all duration-300 shadow-2xs ${
                              estaDesplegada ? "rotate-180 bg-slate-100 text-black border-slate-300" : ""
                            }`}
                          >
                            <ChevronDown className="w-4 h-4 stroke-[2.5]" />
                          </div>
                          <span className="text-xs font-bold text-slate-600 select-none">
                            {estaDesplegada ? "Cerrar" : "Ver colaboradores"}
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
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#175E38] text-white text-xs font-bold hover:bg-[#124b2d] transition-all shadow-xs cursor-pointer active:translate-y-0.5 whitespace-nowrap"
                        >
                          <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                          <span>Registrar Colaborador</span>
                        </button>
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
                      <div className="overflow-hidden border-t border-slate-100">
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
              description="No hay colaboradores activos en el inmueble seleccionado o según los criterios de búsqueda."
              icon="clock"
            />
          ) : (
            <div className="space-y-4 sm:space-y-5">
              {gruposAsistencia.map((grupo) => {
                const cornerSun = getCornerSunConfig(grupo.propiedad.tipo);
                const badgeConfig = getPropiedadBadge(grupo.propiedad.tipo);
                const estaDesplegada = estaDesplegadaAsistencia(grupo.id);

                const registradosHoy = grupo.empleados.filter((e) => Boolean(e.asistenciaHoy)).length;
                const presentesHoy = grupo.empleados.filter((e) => e.asistenciaHoy?.estado === EstadoAsistencia.PRESENTE).length;
                const retardosHoy = grupo.empleados.filter((e) => e.asistenciaHoy?.estado === EstadoAsistencia.RETARDO).length;
                const sinMarcar = grupo.empleados.length - registradosHoy;

                return (
                  <section
                    key={grupo.id}
                    className={`group/acordeon relative overflow-hidden bg-gradient-to-b from-white via-white to-slate-50/60 rounded-2xl sm:rounded-3xl border border-slate-200/90 border-b-[3px] border-b-slate-300/90 shadow-[0_4px_20px_-2px_rgba(28,37,57,0.07),0_2px_6px_-1px_rgba(28,37,57,0.04)] hover:shadow-[0_12px_28px_-4px_rgba(28,37,57,0.11),0_4px_8px_-2px_rgba(28,37,57,0.05)] transition-all duration-300 ${
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
                              {grupo.empleados.length} colaboradores
                            </span>
                            {presentesHoy > 0 && (
                              <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 font-bold text-[11px] border border-emerald-200/70">
                                {presentesHoy} puntual{presentesHoy > 1 ? "es" : ""}
                              </span>
                            )}
                            {retardosHoy > 0 && (
                              <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 font-bold text-[11px] border border-amber-200/70">
                                {retardosHoy} con retardo
                              </span>
                            )}
                            {sinMarcar > 0 && (
                              <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-500 font-bold text-[11px] border border-slate-200/70">
                                {sinMarcar} sin marcar
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="w-full sm:w-auto flex items-center justify-between sm:justify-end gap-3 pt-2.5 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                        <div className="flex items-center gap-2 cursor-pointer text-slate-700 hover:text-black transition-colors">
                          <div
                            className={`w-8 h-8 rounded-xl flex items-center justify-center border border-slate-200/90 bg-white/95 text-slate-700 hover:text-black hover:bg-slate-100 transition-all duration-300 shadow-2xs ${
                              estaDesplegada ? "rotate-180 bg-slate-100 text-black border-slate-300" : ""
                            }`}
                          >
                            <ChevronDown className="w-4 h-4 stroke-[2.5]" />
                          </div>
                          <span className="text-xs font-bold text-slate-600 select-none">
                            {estaDesplegada ? "Cerrar" : "Ver asistencia"}
                          </span>
                        </div>

                        <span className="text-xs font-bold text-slate-700 bg-white border border-slate-200/90 px-3 py-1.5 rounded-xl shadow-2xs">
                          {registradosHoy} de {grupo.empleados.length} hoy
                        </span>
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
                      <div className="overflow-hidden border-t border-slate-100 bg-white">
                        <div className="divide-y divide-slate-100">
                          {grupo.empleados.map((emp) => {
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
                                      className="h-9 px-3 rounded-xl text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs active:translate-y-0.5"
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

                return (
                  <section
                    key={grupo.id}
                    className={`group/acordeon relative overflow-hidden bg-gradient-to-b from-white via-white to-slate-50/60 rounded-2xl sm:rounded-3xl border border-slate-200/90 border-b-[3px] border-b-slate-300/90 shadow-[0_4px_20px_-2px_rgba(28,37,57,0.07),0_2px_6px_-1px_rgba(28,37,57,0.04)] hover:shadow-[0_12px_28px_-4px_rgba(28,37,57,0.11),0_4px_8px_-2px_rgba(28,37,57,0.05)] transition-all duration-300 ${
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

                      <div className="w-full sm:w-auto flex items-center justify-between sm:justify-end gap-3 pt-2.5 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                        <div className="flex items-center gap-2 cursor-pointer text-slate-700 hover:text-black transition-colors">
                          <div
                            className={`w-8 h-8 rounded-xl flex items-center justify-center border border-slate-200/90 bg-white/95 text-slate-700 hover:text-black hover:bg-slate-100 transition-all duration-300 shadow-2xs ${
                              estaDesplegada ? "rotate-180 bg-slate-100 text-black border-slate-300" : ""
                            }`}
                          >
                            <ChevronDown className="w-4 h-4 stroke-[2.5]" />
                          </div>
                          <span className="text-xs font-bold text-slate-600 select-none">
                            {estaDesplegada ? "Cerrar" : "Ver órdenes"}
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
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#175E38] text-white text-xs font-bold hover:bg-[#124b2d] transition-all shadow-xs cursor-pointer active:translate-y-0.5 whitespace-nowrap"
                        >
                          <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                          <span>Asignar Tarea</span>
                        </button>
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
                      <div className="overflow-hidden border-t border-slate-100 p-4 sm:p-5">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {grupo.tareas.map((t) => {
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

                                  <h4 className="font-heading font-black text-slate-900 text-sm sm:text-base line-clamp-2 group-hover/tcard:text-[#175E38] transition-colors">
                                    {t.titulo}
                                  </h4>

                                  {t.descripcion && (
                                    <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                                      {t.descripcion}
                                    </p>
                                  )}
                                </div>

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
        onClose={() => setModalAsistenciaOpen(false)}
        empleado={empleadoParaAsistencia}
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
