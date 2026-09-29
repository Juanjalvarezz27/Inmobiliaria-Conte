import { ModulePlaceholder } from "@/components/layout/module-placeholder";

export default async function CobranzaPage() {
  return (
    <ModulePlaceholder
      title="Control de Cobranzas y Mensualidades"
      role="ADMIN"
      iconType="money"
      description="El corazón del negocio: aquí podrás revisar en tiempo real quién ya pagó su alquiler, quién debe y registrar pagos."
      features={[
        "Ver el resumen en dinero: total cobrado este mes, dinero por cobrar y montos vencidos.",
        "Listado claro de inquilinos indicando quién está al día y quién tiene pagos atrasados.",
        "Botón rápido para 'Registrar Pago' en cuanto el inquilino presente su comprobante.",
        "El sistema marcará automáticamente como vencido cualquier pago cuya fecha límite haya pasado.",
        "Reconocer a los buenos pagadores que mantienen un récord impecable sin retrasos.",
      ]}
    />
  );
}
