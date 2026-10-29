"use client";

import React from "react";
import { LogOut, Power } from "lucide-react";
import { CargoEmpleado, EstadoTarea } from "@prisma/client";
import { EmpleadoFormModal } from "./EmpleadoFormModal";
import { AsistenciaModal } from "./AsistenciaModal";
import { TareaFormModal } from "./TareaFormModal";
import { TareaDetalleModal } from "./TareaDetalleModal";
import { EmpleadoDetalleModal } from "./EmpleadoDetalleModal";
import { ImageViewerModal } from "@/components/ui/image-viewer-modal";
import { ConfirmActionModal } from "@/components/ui/confirm-action-modal";
import {
  CARGO_CONFIG,
  type EmpleadoItem,
  type TareaEmpleadoItem,
  type RegistroAsistenciaItem,
  type PropiedadOpcion,
} from "./types";
import {
  type CreateEmpleadoInput,
  type RegistrarAsistenciaInput,
  type CreateTareaInput,
} from "@/lib/actions/personal";

export interface PersonalModalsContainerProps {
  // Empleado Form Modal
  modalEmpleadoOpen: boolean;
  onCloseModalEmpleado: () => void;
  empleadoAEditar: EmpleadoItem | null;
  propiedadPreseleccionadaEmpleado: string | null;
  propiedades: PropiedadOpcion[];
  onSubmitEmpleado: (data: CreateEmpleadoInput) => Promise<boolean>;

  // Asistencia Modal
  modalAsistenciaOpen: boolean;
  onCloseModalAsistencia: () => void;
  empleadoParaAsistencia: EmpleadoItem | null;
  registroParaAsistencia: RegistroAsistenciaItem | null;
  onSubmitAsistencia: (data: RegistrarAsistenciaInput) => Promise<boolean>;

  // Tarea Form Modal
  modalTareaOpen: boolean;
  onCloseModalTarea: () => void;
  empleados: EmpleadoItem[];
  empleadoPreseleccionadoTarea: EmpleadoItem | null;
  propiedadPreseleccionadaTarea: string | null;
  onSubmitTarea: (data: CreateTareaInput) => Promise<boolean>;

  // Tarea Detalle Modal
  modalDetalleTareaOpen: boolean;
  onCloseModalDetalleTarea: () => void;
  tareaSeleccionada: TareaEmpleadoItem | null;
  onActualizarEstadoTarea: (
    tareaId: string,
    nuevoEstado: EstadoTarea,
    notasResolucion?: string | null,
    nuevasEvidencias?: string[]
  ) => Promise<boolean>;
  onEliminarTarea: (tareaId: string) => Promise<boolean>;
  onVerFoto: (url: string) => void;

  // Empleado Detalle Modal
  modalDetalleEmpleadoOpen: boolean;
  onCloseModalDetalleEmpleado: () => void;
  empleadoSeleccionadoDetalle: EmpleadoItem | null;
  scrollToSeccionDetalle: "TAREAS" | null;
  tareasEmpleado: TareaEmpleadoItem[];
  onAsignarTareaDesdeDetalle: (emp: EmpleadoItem) => void;
  onRegistrarAsistenciaDesdeDetalle: (emp: EmpleadoItem) => void;
  onEditarAsistenciaDesdeDetalle: (emp: EmpleadoItem, reg: RegistroAsistenciaItem) => void;
  onSeleccionarTareaDesdeDetalle: (tarea: TareaEmpleadoItem) => void;

  // Visor de Fotos
  imageViewerOpen: boolean;
  onCloseImageViewer: () => void;
  imageViewerUrls: string[];
  imageViewerIndex: number;

  // Confirm Salida
  asistenciaParaSalida: {
    id: string;
    empleadoNombre: string;
    empleadoCargo: CargoEmpleado;
    horaEntrada: string;
  } | null;
  onCloseConfirmSalida: () => void;
  onConfirmSalida: () => void;

  // Confirm Desactivar
  empleadoParaDesactivar: EmpleadoItem | null;
  onCloseConfirmDesactivar: () => void;
  onConfirmDesactivar: () => void;

  isLoading: boolean;
}

export function PersonalModalsContainer({
  modalEmpleadoOpen,
  onCloseModalEmpleado,
  empleadoAEditar,
  propiedadPreseleccionadaEmpleado,
  propiedades,
  onSubmitEmpleado,

  modalAsistenciaOpen,
  onCloseModalAsistencia,
  empleadoParaAsistencia,
  registroParaAsistencia,
  onSubmitAsistencia,

  modalTareaOpen,
  onCloseModalTarea,
  empleados,
  empleadoPreseleccionadoTarea,
  propiedadPreseleccionadaTarea,
  onSubmitTarea,

  modalDetalleTareaOpen,
  onCloseModalDetalleTarea,
  tareaSeleccionada,
  onActualizarEstadoTarea,
  onEliminarTarea,
  onVerFoto,

  modalDetalleEmpleadoOpen,
  onCloseModalDetalleEmpleado,
  empleadoSeleccionadoDetalle,
  scrollToSeccionDetalle,
  tareasEmpleado,
  onAsignarTareaDesdeDetalle,
  onRegistrarAsistenciaDesdeDetalle,
  onEditarAsistenciaDesdeDetalle,
  onSeleccionarTareaDesdeDetalle,

  imageViewerOpen,
  onCloseImageViewer,
  imageViewerUrls,
  imageViewerIndex,

  asistenciaParaSalida,
  onCloseConfirmSalida,
  onConfirmSalida,

  empleadoParaDesactivar,
  onCloseConfirmDesactivar,
  onConfirmDesactivar,

  isLoading,
}: PersonalModalsContainerProps) {
  return (
    <>
      {/* 1. Modal Formulario de Empleado */}
      <EmpleadoFormModal
        isOpen={modalEmpleadoOpen}
        onClose={onCloseModalEmpleado}
        empleadoAEditar={empleadoAEditar}
        propiedadPreseleccionadaId={propiedadPreseleccionadaEmpleado}
        propiedades={propiedades}
        onSubmit={onSubmitEmpleado}
        isLoading={isLoading}
      />

      {/* 2. Modal de Registro de Asistencia */}
      <AsistenciaModal
        isOpen={modalAsistenciaOpen}
        onClose={onCloseModalAsistencia}
        empleado={empleadoParaAsistencia}
        registroEditar={registroParaAsistencia}
        onSubmit={onSubmitAsistencia}
        isLoading={isLoading}
      />

      {/* 3. Modal de Creación de Tarea */}
      <TareaFormModal
        isOpen={modalTareaOpen}
        onClose={onCloseModalTarea}
        empleados={empleados}
        propiedades={propiedades}
        empleadoPreseleccionado={empleadoPreseleccionadoTarea}
        propiedadPreseleccionadaId={propiedadPreseleccionadaTarea}
        onSubmit={onSubmitTarea}
        isLoading={isLoading}
      />

      {/* 4. Modal de Detalle de Tarea */}
      <TareaDetalleModal
        isOpen={modalDetalleTareaOpen}
        onClose={onCloseModalDetalleTarea}
        tarea={tareaSeleccionada}
        onActualizarEstado={onActualizarEstadoTarea}
        onEliminarTarea={onEliminarTarea}
        onVerFoto={onVerFoto}
        isLoading={isLoading}
      />

      {/* 5. Modal de Ficha Técnica del Empleado */}
      <EmpleadoDetalleModal
        isOpen={modalDetalleEmpleadoOpen}
        onClose={onCloseModalDetalleEmpleado}
        empleado={empleadoSeleccionadoDetalle}
        scrollToSeccion={scrollToSeccionDetalle}
        tareasEmpleado={tareasEmpleado}
        onAsignarTarea={onAsignarTareaDesdeDetalle}
        onRegistrarAsistencia={onRegistrarAsistenciaDesdeDetalle}
        onEditarAsistencia={onEditarAsistenciaDesdeDetalle}
        onSeleccionarTarea={onSeleccionarTareaDesdeDetalle}
        onVerFoto={onVerFoto}
      />

      {/* 6. Visor de Fotos / Comprobantes */}
      <ImageViewerModal
        isOpen={imageViewerOpen}
        onClose={onCloseImageViewer}
        images={imageViewerUrls}
        initialIndex={imageViewerIndex}
        title="Evidencia Fotográfica de la Labor"
        subtitle="Fotografía tomada en campo por el trabajador de mantenimiento"
      />

      {/* 7. Modal de Confirmación: Marcar Salida */}
      <ConfirmActionModal
        isOpen={Boolean(asistenciaParaSalida)}
        onClose={onCloseConfirmSalida}
        onConfirm={onConfirmSalida}
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
        isLoading={isLoading}
      />

      {/* 8. Modal de Confirmación: Desactivar Trabajador */}
      <ConfirmActionModal
        isOpen={Boolean(empleadoParaDesactivar)}
        onClose={onCloseConfirmDesactivar}
        onConfirm={onConfirmDesactivar}
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
        isLoading={isLoading}
      />
    </>
  );
}
