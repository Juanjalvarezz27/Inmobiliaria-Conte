"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  EstadoPago,
  EstadoTicket,
  UrgenciaTicket,
  EstadoTarea,
  CategoriaNovedad,
} from "@prisma/client";

export interface AlertasAdminDetalle {
  comprobantesPorConciliar: number;
  morososCobranza: number;
  ticketsSinAsignar: number;
  ticketsUrgentes: number;
  tareasAtrasadas: number;
  seguridadCritica: number;
  totalAlertas: number;
}

export interface NavbarBadges {
  cobranza?: number;
  mantenimiento?: number;
  tareas?: number;
  seguridad?: number;
  pagos?: number;
  alertasAdmin?: AlertasAdminDetalle;
}

// Obtiene los conteos de pendientes operativos para el navbar segun el rol de la sesion
export async function getNavbarBadgesAction(): Promise<NavbarBadges> {
  try {
    const session = await auth();
    if (!session?.user?.id || !session.user.rol) {
      return {};
    }

    const { id, rol } = session.user;

    // Conteos rapidos indexados para el Administrador
    if (rol === "ADMIN") {
      const hace24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const ahora = new Date();

      const [
        comprobantesPorConciliar,
        morososCobranza,
        ticketsSinAsignar,
        ticketsUrgentes,
        tareasAtrasadas,
        seguridadCritica,
      ] = await Promise.all([
        // 1. Cobranza: Comprobantes reportados con capture por conciliar
        prisma.pago.count({
          where: {
            estado: { not: EstadoPago.PAGADO },
            comprobanteUrl: { not: null },
          },
        }),
        // 2. Cobranza: Cuotas vencidas en mora del mes o historicas
        prisma.pago.count({
          where: {
            estado: EstadoPago.VENCIDO,
          },
        }),
        // 3. Mantenimiento: Tickets recien reportados sin asignar
        prisma.ticketMantenimiento.count({
          where: {
            estado: EstadoTicket.PENDIENTE,
          },
        }),
        // 4. Mantenimiento: Tickets urgentes o de alta prioridad en proceso
        prisma.ticketMantenimiento.count({
          where: {
            urgencia: { in: [UrgenciaTicket.URGENTE, UrgenciaTicket.ALTA] },
            estado: EstadoTicket.EN_PROCESO,
          },
        }),
        // 5. Personal: Tareas asignadas que han sobrepasado su fecha limite
        prisma.tareaEmpleado.count({
          where: {
            estado: { in: [EstadoTarea.PENDIENTE, EstadoTarea.EN_PROCESO] },
            fechaLimite: { lt: ahora },
          },
        }),
        // 6. Seguridad: Minutas con incidencias graves o fallas en ultimas 24h
        prisma.novedadMinuta.count({
          where: {
            categoria: {
              in: [
                CategoriaNovedad.INCIDENCIA_SEGURIDAD,
                CategoriaNovedad.FALLA_INFRAESTRUCTURA,
              ],
            },
            hora: { gte: hace24h },
          },
        }),
      ]);

      const totalCobranza = comprobantesPorConciliar + morososCobranza;
      const totalMantenimiento = ticketsSinAsignar + ticketsUrgentes;
      const totalAlertas =
        comprobantesPorConciliar +
        morososCobranza +
        ticketsSinAsignar +
        ticketsUrgentes +
        tareasAtrasadas +
        seguridadCritica;

      return {
        cobranza: totalCobranza,
        mantenimiento: totalMantenimiento,
        tareas: tareasAtrasadas,
        seguridad: seguridadCritica,
        alertasAdmin: {
          comprobantesPorConciliar,
          morososCobranza,
          ticketsSinAsignar,
          ticketsUrgentes,
          tareasAtrasadas,
          seguridadCritica,
          totalAlertas,
        },
      };
    }

    // Conteos rapidos para el Empleado operativo
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

    // Conteos rapidos para el Inquilino
    if (rol === "INQUILINO") {
      const pagosPendientes = await prisma.pago.count({
        where: {
          contrato: {
            inquilino: { usuarioId: id },
            estado: { in: ["ACTIVO", "POR_VENCER"] },
          },
          estado: { in: [EstadoPago.PENDIENTE, EstadoPago.VENCIDO, EstadoPago.PARCIAL] },
        },
      });

      return {
        pagos: pagosPendientes,
      };
    }

    return {};
  } catch (error) {
    console.error("Error al consultar badges del navbar:", error);
    return {};
  }
}
