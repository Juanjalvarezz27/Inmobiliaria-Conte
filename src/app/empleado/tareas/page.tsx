import { ModulePlaceholder } from "@/components/layout/module-placeholder";

export default async function EmpleadoTareasPage() {
  return (
    <ModulePlaceholder
      title="Mis Tareas Asignadas"
      role="EMPLEADO"
      iconType="doc"
      description="Aquí podrás ver tus pendientes del día organizados por prioridad y marcar los trabajos que ya hayas finalizado."
      features={[
        "Ver tu lista de tareas diarias clasificadas por urgencia (Urgente, Normal o Baja).",
        "Conocer los detalles de cada tarea: qué debes hacer, en qué local y cuál es la fecha límite.",
        "Marcar como 'Completada' cualquier tarea con un solo toque desde tu teléfono o computadora.",
        "Consultar tu historial de actividades realizadas durante la semana.",
      ]}
    />
  );
}
