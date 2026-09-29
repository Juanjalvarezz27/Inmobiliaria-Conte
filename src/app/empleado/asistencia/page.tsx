import { ModulePlaceholder } from "@/components/layout/module-placeholder";

export default async function EmpleadoAsistenciaPage() {
  return (
    <ModulePlaceholder
      title="Marcaje de Asistencia Diaria"
      role="EMPLEADO"
      iconType="calendar"
      description="Aquí podrás marcar tu hora de llegada y salida de forma rápida desde tu teléfono al iniciar y terminar tu jornada."
      features={[
        "Botón de un solo clic para registrar tu 'Hora de Entrada' al empezar la jornada.",
        "Botón para registrar tu 'Hora de Salida' al culminar tus labores del día.",
        "Ver la hora exacta registrada y el resumen de tu jornada actual.",
        "Consultar tu historial de asistencia de días anteriores.",
      ]}
    />
  );
}
