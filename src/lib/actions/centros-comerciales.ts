"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

// ─── Tipos ───────────────────────────────────────────────────────────────────

export type CentroComercialInput = {
  nombre: string;
  direccion: string;
  ciudad: string;
  descripcion?: string;
  imagenUrl?: string;
};

// ─── Centros Comerciales ─────────────────────────────────────────────────────

export async function getCentrosComerciales() {
  return prisma.centroComercial.findMany({
    orderBy: { nombre: "asc" },
    include: {
      _count: { select: { locales: true } },
    },
  });
}

export async function getCentroComercialById(id: string) {
  return prisma.centroComercial.findUnique({
    where: { id },
    include: { locales: true },
  });
}

export async function createCentroComercial(data: CentroComercialInput) {
  const centro = await prisma.centroComercial.create({ data });
  revalidatePath("/admin/propiedades");
  return centro;
}

export async function updateCentroComercial(id: string, data: Partial<CentroComercialInput>) {
  const centro = await prisma.centroComercial.update({ where: { id }, data });
  revalidatePath("/admin/propiedades");
  return centro;
}

export async function deleteCentroComercial(id: string) {
  // Primero verificar que no tenga locales activos
  const count = await prisma.local.count({ where: { centroComercialId: id } });
  if (count > 0) {
    throw new Error(`No se puede eliminar: tiene ${count} local(es) registrado(s).`);
  }
  await prisma.centroComercial.delete({ where: { id } });
  revalidatePath("/admin/propiedades");
}

export async function toggleActivoCentroComercial(id: string, activo: boolean) {
  await prisma.centroComercial.update({ where: { id }, data: { activo } });
  revalidatePath("/admin/propiedades");
}
