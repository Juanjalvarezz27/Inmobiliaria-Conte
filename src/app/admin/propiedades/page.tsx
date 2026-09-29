import { ModulePlaceholder } from "@/components/layout/module-placeholder";

export default async function PropiedadesPage() {
  return (
    <ModulePlaceholder
      title="Inmuebles y Locales Comerciales"
      role="ADMIN"
      iconType="building"
      description="Aquí podrás ver, agregar y administrar todos los centros comerciales, locales y propiedades de Inmobiliaria Conté."
      features={[
        "Ver el catálogo completo de centros comerciales y locales independientes.",
        "Registrar nuevas propiedades con sus fotos, medidas y características.",
        "Saber de un vistazo si un local está desocupado o actualmente alquilado.",
        "Consultar qué inquilino está ocupando cada inmueble y desde qué fecha.",
      ]}
    />
  );
}
