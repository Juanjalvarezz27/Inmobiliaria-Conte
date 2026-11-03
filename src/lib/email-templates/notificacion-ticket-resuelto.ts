import { sendEmail } from "@/lib/email";

export interface NotificacionTicketResueltoParams {
  inquilinoNombre: string;
  inquilinoEmail: string;
  ticketCodigo: string;
  ticketTitulo: string;
  propiedadNombre: string;
  unidadCodigo?: string | null;
  tecnicoNombre?: string | null;
  notasCierre?: string | null;
  fotosFiniquitoCount: number;
}

export async function enviarNotificacionTicketResuelto(
  params: NotificacionTicketResueltoParams
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const {
      inquilinoNombre,
      inquilinoEmail,
      ticketCodigo,
      ticketTitulo,
      propiedadNombre,
      unidadCodigo,
      tecnicoNombre,
      notasCierre,
      fotosFiniquitoCount,
    } = params;

    if (!inquilinoEmail || !inquilinoEmail.includes("@")) {
      return { success: false, error: "El inquilino no tiene correo configurado." };
    }

    const subject = `✅ [Resuelto] Ticket de avería solventado: ${ticketCodigo} - ${propiedadNombre}`;

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
      <h2 style="color: #ffffff; margin: 0; font-size: 18px; font-weight: 800;">Inmobiliaria Conté • Reparación Finalizada</h2>
      <p style="color: #a7f3d0; margin: 4px 0 0 0; font-size: 12px;">Estimado(a) ${inquilinoNombre}, tu solicitud técnica ha sido solventada</p>
    </div>
    
    <div style="padding: 24px;">
      <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 16px; margin-bottom: 20px;">
        <span style="font-size: 14px; font-weight: 800; color: #175E38;">${ticketCodigo} • RESUELTO</span>
        <h3 style="margin: 8px 0 4px 0; font-size: 16px; color: #0f172a; font-weight: 800;">${ticketTitulo}</h3>
        <p style="margin: 0; font-size: 13px; color: #166534; line-height: 1.5;">${notasCierre || "Trabajo de reparación e inspección completado satisfactoriamente."}</p>
      </div>

      <table style="width: 100%; border-collapse: collapse; font-size: 12px; margin-bottom: 20px;">
        <tr>
          <td style="padding: 8px 0; color: #64748b; font-weight: 600; width: 40%;">Espacio atendido:</td>
          <td style="padding: 8px 0; color: #0f172a; font-weight: 700;">${propiedadNombre} ${unidadCodigo ? `• ${unidadCodigo}` : ""}</td>
        </tr>
        ${
          tecnicoNombre
            ? `
        <tr>
          <td style="padding: 8px 0; color: #64748b; font-weight: 600;">Técnico a cargo:</td>
          <td style="padding: 8px 0; color: #0f172a; font-weight: 700;">${tecnicoNombre}</td>
        </tr>
        `
            : ""
        }
        <tr>
          <td style="padding: 8px 0; color: #64748b; font-weight: 600;">Evidencias de cierre:</td>
          <td style="padding: 8px 0; color: #0f172a; font-weight: 700;">${fotosFiniquitoCount} fotografía(s) de finiquito cargadas</td>
        </tr>
      </table>

      <div style="text-align: center; padding-top: 12px; border-top: 1px solid #f1f5f9;">
        <p style="font-size: 11px; color: #94a3b8; margin: 0;">Puedes ingresar a tu portal en /inquilino/mantenimiento para revisar el historial y las fotos del trabajo realizado.</p>
      </div>
    </div>
  </div>
</body>
</html>
    `;

    const res = await sendEmail({
      to: inquilinoEmail,
      subject,
      html,
    });

    return { success: true, messageId: (res as any)?.messageId };
  } catch (err) {
    console.error("Error al enviar notificación de ticket resuelto:", err);
    return { success: false, error: "No se pudo despachar el correo." };
  }
}
