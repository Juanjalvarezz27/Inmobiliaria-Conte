import { sendEmail } from "@/lib/email";

export interface NotificacionTicketFiniquitadoAdminParams {
  ticketCodigo: string;
  ticketTitulo: string;
  propiedadNombre: string;
  unidadCodigo?: string | null;
  tecnicoNombre: string;
  tecnicoCargo?: string | null;
  notasCierre: string;
  fotosFiniquitoCount: number;
}

// Envia alerta al administrador cuando un empleado/tecnico finiquita una reparacion
export async function enviarNotificacionTicketFiniquitadoAdmin(
  params: NotificacionTicketFiniquitadoAdminParams
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL || process.env.EMAIL_USER;
    if (!adminEmail || !adminEmail.includes("@")) {
      return { success: false, error: "No hay correo de administracion configurado." };
    }

    const {
      ticketCodigo,
      ticketTitulo,
      propiedadNombre,
      unidadCodigo,
      tecnicoNombre,
      tecnicoCargo,
      notasCierre,
      fotosFiniquitoCount,
    } = params;

    const subject = `✅ [Mantenimiento Resuelto] Ticket #${ticketCodigo} finiquitado por ${tecnicoNombre}`;

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
      <h2 style="color: #ffffff; margin: 0; font-size: 18px; font-weight: 800;">Inmobiliaria Conte • Control Tecnico</h2>
      <p style="color: #a7f3d0; margin: 4px 0 0 0; font-size: 12px; font-weight: 600;">Reporte de averia finiquitada por el personal operativo</p>
    </div>
    
    <div style="padding: 24px;">
      <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 16px; margin-bottom: 20px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
          <span style="font-size: 14px; font-weight: 800; color: #166534;">#${ticketCodigo}</span>
          <span style="font-size: 11px; font-weight: 800; padding: 3px 8px; border-radius: 6px; background-color: #dcfce7; color: #15803d;">
            ESTADO: RESUELTO
          </span>
        </div>
        <h3 style="margin: 0 0 8px 0; font-size: 16px; color: #0f172a; font-weight: 800;">${ticketTitulo}</h3>
        <p style="margin: 0; font-size: 13px; color: #334155; line-height: 1.5;">
          <strong>Informe Tecnico del Cierre:</strong> ${notasCierre}
        </p>
      </div>

      <table style="width: 100%; border-collapse: collapse; font-size: 12px; margin-bottom: 20px;">
        <tr>
          <td style="padding: 8px 0; color: #64748b; font-weight: 600; width: 40%;">Inmueble / Unidad:</td>
          <td style="padding: 8px 0; color: #0f172a; font-weight: 700;">${propiedadNombre} ${unidadCodigo ? `• ${unidadCodigo}` : ""}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #64748b; font-weight: 600;">Tecnico responsable:</td>
          <td style="padding: 8px 0; color: #0f172a; font-weight: 700;">${tecnicoNombre} ${tecnicoCargo ? `(${tecnicoCargo})` : ""}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #64748b; font-weight: 600;">Evidencias de arreglo:</td>
          <td style="padding: 8px 0; color: #175E38; font-weight: 700;">${fotosFiniquitoCount} ${fotosFiniquitoCount === 1 ? "foto adjunta" : "fotos adjuntas"}</td>
        </tr>
      </table>

      <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 14px; margin-bottom: 20px;">
        <p style="margin: 0; font-size: 12px; color: #64748b; line-height: 1.5;">
          Puede auditar la ficha completa, notas e imagenes de finiquito ingresando al modulo de <strong>Mantenimiento</strong> en el panel de administracion.
        </p>
      </div>

      <p style="font-size: 11px; color: #94a3b8; margin: 0; text-align: center; border-top: 1px solid #e2e8f0; padding-top: 16px;">
        Notificacion interna de supervision para Administracion • Inmobiliaria Conte
      </p>
    </div>
  </div>
</body>
</html>
    `;

    const info = await sendEmail({
      to: adminEmail,
      subject,
      html,
    });

    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error("Error al enviar notificacion de ticket finiquitado al admin:", error);
    return { success: false, error: "Fallo al enviar correo de finiquito al admin." };
  }
}
