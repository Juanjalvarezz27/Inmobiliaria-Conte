import { ModulePlaceholder } from "@/components/layout/module-placeholder";

export default async function InquilinosPage() {
  return (
    <ModulePlaceholder
      title="Directorio de Inquilinos"
      role="ADMIN"
      iconType="users"
      description="Aquí podrás gestionar la información de todos los clientes y arrendatarios que tienen contratos con la empresa."
      features={[
        "Registrar nuevos inquilinos con sus datos de contacto, cédula o RIF.",
        "Crearles su cuenta de acceso para que puedan ingresar a su propio portal.",
        "Ver de inmediato el estado de cuenta y los locales que tiene alquilados cada persona.",
        "Buscar rápidamente a un inquilino por su nombre, teléfono o documento de identidad.",
      ]}
    />
  );
}
