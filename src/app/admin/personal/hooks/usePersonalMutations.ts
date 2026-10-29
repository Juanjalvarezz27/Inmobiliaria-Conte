import React from "react";
import { toast } from "sonner";
import { CargoEmpleado, EstadoAsistencia, EstadoTarea } from "@prisma/client";
import {
  type PersonalDashboardData,
  type EmpleadoItem,
  type TareaEmpleadoItem,
  type RegistroAsistenciaItem,
} from "../types";
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

interface UsePersonalMutationsProps {
  data: PersonalDashboardData;
  setData: React.Dispatch<React.SetStateAction<PersonalDashboardData>>;
  startTransition: React.TransitionStartFunction;
  empleadoAEditar: EmpleadoItem | null;
  setEmpleadoParaDesactivar: (emp: EmpleadoItem | null) => void;
  setRegistroParaAsistencia: (reg: RegistroAsistenciaItem | null) => void;
  setEmpleadoSeleccionadoDetalle: React.Dispatch<React.SetStateAction<EmpleadoItem | null>>;
}

// Hook desacoplado para todas las mutaciones del módulo de Personal
export function usePersonalMutations({
  data,
  setData,
  startTransition,
  empleadoAEditar,
  setEmpleadoParaDesactivar,
  setRegistroParaAsistencia,
  setEmpleadoSeleccionadoDetalle,
}: UsePersonalMutationsProps) {
  // Guardar o actualizar trabajador
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

  // Alternar estado activo / inactivo de un empleado
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

  // Registro de asistencia diaria
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

  // Marcaje de salida rápida
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

  // Creación de nueva tarea operativa
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

  // Actualización de estado y resolución de tareas
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

  // Eliminación de tarea
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

  return {
    handleCrearOEditarEmpleado,
    ejecutarToggleEstado,
    handleToggleEstadoEmpleado,
    handleRegistrarAsistencia,
    handleMarcarSalidaRapida,
    handleCrearTarea,
    handleActualizarEstadoTarea,
    handleEliminarTarea,
  };
}

