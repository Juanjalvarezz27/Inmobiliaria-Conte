import { ModulePlaceholder } from "@/components/layout/module-placeholder";

export default async function PersonalPage() {
  return (
    <ModulePlaceholder
      title="Equipo de Trabajo y Asistencia"
      role="ADMIN"
      iconType="users"
      description="Aquí podrás coordinar al personal de campo, asignarles sus tareas del día y llevar el control de su asistencia."
      features={[
        "Registrar a los empleados de mantenimiento y personal operativo.",
        "Asignar tareas específicas con nivel de urgencia y fecha límite de entrega.",
        "Revisar el registro de asistencia con las horas exactas de entrada y salida de cada jornada.",
        "Monitorear la productividad y las tareas completadas por cada miembro del equipo.",
      ]}
    />
  );
}
