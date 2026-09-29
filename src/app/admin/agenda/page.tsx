import { ModulePlaceholder } from "@/components/layout/module-placeholder";

export default async function AgendaPage() {
  return (
    <ModulePlaceholder
      title="Agenda y Recordatorios"
      role="ADMIN"
      iconType="calendar"
      description="Aquí podrás organizar todas las fechas clave del negocio y recibir avisos automáticos para no olvidar ningún compromiso."
      features={[
        "Registrar citas con clientes, visitas a inmuebles y reuniones importantes.",
        "Recibir recordatorios por correo un día antes de cualquier evento programado.",
        "Alertas anticipadas de contratos que vencerán en los próximos 90 y 30 días.",
        "Vista limpia y ordenada de los próximos compromisos sin complicaciones.",
      ]}
    />
  );
}
