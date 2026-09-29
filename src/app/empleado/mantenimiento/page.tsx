import { ModulePlaceholder } from "@/components/layout/module-placeholder";

export default async function EmpleadoMantenimientoPage() {
  return (
    <ModulePlaceholder
      title="Averías y Reparaciones Asignadas"
      role="EMPLEADO"
      iconType="wrench"
      description="Aquí podrás ver los reportes técnicos que la administración te ha asignado para inspeccionar y solucionar."
      features={[
        "Ver los reportes de averías con fotos y descripción detallada del problema.",
        "Saber exactamente en qué inmueble o local se encuentra la falla técnica.",
        "Completar el reporte de solución: describir el arreglo realizado y los gastos requeridos.",
        "Avisar automáticamente a la administración en cuanto el problema quede resuelto.",
      ]}
    />
  );
}
