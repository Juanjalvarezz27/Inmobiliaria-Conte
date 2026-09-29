import { ModulePlaceholder } from "@/components/layout/module-placeholder";

export default async function DocumentosPage() {
  return (
    <ModulePlaceholder
      title="Bóveda Digital de Documentos"
      role="ADMIN"
      iconType="doc"
      description="Tu archivador seguro en la nube: guarda y encuentra todos los documentos importantes sin papeles perdidos."
      features={[
        "Guardar contratos firmados, copias de cédulas, RIF y fotos de locales.",
        "Filtrar y buscar documentos por propiedad o por inquilino en un segundo.",
        "Descargar cualquier archivo en formato PDF o imagen desde cualquier dispositivo.",
        "Seguridad garantizada para que ningún archivo histórico se borre por error.",
      ]}
    />
  );
}
