import { sendEmail } from "@/lib/email";
import { MESES } from "@/lib/date-utils";

export interface NotificacionPagoRechazadoParams {
  inquilinoNombre: string;
  inquilinoEmail: string;
  unidadCodigo: string;
  propiedadNombre: string;
  periodoMes: number;
  periodoAno: number;
  referencia?: string | null;
  motivo?: string | null;
}

// Envía notificación al inquilino si su comprobante fue rechazado o requiere corrección
export async function enviarNotificacionPagoRechazadoInquilino(
  params: NotificacionPagoRechazadoParams
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const {
      inquilinoNombre,
      inquilinoEmail,
      unidadCodigo,
      propiedadNombre,
      periodoMes,
      periodoAno,
      referencia,
      motivo,
    } = params;

    if (!inquilinoEmail || !inquilinoEmail.includes("@")) {
      return {
        success: false,
        error: "El inquilino no tiene un correo electrónico válido registrado.",
      };
    }

    const mesNombre = MESES[periodoMes - 1] || `Mes ${periodoMes}`;

    const html = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Observación en Reporte de Pago - Inmobiliaria Conté</title>
</head>
<body style="margin: 0; padding: 0; background-color: #F1F5F9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #F1F5F9; padding: 24px 10px;">
    <tr>
      <td align="center">
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 520px; background-color: #FFFFFF; border-radius: 14px; overflow: hidden; border: 1px solid #E2E8F0; box-shadow: 0 4px 16px rgba(28, 37, 57, 0.06);">
          
          <!-- Encabezado -->
          <tr>
            <td style="background-color: #1C2539; padding: 20px 24px; border-bottom: 3px solid #CC1A22;">
              <table width="100%" border="0" cellspacing="0" cellpadding="0">
                <tr>
                  <td>
                    <h1 style="margin: 0; color: #FFFFFF; font-size: 15px; font-weight: 800; text-transform: uppercase;">
                      INMOBILIARIA CONTÉ
                    </h1>
                    <p style="margin: 2px 0 0 0; color: #94A3B8; font-size: 11px;">
                      Atención al Arrendatario
                    </p>
                  </td>
                  <td align="right">
                    <span style="display: inline-block; background-color: #CC1A22; color: #FFFFFF; font-size: 10px; font-weight: 800; padding: 4px 10px; border-radius: 12px; text-transform: uppercase;">
                      ACCIÓN REQUERIDA
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Cuerpo -->
          <tr>
            <td style="padding: 24px 24px 20px 24px;">
              <p style="margin: 0 0 10px 0; color: #0F172A; font-size: 15px; font-weight: 700;">
                Hola, ${inquilinoNombre}:
              </p>
              <p style="margin: 0 0 16px 0; color: #475569; font-size: 13.5px; line-height: 1.5;">
                Hemos revisado el reporte de pago para el espacio <strong>${unidadCodigo} (${propiedadNombre})</strong> correspondiente a <strong>${mesNombre} ${periodoAno}</strong>, pero no ha podido ser validado por la administración.
              </p>

              <!-- Motivo -->
              <div style="background-color: #FFF1F2; border: 1px solid #FECDD3; border-radius: 12px; padding: 16px; margin-bottom: 16px;">
                <span style="font-size: 11px; font-weight: 800; color: #9F1239; text-transform: uppercase; letter-spacing: 0.5px; display: block; margin-bottom: 4px;">
                  Motivo de la Observación:
                </span>
                <p style="margin: 0; color: #881337; font-size: 13px; line-height: 1.5; font-weight: 600;">
                  ${motivo || "El comprobante adjunto no coincide con los registros bancarios o no es legible. Por favor verifica y vuelve a subir tu captura."}
                </p>
                ${
                  referencia
                    ? `
                <p style="margin: 8px 0 0 0; font-size: 11px; color: #9F1239;">
                  Referencia reportada: <code>${referencia}</code>
                </p>
                `
                    : ""
                }
              </div>

              <div style="margin-top: 16px; padding: 12px 16px; background-color: #F8FAFC; border-radius: 10px; border: 1px solid #E2E8F0; text-align: center;">
                <p style="margin: 0; color: #475569; font-size: 12px; line-height: 1.5;">
                  Por favor, ingresa con tu usuario al <strong>Portal del Inquilino</strong> en la sección de <strong>Pagos</strong> para cargar nuevamente el comprobante o comunicarte con nuestro equipo.
                </p>
              </div>
            </td>
          </tr>

          <!-- Pie -->
          <tr>
            <td style="background-color: #F8FAFC; padding: 14px 20px; text-align: center; border-top: 1px solid #E2E8F0;">
              <p style="margin: 0; color: #94A3B8; font-size: 11px;">
                Inmobiliaria Conté C.A. • San Cristóbal, Táchira
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;

    const info = await sendEmail({
      to: inquilinoEmail.trim(),
      subject: `⚠️ Observación sobre tu pago: ${unidadCodigo} (${mesNombre} ${periodoAno}) — Inmobiliaria Conté`,
      html,
    });

    return { success: true, messageId: info?.messageId };
  } catch (error: unknown) {
    console.error("Error enviando alerta de rechazo de pago:", error);
    const errMsg = error instanceof Error ? error.message : "Error desconocido";
    return { success: false, error: errMsg };
  }
}

