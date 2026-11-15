import { sendEmail } from "@/lib/email";

export interface NotificacionTicketActualizadoEmpleadoParams {
  empleadoNombre: string;
  empleadoEmail: string;
  ticketCodigo: string;
  ticketTitulo: string;
  propiedadNombre: string;
  tipoActualizacion: "CANCELADO" | "REASIGNADO";
  motivo?: string | null;
  nuevoTecnicoNombre?: string | null;
}

// Envia notificacion al empleado cuando un ticket asignado a el se cancela o se reasigna
export async function enviarNotificacionTicketCanceladoReasignado(
  params: NotificacionTicketActualizadoEmpleadoParams
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const {
      empleadoNombre,
      empleadoEmail,
      ticketCodigo,
      ticketTitulo,
      propiedadNombre,
      tipoActualizacion,
      motivo,
      nuevoTecnicoNombre,
    } = params;

    if (!empleadoEmail || !empleadoEmail.includes("@")) {
      return { success: false, error: "El empleado no tiene un correo electronico valido." };
    }

    const esCancelacion = tipoActualizacion === "CANCELADO";
    const subject = esCancelacion
      ? `🚫 [Ticket Cancelado] #${ticketCodigo} - ${ticketTitulo}`
      : `🔄 [Ticket Reasignado] #${ticketCodigo} - ${ticketTitulo}`;

    const html = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>${subject}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f1f5f9; margin: 0; padding: 24px;">
  <div style="max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden;">
    <div style="background-color: #1C2539; padding: 20px 24px; border-bottom: 3px solid ${esCancelacion ? "#CC1A22" : "#3b82f6"};">
      <h2 style="color: #ffffff; margin: 0; font-size: 18px; font-weight: 800;">Inmobiliaria Conte • Equipo Operativo</h2>
      <p style="color: #94a3b8; margin: 4px 0 0 0; font-size: 12px; font-weight: 600;">
        ${esCancelacion ? "Cancelacion de orden de trabajo" : "Reasignacion de orden tecnica"}
      </p>
    </div>
    
    <div style="padding: 24px;">
      <p style="font-size: 14px; color: #334155; margin-top: 0; line-height: 1.5;">
        Hola <strong>${empleadoNombre}</strong>,
      </p>
      <p style="font-size: 13px; color: #475569; line-height: 1.5;">
        Te notificamos que la orden de mantenimiento <strong>#${ticketCodigo}</strong> en <strong>${propiedadNombre}</strong> ya no requiere tu intervencion debido a que fue ${esCancelacion ? "cancelada por administracion" : "reasignada a otro colaborador"}.
      </p>

      <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; margin: 20px 0;">
        <span style="font-size: 14px; font-weight: 800; color: #0f172a; display: block; margin-bottom: 4px;">
          ${ticketTitulo}
        </span>
        <span style="font-size: 12px; color: #64748b;">
          Inmueble: <strong>${propiedadNombre}</strong>
        </span>
        ${
          motivo
            ? `<div style="font-size: 12px; color: #b91c1c; font-weight: 600; margin-top: 10px; border-top: 1px dashed #cbd5e1; padding-top: 8px;">
                <strong>Motivo indicado:</strong> ${motivo}
              </div>`
            : ""
        }
        ${
          nuevoTecnicoNombre
            ? `<div style="font-size: 12px; color: #1e40af; font-weight: 600; margin-top: 10px; border-top: 1px dashed #cbd5e1; padding-top: 8px;">
                <strong>Reasignado a:</strong> ${nuevoTecnicoNombre}
              </div>`
            : ""
        }
      </div>

      <p style="font-size: 12px; color: #64748b; line-height: 1.5;">
        Este ticket ha sido retirado de tu panel de <strong>Mis Tareas</strong> y mantenimiento en curso para mantener tu carga de trabajo actualizada.
      </p>

      <p style="font-size: 11px; color: #94a3b8; margin: 0; text-align: center; border-top: 1px solid #e2e8f0; padding-top: 16px;">
        Inmobiliaria Conte • Coordinacion Operativa de Mantenimiento
      </p>
    </div>
  </div>
</body>
</html>
    `;

    const info = await sendEmail({
      to: empleadoEmail,
      subject,
      html,
    });

    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error("Error al enviar notificacion de ticket cancelado/reasignado:", error);
    return { success: false, error: "Fallo al enviar correo al empleado." };
  }
}
