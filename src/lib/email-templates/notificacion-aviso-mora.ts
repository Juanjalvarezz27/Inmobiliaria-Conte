import { sendEmail } from "@/lib/email";
import { getNombreMes } from "@/lib/date-utils";

export interface NotificacionAvisoMoraParams {
  inquilinoNombre: string;
  inquilinoEmail: string;
  unidadCodigo: string;
  propiedadNombre: string;
  periodoMes: number;
  periodoAno: number;
  montoTotalEsperado: number;
  montoPagado: number;
  saldoRestante: number;
  tasaBcv?: number | null;
  tasaReferenciaBcv?: "USD" | "EUR";
  fechaVencimiento: string | Date;
}

// Envia aviso formal de vencimiento y estado de mora al inquilino
export async function enviarNotificacionAvisoMora(
  params: NotificacionAvisoMoraParams
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const {
      inquilinoNombre,
      inquilinoEmail,
      unidadCodigo,
      propiedadNombre,
      periodoMes,
      periodoAno,
      saldoRestante,
      tasaBcv,
      tasaReferenciaBcv = "USD",
      fechaVencimiento,
    } = params;

    const etiquetaTasa = tasaReferenciaBcv === "EUR" ? "Bs/€ (Euro BCV)" : "Bs/$ (Dólar BCV)";

    if (!inquilinoEmail || !inquilinoEmail.includes("@")) {
      return { success: false, error: "El inquilino no tiene un correo electronico valido." };
    }

    const nombreMes = getNombreMes(periodoMes) || `Mes ${periodoMes}`;
    const fechaVencStr =
      typeof fechaVencimiento === "string"
        ? fechaVencimiento.split("T")[0]
        : fechaVencimiento.toISOString().split("T")[0];

    const contravalorBs =
      tasaBcv && tasaBcv > 0 ? (saldoRestante * tasaBcv).toFixed(2) : null;

    const subject = `⚠️ [Aviso de Cobro] Canon de arrendamiento vencido - ${unidadCodigo} (${nombreMes} ${periodoAno})`;

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
      <h2 style="color: #ffffff; margin: 0; font-size: 18px; font-weight: 800;">Inmobiliaria Conte • Control de Cobranzas</h2>
      <p style="color: #fca5a5; margin: 4px 0 0 0; font-size: 12px; font-weight: 600;">Aviso formal de canon vencido en mora</p>
    </div>
    
    <div style="padding: 24px;">
      <p style="font-size: 14px; color: #334155; margin-top: 0; line-height: 1.5;">
        Estimado(a) <strong>${inquilinoNombre}</strong>,
      </p>
      <p style="font-size: 13px; color: #475569; line-height: 1.5;">
        Le recordamos que el canon de arrendamiento correspondiente a <strong>${nombreMes} ${periodoAno}</strong> para su local o espacio <strong>${unidadCodigo}</strong> en <strong>${propiedadNombre}</strong> vencio el pasado <strong>${fechaVencStr}</strong> y registra saldo pendiente de pago.
      </p>

      <div style="background-color: #fef2f2; border: 1px solid #fecaca; border-radius: 12px; padding: 16px; margin: 20px 0;">
        <span style="font-size: 11px; font-weight: 800; color: #991b1b; text-transform: uppercase; letter-spacing: 0.5px; display: block; margin-bottom: 6px;">
          Saldo Pendiente por Liquidar
        </span>
        <div style="font-size: 26px; font-weight: 900; color: #991b1b; font-family: monospace;">
          $${saldoRestante.toFixed(2)} USD
        </div>
        ${
          contravalorBs
            ? `<div style="font-size: 12px; color: #b91c1c; font-weight: 700; margin-top: 4px;">
                Contravalor referencial: Bs. ${Number(contravalorBs).toLocaleString("es-VE", { minimumFractionDigits: 2 })} @ Tasa BCV: ${tasaBcv?.toFixed(2)} ${etiquetaTasa}
              </div>`
            : ""
        }
      </div>

      <table style="width: 100%; border-collapse: collapse; font-size: 12px; margin-bottom: 20px;">
        <tr>
          <td style="padding: 8px 0; color: #64748b; font-weight: 600; width: 40%;">Inmueble / Unidad:</td>
          <td style="padding: 8px 0; color: #0f172a; font-weight: 700;">${propiedadNombre} • ${unidadCodigo}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #64748b; font-weight: 600;">Periodo adeudado:</td>
          <td style="padding: 8px 0; color: #0f172a; font-weight: 700;">${nombreMes} ${periodoAno}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #64748b; font-weight: 600;">Fecha de corte:</td>
          <td style="padding: 8px 0; color: #CC1A22; font-weight: 700;">${fechaVencStr}</td>
        </tr>
      </table>

      <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 14px; margin-bottom: 20px;">
        <h4 style="margin: 0 0 6px 0; font-size: 12px; color: #0f172a; font-weight: 800;">¿Como reportar su pago?</h4>
        <p style="margin: 0; font-size: 12px; color: #64748b; line-height: 1.5;">
          Puede ingresar a su <strong>Portal del Inquilino</strong>, seleccionar la seccion de Pagos y adjuntar su comprobante de Pago Movil, Transferencia o Efectivo para conciliar y recibir su solvencia de inmediato.
        </p>
      </div>

      <p style="font-size: 11px; color: #94a3b8; margin: 0; text-align: center; border-top: 1px solid #e2e8f0; padding-top: 16px;">
        Este es un aviso automatico de control financiero generado por Inmobiliaria Conte.
      </p>
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
    console.error("Error al enviar notificacion de aviso de mora:", error);
    return { success: false, error: "Fallo al enviar correo de mora al inquilino." };
  }
}
