"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { EstadoPago, EstadoTicket, EstadoTarea } from "@prisma/client";

export interface NavbarBadges {
  cobranza?: number;
  mantenimiento?: number;
  tareas?: number;
  pagos?: number;
}

// Obtiene los conteos de pendientes operativos para el navbar según el rol de la sesión
export async function getNavbarBadgesAction(): Promise<NavbarBadges> {
  try {
    const session = await auth();
    if (!session?.user?.id || !session.user.rol) {
      return {};
    }

    const { id, rol } = session.user;

    // Conteos rápidos indexados para el Administrador
    if (rol === "ADMIN") {
      const [comprobantesPorConciliar, ticketsSinAsignar] = await Promise.all([
        prisma.pago.count({
          where: {
            estado: { not: EstadoPago.PAGADO },
            comprobanteUrl: { not: null },
          },
        }),
        prisma.ticketMantenimiento.count({
          where: {
            estado: EstadoTicket.PENDIENTE,
          },
        }),
      ]);

      return {
        cobranza: comprobantesPorConciliar,
        mantenimiento: ticketsSinAsignar,
      };
    }

    // Conteos rápidos para el Empleado operativo
    if (rol === "EMPLEADO") {
      const [tareasActivas, ticketsEnCurso] = await Promise.all([
        prisma.tareaEmpleado.count({
          where: {
            empleado: { usuarioId: id },
            estado: { in: [EstadoTarea.PENDIENTE, EstadoTarea.EN_PROCESO] },
          },
        }),
        prisma.ticketMantenimiento.count({
          where: {
            empleado: { usuarioId: id },
            estado: EstadoTicket.EN_PROCESO,
          },
        }),
      ]);

      return {
        tareas: tareasActivas,
        mantenimiento: ticketsEnCurso,
      };
    }

    // Conteos rápidos para el Inquilino
    if (rol === "INQUILINO") {
      const pagosPendientes = await prisma.pago.count({
        where: {
          contrato: {
            inquilino: { usuarioId: id },
            estado: "ACTIVO",
          },
          estado: { in: [EstadoPago.PENDIENTE, EstadoPago.VENCIDO] },
        },
      });

      return {
        pagos: pagosPendientes,
      };
    }

    return {};
  } catch (error) {
    // Falla silenciosa con retorno seguro para no bloquear la carga del Navbar
    console.error("Error al consultar badges del navbar:", error);
    return {};
  }
}
