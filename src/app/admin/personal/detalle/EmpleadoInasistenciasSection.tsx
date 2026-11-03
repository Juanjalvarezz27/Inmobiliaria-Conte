"use client";

import React from "react";
import { EmpleadoAsistenciasSection } from "./EmpleadoAsistenciasSection";
import type { EmpleadoItem, RegistroAsistenciaItem } from "../types";

interface EmpleadoInasistenciasSectionProps {
  emp: EmpleadoItem;
  listaInasistencias: RegistroAsistenciaItem[];
  cargandoHistorial: boolean;
  onRegistrarAsistencia: (emp: EmpleadoItem) => void;
  onEditarAsistencia?: (emp: EmpleadoItem, registro: RegistroAsistenciaItem) => void;
}

// Wrapper de compatibilidad que redirige al componente unificado de asistencias
export function EmpleadoInasistenciasSection({
  emp,
  listaInasistencias,
  cargandoHistorial,
  onRegistrarAsistencia,
  onEditarAsistencia,
}: EmpleadoInasistenciasSectionProps) {
  return (
    <EmpleadoAsistenciasSection
      emp={emp}
      historialCompleto={listaInasistencias}
      cargandoHistorial={cargandoHistorial}
      onRegistrarAsistencia={onRegistrarAsistencia}
      onEditarAsistencia={onEditarAsistencia}
    />
  );
}
