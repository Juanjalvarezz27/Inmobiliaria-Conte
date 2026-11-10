import { sendEmail } from "@/lib/email";

export interface NotificacionAccesoInquilinoParams {
  inquilinoNombre: string;
  inquilinoEmail: string;
  cedula: string;
  passwordInicial: string;
}

export async function enviarNotificacionAccesoInquilino(
  params: NotificacionAccesoInquilinoParams
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const { inquilinoNombre, inquilinoEmail, cedula, passwordInicial } = params;

    if (!inquilinoEmail || !inquilinoEmail.includes("@")) {
      return { success: false, error: "El inquilino no tiene un correo electronico valido." };
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.AUTH_URL || "http://localhost:3000";
    const loginUrl = `${appUrl.replace(/\/$/, "")}/home/login`;

    const subject = "Acceso Habilitado al Portal Digital - Inmobiliaria Conte C.A.";

    const html = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>${subject}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f1f5f9; margin: 0; padding: 24px; color: #1e293b;">
  <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
    
    <!-- Encabezado Institucional -->
    <div style="background-color: #175E38; padding: 24px; border-bottom: 3px solid #0e3a23;">
      <h1 style="color: #ffffff; margin: 0; font-size: 20px; font-weight: 800; letter-spacing: -0.5px;">Inmobiliaria Conte C.A.</h1>
      <p style="color: #a7f3d0; margin: 4px 0 0 0; font-size: 13px;">Portal Digital de Gestion Inmobiliaria</p>
    </div>

    <!-- Contenido Principal -->
    <div style="padding: 28px 24px;">
      <h2 style="font-size: 16px; color: #0f172a; margin-top: 0; margin-bottom: 12px; font-weight: 700;">
        Estimado(a) ${inquilinoNombre},
      </h2>
      <p style="font-size: 14px; line-height: 1.6; color: #334155; margin-bottom: 20px;">
        Le informamos que ha sido habilitado su acceso al Portal Digital de Inmobiliaria Conte C.A. A traves de esta plataforma podra consultar sus contratos vigentes, revisar el estado de sus mensualidades, reportar pagos y canalizar solicitudes de mantenimiento de sus espacios arrendados.
      </p>

      <!-- Ficha de Credenciales (Sin botones) -->
      <div style="background-color: #f8fafc; border: 1px solid #cbd5e1; border-radius: 12px; padding: 18px 20px; margin-bottom: 22px;">
        <h3 style="margin: 0 0 14px 0; font-size: 13px; font-weight: 800; color: #175E38; text-transform: uppercase; letter-spacing: 0.5px;">
          Sus Credenciales de Ingreso
        </h3>
        <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
          <tr>
            <td style="padding: 6px 0; color: #64748b; font-weight: 600; width: 38%;">Enlace de ingreso:</td>
            <td style="padding: 6px 0; color: #0f172a;">
              <a href="${loginUrl}" style="color: #175E38; text-decoration: underline; font-weight: 600; word-break: break-all;">
                ${loginUrl}
              </a>
            </td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #64748b; font-weight: 600;">Usuario (Correo):</td>
            <td style="padding: 6px 0; color: #0f172a; font-weight: 700; font-family: monospace;">
              ${inquilinoEmail}
            </td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #64748b; font-weight: 600;">Contrasena inicial:</td>
            <td style="padding: 6px 0; color: #0f172a; font-weight: 700; font-family: monospace;">
              ${passwordInicial}
            </td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #64748b; font-weight: 600;">Cedula / RIF:</td>
            <td style="padding: 6px 0; color: #0f172a; font-weight: 600;">
              ${cedula}
            </td>
          </tr>
        </table>
      </div>

      <!-- Nota Aclaratoria -->
      <div style="background-color: #f1f5f9; border-left: 3px solid #175E38; padding: 12px 14px; border-radius: 4px; margin-bottom: 20px;">
        <p style="margin: 0; font-size: 12px; line-height: 1.5; color: #475569;">
          <strong>Nota de seguridad:</strong> Su contrasena inicial corresponde a su numero de Cedula de Identidad o RIF. Si lo desea, podra personalizarla en cualquier momento dentro del portal desde la seccion Mi Perfil.
        </p>
      </div>

      <p style="font-size: 13px; line-height: 1.5; color: #64748b; margin-bottom: 0;">
        Para ingresar, copie y pegue el enlace anterior en su navegador o haga clic directamente sobre el. Si tiene alguna inquietud o requiere asistencia, por favor comuniquese con la administracion.
      </p>
    </div>

    <!-- Pie de Pagina Legal -->
    <div style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 16px 24px; text-align: center; font-size: 11px; color: #94a3b8; line-height: 1.4;">
      <p style="margin: 0 0 4px 0; font-weight: 700; color: #64748b;">Inmobiliaria Conte C.A. • RIF J-30510225-2</p>
      <p style="margin: 0;">San Cristobal, Estado Tachira, Venezuela. Todos los derechos reservados.</p>
    </div>

  </div>
</body>
</html>
    `;

    const info = await sendEmail({
      to: inquilinoEmail,
      subject,
      html,
    });

    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error("Error al enviar notificacion de acceso al inquilino:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error desconocido al despachar correo",
    };
  }
}

