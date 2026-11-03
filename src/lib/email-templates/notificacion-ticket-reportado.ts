import { sendEmail } from "@/lib/email";

export interface NotificacionTicketReportadoParams {
  ticketCodigo: string;
  ticketTitulo: string;
  categoriaLabel: string;
  urgencia: string;
  propiedadNombre: string;
  unidadCodigo?: string | null;
  solicitanteNombre: string;
  solicitanteTelefono?: string | null;
  solicitanteEmail?: string | null;
  descripcion: string;
  fotosCount: number;
}

export async function enviarNotificacionTicketReportadoAdmin(
  params: NotificacionTicketReportadoParams
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL || process.env.EMAIL_USER;
    if (!adminEmail || !adminEmail.includes("@")) {
      return { success: false, error: "No hay correo de administración configurado." };
    }

    const {
      ticketCodigo,
      ticketTitulo,
      categoriaLabel,
      urgencia,
      propiedadNombre,
      unidadCodigo,
      solicitanteNombre,
      solicitanteTelefono,
      descripcion,
      fotosCount,
    } = params;

    const subject = `⚠️ [${urgencia}] Nueva avería reportada: ${ticketCodigo} - ${propiedadNombre}`;

    const html = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>${subject}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f1f5f9; margin: 0; padding: 24px;">
  <div style="max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden;">
    <div style="background-color: #1C2539; padding: 20px 24px; border-bottom: 3px solid #175E38;">
      <h2 style="color: #ffffff; margin: 0; font-size: 18px; font-weight: 800;">Inmobiliaria Conté • Reporte de Avería</h2>
      <p style="color: #94a3b8; margin: 4px 0 0 0; font-size: 12px;">Nuevo ticket técnico ingresado para asignación y control</p>
    </div>
    
    <div style="padding: 24px;">
      <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; margin-bottom: 20px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
          <span style="font-size: 14px; font-weight: 800; color: #175E38;">${ticketCodigo}</span>
          <span style="font-size: 11px; font-weight: 800; padding: 3px 8px; border-radius: 6px; background-color: ${urgencia === "URGENTE" ? "#fee2e2" : "#fef3c7"}; color: ${urgencia === "URGENTE" ? "#991b1b" : "#92400e"};">
            URGENCIA: ${urgencia}
          </span>
        </div>
        <h3 style="margin: 0 0 8px 0; font-size: 16px; color: #0f172a; font-weight: 800;">${ticketTitulo}</h3>
        <p style="margin: 0; font-size: 13px; color: #475569; line-height: 1.5;">${descripcion}</p>
      </div>

      <table style="width: 100%; border-collapse: collapse; font-size: 12px; margin-bottom: 20px;">
        <tr>
          <td style="padding: 8px 0; color: #64748b; font-weight: 600; width: 40%;">Inmueble / Centro:</td>
          <td style="padding: 8px 0; color: #0f172a; font-weight: 700;">${propiedadNombre} ${unidadCodigo ? `• ${unidadCodigo}` : ""}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #64748b; font-weight: 600;">Categoría técnica:</td>
          <td style="padding: 8px 0; color: #0f172a; font-weight: 700;">${categoriaLabel}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #64748b; font-weight: 600;">Solicitante:</td>
          <td style="padding: 8px 0; color: #0f172a; font-weight: 700;">${solicitanteNombre} ${solicitanteTelefono ? `(${solicitanteTelefono})` : ""}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #64748b; font-weight: 600;">Fotos adjuntas:</td>
          <td style="padding: 8px 0; color: #0f172a; font-weight: 700;">${fotosCount} fotografía(s) de evidencia</td>
        </tr>
      </table>

      <div style="text-align: center; padding-top: 12px; border-top: 1px solid #f1f5f9;">
        <p style="font-size: 11px; color: #94a3b8; margin: 0;">Ingresa al panel administrativo en /admin/mantenimiento para revisar la evidencia y asignar al técnico correspondiente.</p>
      </div>
    </div>
  </div>
</body>
</html>
    `;

    const res = await sendEmail({
      to: adminEmail,
      subject,
      html,
    });

    return { success: true, messageId: (res as any)?.messageId };
  } catch (err) {
    console.error("Error al enviar notificación de ticket a admin:", err);
    return { success: false, error: "No se pudo despachar el correo." };
  }
}
