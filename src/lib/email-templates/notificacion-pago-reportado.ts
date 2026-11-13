import { sendEmail } from "@/lib/email";
import { NOMBRES_METODOS } from "@/lib/constants/pagos";
import { MESES } from "@/lib/date-utils";
import { MetodoPago } from "@prisma/client";

export interface NotificacionPagoReportadoParams {
  inquilinoNombre: string;
  inquilinoCedula: string;
  inquilinoTelefono: string;
  inquilinoEmail?: string | null;
  propiedadNombre: string;
  unidadCodigo: string;
  periodoMes: number;
  periodoAno: number;
  montoCanon: number;
  montoReportado: number;
  montoBs?: number | null;
  tasaBcv?: number | null;
  metodoPago: MetodoPago;
  referencia: string;
  fechaPago: string;
  comprobanteUrl: string;
  notas?: string | null;
}

// Envía notificación al administrador cuando un inquilino reporta una transferencia
export async function enviarNotificacionPagoReportadoAdmin(
  params: NotificacionPagoReportadoParams
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const {
      inquilinoNombre,
      inquilinoCedula,
      inquilinoTelefono,
      inquilinoEmail,
      propiedadNombre,
      unidadCodigo,
      periodoMes,
      periodoAno,
      montoCanon,
      montoReportado,
      montoBs,
      tasaBcv,
      metodoPago,
      referencia,
      fechaPago,
      comprobanteUrl,
      notas,
    } = params;

    // Correo de administración institucional único: ADMIN_NOTIFICATION_EMAIL o EMAIL_USER
    const adminEmail = (
      process.env.ADMIN_NOTIFICATION_EMAIL ||
      process.env.EMAIL_USER ||
      process.env.GMAIL_USER ||
      ""
    ).trim();

    if (!adminEmail || !adminEmail.includes("@")) {
      return {
        success: false,
        error: "No hay correo de administración configurado (ADMIN_NOTIFICATION_EMAIL o EMAIL_USER).",
      };
    }

    const mesNombre = MESES[periodoMes - 1] || `Mes ${periodoMes}`;
    const metodoLabel = NOMBRES_METODOS[metodoPago] || metodoPago;

    const fechaTransferenciaFormateada = (() => {
      try {
        const d = new Date(fechaPago);
        if (!isNaN(d.getTime())) {
          return d.toLocaleDateString("es-VE", {
            day: "2-digit",
            month: "short",
            year: "numeric",
          });
        }
      } catch {
        // Fallback
      }
      return fechaPago;
    })();

    const html = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Nuevo Pago Reportado - Inmobiliaria Conté</title>
  <style>
    @media only screen and (max-width: 540px) {
      .email-wrapper { padding: 12px 6px !important; }
      .email-container { width: 100% !important; border-radius: 12px !important; }
      .email-header { padding: 18px 16px !important; }
      .email-body { padding: 20px 16px !important; }
      .email-card { padding: 16px 14px !important; }
      .field-label { display: block !important; width: 100% !important; margin-bottom: 2px !important; }
      .field-value { display: block !important; width: 100% !important; margin-bottom: 8px !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #F1F5F9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" class="email-wrapper" style="background-color: #F1F5F9; padding: 24px 10px;">
    <tr>
      <td align="center">
        <!-- Contenedor Principal -->
        <table width="100%" border="0" cellspacing="0" cellpadding="0" class="email-container" style="max-width: 540px; background-color: #FFFFFF; border-radius: 14px; overflow: hidden; border: 1px solid #E2E8F0; box-shadow: 0 4px 16px rgba(28, 37, 57, 0.06);">
          
          <!-- Encabezado Institucional -->
          <tr>
            <td class="email-header" style="background-color: #1C2539; padding: 20px 24px; border-bottom: 3px solid #175E38;">
              <table width="100%" border="0" cellspacing="0" cellpadding="0">
                <tr>
                  <td>
                    <h1 style="margin: 0; color: #FFFFFF; font-size: 15px; font-weight: 800; letter-spacing: 0.5px; text-transform: uppercase;">
                      INMOBILIARIA CONTÉ
                    </h1>
                    <p style="margin: 2px 0 0 0; color: #94A3B8; font-size: 11px; font-weight: 500;">
                      Auditoría y Centro de Cobranzas
                    </p>
                  </td>
                  <td align="right">
                    <span style="display: inline-block; background-color: #2563EB; color: #FFFFFF; font-size: 10px; font-weight: 800; padding: 4px 10px; border-radius: 12px; text-transform: uppercase; letter-spacing: 0.5px;">
                      PAGO POR CONFIRMAR
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Cuerpo del Mensaje -->
          <tr>
            <td class="email-body" style="padding: 24px 24px 20px 24px;">
              <p style="margin: 0 0 10px 0; color: #0F172A; font-size: 15px; font-weight: 700;">
                Atención Administración:
              </p>
              <p style="margin: 0 0 18px 0; color: #475569; font-size: 13.5px; line-height: 1.5;">
                El inquilino <strong>${inquilinoNombre}</strong> ha reportado el pago de su canon y adjuntó su comprobante para conciliación bancaria:
              </p>

              <!-- Tarjeta de Resumen Financiero -->
              <div class="email-card" style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 12px; padding: 18px; margin-bottom: 16px;">
                <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 12px; border-bottom: 1px solid #E2E8F0; padding-bottom: 12px;">
                  <tr>
                    <td>
                      <span style="font-size: 11px; font-weight: 700; color: #64748B; text-transform: uppercase; letter-spacing: 0.5px;">
                        Monto Reportado
                      </span>
                      <div style="font-size: 22px; font-weight: 900; color: #175E38; margin-top: 2px;">
                        $${montoReportado.toFixed(2)} USD
                      </div>
                      ${
                        montoBs && tasaBcv
                          ? `<div style="font-size: 13px; font-weight: 800; color: #1E293B; margin-top: 3px;">
                               Bs. ${montoBs.toLocaleString("es-VE", { minimumFractionDigits: 2 })} <span style="font-size: 11px; font-weight: 500; color: #64748B;">(Tasa BCV: ${tasaBcv.toFixed(2)} Bs/$)</span>
                             </div>`
                          : ""
                      }
                    </td>
                    <td align="right">
                      <span style="font-size: 11px; font-weight: 700; color: #64748B; text-transform: uppercase; letter-spacing: 0.5px;">
                        Periodo
                      </span>
                      <div style="font-size: 14px; font-weight: 800; color: #0F172A; margin-top: 2px;">
                        ${mesNombre} ${periodoAno}
                      </div>
                    </td>
                  </tr>
                </table>

                <!-- Ficha de Datos -->
                <table width="100%" border="0" cellspacing="0" cellpadding="0" style="font-size: 13px; line-height: 1.5;">
                  <tr>
                    <td class="field-label" style="padding: 5px 0; color: #64748B; font-weight: 600; width: 38%;">👤 Inquilino:</td>
                    <td class="field-value" style="padding: 5px 0; color: #0F172A; font-weight: 700;">
                      ${inquilinoNombre} <span style="font-size: 11px; color: #64748B; font-weight: 500;">(${inquilinoCedula})</span>
                    </td>
                  </tr>
                  <tr>
                    <td class="field-label" style="padding: 5px 0; color: #64748B; font-weight: 600;">📍 Espacio / Inmueble:</td>
                    <td class="field-value" style="padding: 5px 0; color: #0F172A; font-weight: 700;">
                      ${unidadCodigo} · ${propiedadNombre}
                    </td>
                  </tr>
                  <tr>
                    <td class="field-label" style="padding: 5px 0; color: #64748B; font-weight: 600;">💳 Vía de Pago:</td>
                    <td class="field-value" style="padding: 5px 0; color: #0F172A; font-weight: 700;">
                      ${metodoLabel}
                    </td>
                  </tr>
                  <tr>
                    <td class="field-label" style="padding: 5px 0; color: #64748B; font-weight: 600;">🔢 N° Referencia:</td>
                    <td class="field-value" style="padding: 5px 0; color: #0F172A; font-weight: 700; font-family: monospace;">
                      ${referencia}
                    </td>
                  </tr>
                  <tr>
                    <td class="field-label" style="padding: 5px 0; color: #64748B; font-weight: 600;">📅 Fecha Transferencia:</td>
                    <td class="field-value" style="padding: 5px 0; color: #0F172A; font-weight: 700;">
                      ${fechaTransferenciaFormateada}
                    </td>
                  </tr>
                  <tr>
                    <td class="field-label" style="padding: 5px 0; color: #64748B; font-weight: 600;">📞 Teléfono Contacto:</td>
                    <td class="field-value" style="padding: 5px 0; color: #0F172A; font-weight: 700;">
                      ${inquilinoTelefono}
                    </td>
                  </tr>
                </table>

                ${
                  notas
                    ? `
                <div style="margin-top: 12px; padding-top: 10px; border-top: 1px solid #E2E8F0;">
                  <span style="font-size: 11px; font-weight: 700; color: #64748B; text-transform: uppercase; display: block; margin-bottom: 2px;">
                    Observaciones del Inquilino:
                  </span>
                  <p style="margin: 0; color: #334155; font-size: 12.5px; line-height: 1.4; font-style: italic;">
                    "${notas}"
                  </p>
                </div>
                `
                    : ""
                }
              </div>

              <!-- Aviso Informativo -->
              <div style="margin-top: 16px; padding: 12px 16px; background-color: #F1F5F9; border-radius: 10px; border-left: 4px solid #175E38;">
                <p style="margin: 0; color: #334155; font-size: 12px; line-height: 1.5;">
                  <strong>Aviso:</strong> Este pago y su comprobante ya se encuentran disponibles en el módulo de <strong>Cobranza</strong> del sistema administrativo para su respectiva conciliación.
                </p>
              </div>
            </td>
          </tr>

          <!-- Pie de Página Institucional -->
          <tr>
            <td style="background-color: #F8FAFC; padding: 14px 20px; text-align: center; border-top: 1px solid #E2E8F0;">
              <p style="margin: 0; color: #94A3B8; font-size: 11px; line-height: 1.4;">
                Inmobiliaria Conté C.A. • Sistema de Cobranzas y Arrendamientos<br>
                Este correo fue generado automáticamente tras el reporte de pago del inquilino.
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
      to: adminEmail,
      subject: `🔔 [Pago Reportado] ${inquilinoNombre} - ${unidadCodigo} (${mesNombre} ${periodoAno})`,
      html,
    });

    return { success: true, messageId: info?.messageId };
  } catch (error: unknown) {
    console.error("Error al enviar notificación de pago reportado al admin:", error);
    const errMsg = error instanceof Error ? error.message : "Error desconocido al enviar correo";
    return { success: false, error: errMsg };
  }
}

