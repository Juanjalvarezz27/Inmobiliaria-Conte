import { sendEmail } from "@/lib/email";
import { NOMBRES_METODOS } from "@/lib/constants/pagos";
import { MESES } from "@/lib/date-utils";
import { EstadoPago, MetodoPago } from "@prisma/client";

export interface NotificacionPagoConfirmadoParams {
  inquilinoNombre: string;
  inquilinoEmail: string;
  unidadCodigo: string;
  propiedadNombre: string;
  periodoMes: number;
  periodoAno: number;
  montoAbonado: number;
  montoTotalEsperado: number;
  montoTotalPagado: number;
  saldoRestante: number;
  estadoPago: EstadoPago;
  metodoPago: MetodoPago;
  referencia?: string | null;
  fechaPago: string | Date;
}

// Envía notificación oficial al inquilino cuando su pago o abono es confirmado en el sistema
export async function enviarNotificacionPagoConfirmadoInquilino(
  params: NotificacionPagoConfirmadoParams
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const {
      inquilinoNombre,
      inquilinoEmail,
      unidadCodigo,
      propiedadNombre,
      periodoMes,
      periodoAno,
      montoAbonado,
      montoTotalEsperado,
      montoTotalPagado,
      saldoRestante,
      estadoPago,
      metodoPago,
      referencia,
      fechaPago,
    } = params;

    if (!inquilinoEmail || !inquilinoEmail.includes("@")) {
      return {
        success: false,
        error: "El inquilino no tiene un correo electrónico válido registrado.",
      };
    }

    const mesNombre = MESES[periodoMes - 1] || `Mes ${periodoMes}`;
    const metodoLabel = NOMBRES_METODOS[metodoPago] || metodoPago;
    const esSolvente = estadoPago === EstadoPago.PAGADO || saldoRestante <= 0;

    const fechaFormateada = (() => {
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
      return String(fechaPago);
    })();

    const html = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Pago Confirmado - Inmobiliaria Conté</title>
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
                      Recibo Digital y Constancia de Pago
                    </p>
                  </td>
                  <td align="right">
                    <span style="display: inline-block; background-color: ${esSolvente ? "#175E38" : "#2563EB"}; color: #FFFFFF; font-size: 10px; font-weight: 800; padding: 4px 10px; border-radius: 12px; text-transform: uppercase; letter-spacing: 0.5px;">
                      ${esSolvente ? "SOLVENTE / AL DÍA" : "ABONO ACREDITADO"}
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
                Estimado(a) ${inquilinoNombre}:
              </p>
              <p style="margin: 0 0 18px 0; color: #475569; font-size: 13.5px; line-height: 1.5;">
                ${
                  esSolvente
                    ? "Te confirmamos que hemos verificado tu pago y tu canon ha sido <strong>liquidado satisfactoriamente</strong>. Tu cuenta se encuentra al día."
                    : "Te confirmamos que hemos recibido tu abono y fue acreditado exitosamente a tu canon correspondiente."
                }
              </p>

              <!-- Tarjeta de Resumen Financiero -->
              <div class="email-card" style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 12px; padding: 18px; margin-bottom: 16px;">
                <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 12px; border-bottom: 1px solid #E2E8F0; padding-bottom: 12px;">
                  <tr>
                    <td>
                      <span style="font-size: 11px; font-weight: 700; color: #64748B; text-transform: uppercase; letter-spacing: 0.5px;">
                        Monto Confirmado
                      </span>
                      <div style="font-size: 24px; font-weight: 900; color: #175E38; margin-top: 2px;">
                        $${montoAbonado.toFixed(2)} USD
                      </div>
                    </td>
                    <td align="right">
                      <span style="font-size: 11px; font-weight: 700; color: #64748B; text-transform: uppercase; letter-spacing: 0.5px;">
                        Canon
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
                    <td class="field-label" style="padding: 5px 0; color: #64748B; font-weight: 600; width: 40%;">📍 Espacio Arrendado:</td>
                    <td class="field-value" style="padding: 5px 0; color: #0F172A; font-weight: 700;">
                      ${unidadCodigo} (${propiedadNombre})
                    </td>
                  </tr>
                  <tr>
                    <td class="field-label" style="padding: 5px 0; color: #64748B; font-weight: 600;">💳 Vía de Pago:</td>
                    <td class="field-value" style="padding: 5px 0; color: #0F172A; font-weight: 700;">
                      ${metodoLabel}
                    </td>
                  </tr>
                  ${
                    referencia
                      ? `
                  <tr>
                    <td class="field-label" style="padding: 5px 0; color: #64748B; font-weight: 600;">🔢 N° Referencia:</td>
                    <td class="field-value" style="padding: 5px 0; color: #0F172A; font-weight: 700; font-family: monospace;">
                      ${referencia}
                    </td>
                  </tr>
                  `
                      : ""
                  }
                  <tr>
                    <td class="field-label" style="padding: 5px 0; color: #64748B; font-weight: 600;">📅 Fecha de Operación:</td>
                    <td class="field-value" style="padding: 5px 0; color: #0F172A; font-weight: 700;">
                      ${fechaFormateada}
                    </td>
                  </tr>
                  <tr>
                    <td class="field-label" style="padding: 5px 0; color: #64748B; font-weight: 600;">💵 Canon Acordado:</td>
                    <td class="field-value" style="padding: 5px 0; color: #0F172A; font-weight: 700;">
                      $${montoTotalEsperado.toFixed(2)} USD
                    </td>
                  </tr>
                  <tr>
                    <td class="field-label" style="padding: 5px 0; color: #64748B; font-weight: 600;">💰 Total Liquidado:</td>
                    <td class="field-value" style="padding: 5px 0; color: #175E38; font-weight: 800;">
                      $${montoTotalPagado.toFixed(2)} USD
                    </td>
                  </tr>
                  <tr>
                    <td class="field-label" style="padding: 5px 0; color: #64748B; font-weight: 600;">⚖️ Saldo Restante:</td>
                    <td class="field-value" style="padding: 5px 0; color: ${esSolvente ? "#175E38" : "#B91C1C"}; font-weight: 800;">
                      ${esSolvente ? "$0.00 USD (¡Al Día!)" : `$${saldoRestante.toFixed(2)} USD`}
                    </td>
                  </tr>
                </table>
              </div>

              <!-- Mensaje Informativo -->
              <div style="margin-top: 16px; padding: 12px 16px; background-color: #F8FAFC; border-radius: 10px; border: 1px solid #E2E8F0; text-align: center;">
                <p style="margin: 0; color: #475569; font-size: 12px; line-height: 1.5;">
                  Puedes consultar el histórico de tus pagos y generar tus recibos en PDF ingresando con tu usuario en el <strong>Portal del Inquilino</strong>.
                </p>
              </div>
            </td>
          </tr>

          <!-- Pie de Página Institucional -->
          <tr>
            <td style="background-color: #F8FAFC; padding: 14px 20px; text-align: center; border-top: 1px solid #E2E8F0;">
              <p style="margin: 0; color: #94A3B8; font-size: 11px; line-height: 1.4;">
                Inmobiliaria Conté C.A. • RIF J-30472401-4 • San Cristóbal, Táchira<br>
                Gracias por tu puntualidad y confianza. Este correo certifica la confirmación contable de tu pago.
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
      subject: `✅ Pago Confirmado: ${unidadCodigo} (${mesNombre} ${periodoAno}) — Inmobiliaria Conté`,
      html,
    });

    return { success: true, messageId: info?.messageId };
  } catch (error: unknown) {
    console.error("Error al enviar correo de confirmación de pago al inquilino:", error);
    const errMsg = error instanceof Error ? error.message : "Error desconocido";
    return { success: false, error: errMsg };
  }
}

