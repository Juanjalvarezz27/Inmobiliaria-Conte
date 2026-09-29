import { ModulePlaceholder } from "@/components/layout/module-placeholder";

export default async function InquilinoContratoPage() {
  return (
    <ModulePlaceholder
      title="Mi Contrato de Arrendamiento"
      role="INQUILINO"
      iconType="contract"
      description="Aquí podrás consultar en cualquier momento los términos y condiciones de tu contrato de alquiler."
      features={[
        "Ver los datos de tu local o inmueble: número, metraje y centro comercial.",
        "Consultar el monto fijado de tu canon de arrendamiento y depósito en garantía.",
        "Revisar las fechas de inicio y vencimiento de tu contrato vigente.",
        "Descargar una copia digital de tu contrato legal firmado en formato PDF.",
      ]}
    />
  );
}
