"use server";

import { prisma } from "@/lib/prisma";
import { EstadoLocal } from "@prisma/client";
import { revalidatePath } from "next/cache";

// ─── Tipos ───────────────────────────────────────────────────────────────────

export type LocalInput = {
  codigo: string;
  centroComercialId: string;
  piso?: string;
  areaMt2?: number;
  precioAlquiler?: number;
  descripcion?: string;
  estado?: EstadoLocal;
  imagenes?: string[];
};

// ─── Locales ─────────────────────────────────────────────────────────────────

export async function getLocales(centroComercialId?: string) {
  return prisma.local.findMany({
    where: centroComercialId ? { centroComercialId } : undefined,
    orderBy: [{ centroComercialId: "asc" }, { codigo: "asc" }],
    include: { centroComercial: { select: { nombre: true } } },
  });
}

export async function getLocalById(id: string) {
  return prisma.local.findUnique({
    where: { id },
    include: { centroComercial: true },
  });
}

export async function createLocal(data: LocalInput) {
  const local = await prisma.local.create({ data });
  revalidatePath("/admin/propiedades");
  return local;
}

export async function updateLocal(id: string, data: Partial<LocalInput>) {
  const local = await prisma.local.update({ where: { id }, data });
  revalidatePath("/admin/propiedades");
  return local;
}

export async function deleteLocal(id: string) {
  await prisma.local.delete({ where: { id } });
  revalidatePath("/admin/propiedades");
}

export async function cambiarEstadoLocal(id: string, estado: EstadoLocal) {
  await prisma.local.update({ where: { id }, data: { estado } });
  revalidatePath("/admin/propiedades");
}

// ─── Estadísticas ─────────────────────────────────────────────────────────────

export async function getEstadisticasLocales() {
  const [total, disponibles, ocupados, mantenimiento] = await Promise.all([
    prisma.local.count(),
    prisma.local.count({ where: { estado: "DISPONIBLE" } }),
    prisma.local.count({ where: { estado: "OCUPADO" } }),
    prisma.local.count({ where: { estado: "MANTENIMIENTO" } }),
  ]);
  return { total, disponibles, ocupados, mantenimiento };
}
