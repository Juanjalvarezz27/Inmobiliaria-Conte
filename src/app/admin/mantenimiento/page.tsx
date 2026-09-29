import { ModulePlaceholder } from "@/components/layout/module-placeholder";

export default async function AdminMantenimientoPage() {
  return (
    <ModulePlaceholder
      title="Gestión de Averías y Reparaciones"
      role="ADMIN"
      iconType="wrench"
      description="Aquí podrás recibir, supervisar y dar solución a todas las fallas técnicas reportadas en los locales e inmuebles."
      features={[
        "Recibir las solicitudes de reparación enviadas por los inquilinos con fotos y descripción.",
        "Asignar cada arreglo al empleado o técnico correspondiente con un solo clic.",
        "Monitorear el estado de cada trabajo: pendiente, en progreso o completamente resuelto.",
        "Llevar el control de los costos de reparación y materiales utilizados.",
      ]}
    />
  );
}
