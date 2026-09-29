import { ModulePlaceholder } from "@/components/layout/module-placeholder";

export default async function ContratosPage() {
  return (
    <ModulePlaceholder
      title="Contratos de Alquiler"
      role="ADMIN"
      iconType="contract"
      description="Aquí podrás crear y supervisar todos los contratos de arrendamiento firmados con los inquilinos."
      features={[
        "Crear un nuevo contrato asignando un local a un inquilino con su canon mensual y depósito.",
        "Generar automáticamente el cobro del primer mes apenas se firme el contrato.",
        "Registrar ajustes y aumentos periódicos de la renta con su fecha de aplicación.",
        "Subir y descargar el documento legal firmado en PDF para tenerlo siempre a mano.",
        "Recibir alertas automáticas cuando un contrato esté próximo a vencer.",
      ]}
    />
  );
}
