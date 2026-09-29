import { ModulePlaceholder } from "@/components/layout/module-placeholder";

export default async function InquilinoMantenimientoPage() {
  return (
    <ModulePlaceholder
      title="Reportar Problema o Avería"
      role="INQUILINO"
      iconType="wrench"
      description="¿Tienes alguna falla eléctrica, filtración o daño en tu local? Repórtalo aquí para que nuestro equipo lo resuelva."
      features={[
        "Enviar un reporte rápido explicando qué problema técnico tienes en tu inmueble.",
        "Adjuntar fotografías de la avería para que el técnico acuda con los repuestos correctos.",
        "Monitorear en tiempo real si tu solicitud ya fue vista, asignada a un técnico o resuelta.",
        "Consultar el historial de reparaciones solicitadas anteriormente.",
      ]}
    />
  );
}
