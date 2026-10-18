import { Metadata } from "next";
import { getPersonalData } from "@/lib/actions/personal";
import { PersonalClient } from "./PersonalClient";

export const metadata: Metadata = {
  title: "Equipo de Trabajo y Asistencia | Inmobiliaria Conté",
  description:
    "Gestión integral de trabajadores, control de asistencia diaria y seguimiento de órdenes de trabajo operativas.",
};

export default async function PersonalPage() {
  const data = await getPersonalData();

  return <PersonalClient initialData={data} />;
}
