import { ModulePlaceholder } from "@/components/layout/module-placeholder";

export default async function InquilinoPagosPage() {
  return (
    <ModulePlaceholder
      title="Mis Pagos y Recibos Digitales"
      role="INQUILINO"
      iconType="money"
      description="Aquí podrás consultar el estado de tu cuenta de alquiler y descargar tus comprobantes oficiales de pago."
      features={[
        "Revisar si tu mensualidad actual está al día o si tienes algún saldo pendiente por cancelar.",
        "Ver la fecha límite de pago para evitar recargos o retrasos.",
        "Consultar el historial completo de todas las mensualidades que has pagado.",
        "Descargar tus recibos oficiales en formato PDF listos para imprimir o guardar.",
      ]}
    />
  );
}
