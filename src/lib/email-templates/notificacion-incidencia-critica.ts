import { sendEmail } from "@/lib/email";

export interface NotificacionIncidenciaCriticaParams {
  propiedadNombre: string;
  guardiaNombre: string;
  categoriaLabel: string;
  titulo: string;
  descripcion: string;
  hora: string;
  fotosCount: number;
}

// Envia alerta urgente al administrador ante incidencias criticas de seguridad o fallas
export async function enviarNotificacionIncidenciaCriticaAdmin(
  params: NotificacionIncidenciaCriticaParams
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL || process.env.EMAIL_USER;
    if (!adminEmail || !adminEmail.includes("@")) {
      return { success: false, error: "No hay correo de administracion configurado." };
    }

    const {
      propiedadNombre,
      guardiaNombre,
      categoriaLabel,
      titulo,
      descripcion,
      hora,
      fotosCount,
    } = params;

    const subject = `🚨 [Alerta de Seguridad] ${titulo} - ${propiedadNombre}`;

    const html = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>${subject}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f1f5f9; margin: 0; padding: 24px;">
  <div style="max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden;">
    <div style="background-color: #1C2539; padding: 20px 24px; border-bottom: 3px solid #CC1A22;">
      <h2 style="color: #ffffff; margin: 0; font-size: 18px; font-weight: 800;">Inmobiliaria Conte • Seguridad Fisica</h2>
      <p style="color: #fca5a5; margin: 4px 0 0 0; font-size: 12px; font-weight: 700;">ALERTA DE SEGURIDAD O FALLA CRITICA EN INMUEBLE</p>
    </div>
    
    <div style="padding: 24px;">
      <div style="background-color: #fef2f2; border: 1px solid #fecaca; border-radius: 12px; padding: 16px; margin-bottom: 20px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
          <span style="font-size: 12px; font-weight: 800; color: #991b1b; text-transform: uppercase;">
            ${categoriaLabel}
          </span>
          <span style="font-size: 11px; font-weight: 800; padding: 3px 8px; border-radius: 6px; background-color: #fee2e2; color: #991b1b;">
            HORA: ${hora}
          </span>
        </div>
        <h3 style="margin: 0 0 8px 0; font-size: 16px; color: #0f172a; font-weight: 800;">${titulo}</h3>
        <p style="margin: 0; font-size: 13px; color: #334155; line-height: 1.5;">${descripcion}</p>
      </div>

      <table style="width: 100%; border-collapse: collapse; font-size: 12px; margin-bottom: 20px;">
        <tr>
          <td style="padding: 8px 0; color: #64748b; font-weight: 600; width: 40%;">Inmueble / Centro:</td>
          <td style="padding: 8px 0; color: #0f172a; font-weight: 700;">${propiedadNombre}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #64748b; font-weight: 600;">Guardia actuante:</td>
          <td style="padding: 8px 0; color: #0f172a; font-weight: 700;">${guardiaNombre}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #64748b; font-weight: 600;">Evidencias fotograficas:</td>
          <td style="padding: 8px 0; color: #0f172a; font-weight: 700;">${fotosCount} ${fotosCount === 1 ? "foto adjunta" : "fotos adjuntas"}</td>
        </tr>
      </table>

      <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 14px; margin-bottom: 20px;">
        <p style="margin: 0; font-size: 12px; color: #64748b; line-height: 1.5;">
          Esta novedad fue asentada en el libro digital de minutas de guardia. Ingrese a la <strong>Bitacora de Seguridad</strong> para consultar la trazabilidad y fotos en alta resolucion.
        </p>
      </div>

      <p style="font-size: 11px; color: #94a3b8; margin: 0; text-align: center; border-top: 1px solid #e2e8f0; padding-top: 16px;">
        Despacho prioritario automatico • Centro de Control de Seguridad Inmobiliaria Conte
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
    console.error("Error al enviar alerta de incidencia critica:", error);
    return { success: false, error: "Fallo al enviar correo de incidencia critica al admin." };
  }
}
