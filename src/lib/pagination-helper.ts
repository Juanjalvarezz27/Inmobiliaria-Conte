import { PaginationParams, PaginatedResult } from "@/types/pagination";

// Parámetros resueltos listos para pasar directamente a consultas de Prisma (skip/take)
export interface ResolvedPagination {
  page: number;
  pageSize: number;
  skip: number;
  take: number;
}

// Resuelve y sanitiza los parámetros de paginación para evitar desbordes o números negativos
export function resolvePagination(
  params?: PaginationParams,
  defaultPageSize = 15,
  maxPageSize = 100
): ResolvedPagination {
  const page = Math.max(1, Math.floor(Number(params?.page) || 1));
  const rawSize = Math.floor(Number(params?.pageSize) || defaultPageSize);
  const pageSize = Math.min(maxPageSize, Math.max(1, rawSize));
  const skip = (page - 1) * pageSize;
  const take = pageSize;

  return { page, pageSize, skip, take };
}

// Empaqueta el conjunto de datos y el conteo total en una respuesta paginada consistente
export function createPaginatedResponse<T>(
  items: T[],
  total: number,
  page: number,
  pageSize: number
): PaginatedResult<T> {
  const safeTotal = Math.max(0, total);
  const totalPages = Math.max(1, Math.ceil(safeTotal / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);

  return {
    items,
    total: safeTotal,
    page: safePage,
    pageSize,
    totalPages,
    meta: {
      total: safeTotal,
      page: safePage,
      pageSize,
      totalPages,
      hasNextPage: safePage < totalPages,
      hasPrevPage: safePage > 1,
    },
  };
}

