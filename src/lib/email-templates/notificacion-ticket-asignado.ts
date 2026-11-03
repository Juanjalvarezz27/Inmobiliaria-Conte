import { sendEmail } from "@/lib/email";

export interface NotificacionTicketAsignadoParams {
  empleadoNombre: string;
  empleadoEmail: string;
  ticketCodigo: string;
  ticketTitulo: string;
  propiedadNombre: string;
  unidadCodigo?: string | null;
  categoriaLabel: string;
  urgencia: string;
  descripcion: string;
  notasAdmin?: string | null;
}

export async function enviarNotificacionTicketAsignado(
  params: NotificacionTicketAsignadoParams
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const {
      empleadoNombre,
      empleadoEmail,
      ticketCodigo,
      ticketTitulo,
      propiedadNombre,
      unidadCodigo,
      categoriaLabel,
      urgencia,
      descripcion,
      notasAdmin,
    } = params;

    if (!empleadoEmail || !empleadoEmail.includes("@")) {
      return { success: false, error: "El técnico no tiene correo válido configurado." };
    }

    const subject = `🛠️ [Asignación] Ticket de avería: ${ticketCodigo} - ${propiedadNombre}`;

    const html = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>${subject}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f1f5f9; margin: 0; padding: 24px;">
  <div style="max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden;">
    <div style="background-color: #175E38; padding: 20px 24px; border-bottom: 3px solid #0e3a23;">
      <h2 style="color: #ffffff; margin: 0; font-size: 18px; font-weight: 800;">Inmobiliaria Conté • Asignación de Trabajo</h2>
      <p style="color: #a7f3d0; margin: 4px 0 0 0; font-size: 12px;">Hola ${empleadoNombre}, se te ha asignado una orden técnica</p>
    </div>
    
    <div style="padding: 24px;">
      <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; margin-bottom: 20px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
          <span style="font-size: 14px; font-weight: 800; color: #175E38;">${ticketCodigo}</span>
          <span style="font-size: 11px; font-weight: 800; padding: 3px 8px; border-radius: 6px; background-color: #fef3c7; color: #92400e;">
            URGENCIA: ${urgencia}
          </span>
        </div>
        <h3 style="margin: 0 0 8px 0; font-size: 16px; color: #0f172a; font-weight: 800;">${ticketTitulo}</h3>
        <p style="margin: 0; font-size: 13px; color: #475569; line-height: 1.5;">${descripcion}</p>
      </div>

      <table style="width: 100%; border-collapse: collapse; font-size: 12px; margin-bottom: 20px;">
        <tr>
          <td style="padding: 8px 0; color: #64748b; font-weight: 600; width: 40%;">Ubicación / Espacio:</td>
          <td style="padding: 8px 0; color: #0f172a; font-weight: 700;">${propiedadNombre} ${unidadCodigo ? `• ${unidadCodigo}` : ""}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #64748b; font-weight: 600;">Especialidad:</td>
          <td style="padding: 8px 0; color: #0f172a; font-weight: 700;">${categoriaLabel}</td>
        </tr>
        ${
          notasAdmin
            ? `
        <tr>
          <td style="padding: 8px 0; color: #64748b; font-weight: 600;">Instrucción del Admin:</td>
          <td style="padding: 8px 0; color: #1e3a8a; font-weight: 700;">${notasAdmin}</td>
        </tr>
        `
            : ""
        }
      </table>

      <div style="text-align: center; padding-top: 12px; border-top: 1px solid #f1f5f9;">
        <p style="font-size: 11px; color: #94a3b8; margin: 0;">Ingresa a tu portal móvil en /empleado/mantenimiento para iniciar el trabajo y subir las fotos del finiquito.</p>
      </div>
    </div>
  </div>
</body>
</html>
    `;

    const res = await sendEmail({
      to: empleadoEmail,
      subject,
      html,
    });

    return { success: true, messageId: (res as any)?.messageId };
  } catch (err) {
    console.error("Error al enviar notificación de asignación:", err);
    return { success: false, error: "No se pudo despachar el correo." };
  }
}
