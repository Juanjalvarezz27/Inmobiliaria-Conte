import { ModulePlaceholder } from "@/components/layout/module-placeholder";

export default async function FacturacionPage() {
  return (
    <ModulePlaceholder
      title="Recibos y Facturación Digital"
      role="ADMIN"
      iconType="doc"
      description="Aquí podrás generar comprobantes oficiales de pago y enviárselos directamente por correo a los arrendatarios."
      features={[
        "Generación automática de recibos oficiales con el logo y formato de Inmobiliaria Conté.",
        "Envío automático del recibo por correo electrónico al inquilino apenas se confirme su pago.",
        "Descarga de comprobantes en PDF listos para imprimir o compartir por WhatsApp.",
        "Historial completo de todos los recibos emitidos a lo largo del año.",
      ]}
    />
  );
}
