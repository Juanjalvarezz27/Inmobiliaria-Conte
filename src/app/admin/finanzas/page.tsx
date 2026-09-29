import { ModulePlaceholder } from "@/components/layout/module-placeholder";

export default async function FinanzasPage() {
  return (
    <ModulePlaceholder
      title="Finanzas y Cierres Mensuales"
      role="ADMIN"
      iconType="money"
      description="Aquí podrás llevar las cuentas claras de la inmobiliaria: ingresos por alquileres, gastos operativos y balances reales."
      features={[
        "Registrar todos los ingresos y gastos diarios de la empresa con sus respectivos recibos.",
        "Clasificar los gastos por categorías: reparaciones, servicios, nómina y suministros.",
        "Realizar el 'Cierre de Mes' con un solo clic para calcular el balance neto de ganancias.",
        "Ver resúmenes visuales para saber exactamente cuánto dinero entra y sale de la empresa.",
      ]}
    />
  );
}
