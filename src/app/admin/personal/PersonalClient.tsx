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
  LogOut,
  Power,
  Briefcase,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { FilterDropdown, type FilterDropdownOption } from "@/components/ui/filter-dropdown";
import { ImageViewerModal } from "@/components/ui/image-viewer-modal";
import { ConfirmActionModal } from "@/components/ui/confirm-action-modal";
import { CargoEmpleado, EstadoAsistencia, EstadoTarea } from "@prisma/client";
import { EmpleadoFormModal } from "./EmpleadoFormModal";
import { AsistenciaModal } from "./AsistenciaModal";
import { TareaFormModal } from "./TareaFormModal";
import { TareaDetalleModal } from "./TareaDetalleModal";
import { EmpleadoDetalleModal } from "./EmpleadoDetalleModal";
import {
  CARGO_CONFIG,
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
import {
  type GrupoDirectorio,
  type GrupoAsistencia,
  type GrupoTareas,
} from "./tabs/tab-helpers";
import { PersonalDirectorioTab } from "./tabs/PersonalDirectorioTab";
import { PersonalAsistenciaTab } from "./tabs/PersonalAsistenciaTab";
import { PersonalTareasTab } from "./tabs/PersonalTareasTab";

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

  // Paginación local por Inmueble
  const [paginasTareas, setPaginasTareas] = useState<Record<string, number>>({});
  const [paginasAsistencia, setPaginasAsistencia] = useState<Record<string, number>>({});
  const [empleadoParaDesactivar, setEmpleadoParaDesactivar] = useState<EmpleadoItem | null>(null);

  // Visor de fotos
  const [imageViewerOpen, setImageViewerOpen] = useState(false);
  const [imageViewerUrls, setImageViewerUrls] = useState<string[]>([]);
  const [imageViewerIndex, setImageViewerIndex] = useState(0);

  // Resetear páginas locales al cambiar filtros o búsqueda
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

  // Opciones para el selector de Estado de Tareas
  const opcionesEstadoTarea: FilterDropdownOption[] = useMemo(() => {
    const counts = data.tareas.reduce((acc, t) => {
      acc[t.estado] = (acc[t.estado] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return [
      { value: "TODAS", label: "Todas las Tareas", isGlobal: true, count: data.tareas.length },
      { value: "PENDIENTE", label: "Pendientes", count: (counts["PENDIENTE"] || 0) + (counts["EN_PROCESO"] || 0) },
      { value: "COMPLETADA", label: "Completadas", count: counts["COMPLETADA"] || 0 },
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
  const gruposDirectorio: GrupoDirectorio[] = useMemo(() => {
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
  const gruposAsistencia: GrupoAsistencia[] = useMemo(() => {
    const mapa = new Map<string, EmpleadoItem[]>();
    for (const emp of empleadosAsistenciaFiltrados) {
      const key = emp.propiedadId || "GENERAL";
      if (!mapa.has(key)) mapa.set(key, []);
      mapa.get(key)!.push(emp);
    }

    const resultado: GrupoAsistencia[] = [];

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
  const gruposTareas: GrupoTareas[] = useMemo(() => {
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
  }, [tareasFiltradas, data.propiedades, data.empleados]);

  // Abrir visor de fotos
  const handleVerFoto = (url: string) => {
    setImageViewerUrls([url]);
    setImageViewerIndex(0);
    setImageViewerOpen(true);
  };

  // Acciones de Empleado
  const handleCrearOEditarEmpleado = async (input: CreateEmpleadoInput): Promise<boolean> => {
    return new Promise((resolve) => {
      startTransition(async () => {
        try {
          if (empleadoAEditar) {
            const res = await actualizarEmpleadoAction(empleadoAEditar.id, input);
            if (res.success && res.data) {
              toast.success("Trabajador actualizado exitosamente.");
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

  const handleToggleEstadoEmpleado = (emp: EmpleadoItem) => {
    if (emp.activo) {
      setEmpleadoParaDesactivar(emp);
    } else {
      ejecutarToggleEstado(emp, true);
    }
  };

  // Acciones de Asistencia
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

  // Acciones de Tareas
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

      {/* Selector de Pestañas de Navegación Operativa */}
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

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:flex lg:items-center gap-2 w-full lg:w-auto">
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
              <FilterDropdown
                value={filtroCargo}
                onChange={setFiltroCargo}
                options={opcionesCargo}
                placeholder="Cargo"
                icon={Briefcase}
                className="w-full lg:w-56"
              />

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
              onChange={(val) => setFiltroEstadoTarea(val)}
              options={opcionesEstadoTarea}
              placeholder="Estado labor"
              icon={Layers}
              className="w-full lg:w-48"
            />
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
          onVerTareasEmpleado={handleVerTareasEmpleado}
          isPending={isPending}
        />
      )}

      {/* Pestaña 2: Control de Asistencia */}
      {activeTab === "asistencia" && (
        <PersonalAsistenciaTab
          gruposAsistencia={gruposAsistencia}
          estaDesplegada={estaDesplegadaAsistencia}
          onToggleAcordeon={toggleAcordeonAsistencia}
          paginasAsistencia={paginasAsistencia}
          onCambiarPagina={cambiarPaginaAsistencia}
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
          onVerFicha={(emp) => {
            setEmpleadoSeleccionadoDetalle(emp);
            setModalDetalleEmpleadoOpen(true);
          }}
          isPending={isPending}
        />
      )}

      {/* Pestaña 3: Órdenes de Trabajo */}
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

      {/* Modales del Módulo */}
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

      <TareaDetalleModal
        isOpen={modalDetalleTareaOpen}
        onClose={() => setModalDetalleTareaOpen(false)}
        tarea={tareaSeleccionada}
        onActualizarEstado={handleActualizarEstadoTarea}
        onEliminarTarea={handleEliminarTarea}
        onVerFoto={handleVerFoto}
        isLoading={isPending}
      />

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

      {/* Visor de Fotos / Comprobantes */}
      <ImageViewerModal
        isOpen={imageViewerOpen}
        onClose={() => setImageViewerOpen(false)}
        images={imageViewerUrls}
        initialIndex={imageViewerIndex}
        title="Evidencia Fotográfica de la Labor"
        subtitle="Fotografía tomada en campo por el trabajador de mantenimiento"
      />

      {/* Modal de Confirmación: Marcar Salida */}
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

      {/* Modal de Confirmación: Desactivar Trabajador */}
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
