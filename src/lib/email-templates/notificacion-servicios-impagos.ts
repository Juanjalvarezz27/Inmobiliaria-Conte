import { sendEmail } from "@/lib/email";
import { getNombreMes } from "@/lib/date-utils";

export interface NotificacionServiciosImpagosParams {
  inquilinoNombre: string;
  inquilinoEmail: string;
  unidadCodigo: string;
  propiedadNombre: string;
  periodoMes: number;
  periodoAno: number;
  luzSolvente: boolean;
  aguaSolvente: boolean;
  serviciosObservaciones?: string | null;
}

// Envia alerta de servicios publicos insolventes (Corpoelec o Agua) al inquilino
export async function enviarNotificacionServiciosImpagos(
  params: NotificacionServiciosImpagosParams
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const {
      inquilinoNombre,
      inquilinoEmail,
      unidadCodigo,
      propiedadNombre,
      periodoMes,
      periodoAno,
      luzSolvente,
      aguaSolvente,
      serviciosObservaciones,
    } = params;

    if (!inquilinoEmail || !inquilinoEmail.includes("@")) {
      return { success: false, error: "El inquilino no tiene un correo electronico valido." };
    }

    const nombreMes = getNombreMes(periodoMes) || `Mes ${periodoMes}`;
    const serviciosInsolventes = [];
    if (!luzSolvente) serviciosInsolventes.push("Electricidad (Corpoelec)");
    if (!aguaSolvente) serviciosInsolventes.push("Agua Potable (Hidrologica)");

    const subject = `⚡ [Alerta de Servicios] Solvencia de ${serviciosInsolventes.join(" y ")} pendiente - ${unidadCodigo}`;

    const html = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>${subject}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f1f5f9; margin: 0; padding: 24px;">
  <div style="max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden;">
    <div style="background-color: #1C2539; padding: 20px 24px; border-bottom: 3px solid #f59e0b;">
      <h2 style="color: #ffffff; margin: 0; font-size: 18px; font-weight: 800;">Inmobiliaria Conte • Control de Inmuebles</h2>
      <p style="color: #fde68a; margin: 4px 0 0 0; font-size: 12px; font-weight: 600;">Auditoria de servicios publicos en su espacio comercial</p>
    </div>
    
    <div style="padding: 24px;">
      <p style="font-size: 14px; color: #334155; margin-top: 0; line-height: 1.5;">
        Estimado(a) <strong>${inquilinoNombre}</strong>,
      </p>
      <p style="font-size: 13px; color: #475569; line-height: 1.5;">
        Durante la revision mensual correspondiente a <strong>${nombreMes} ${periodoAno}</strong> para el local <strong>${unidadCodigo}</strong> en <strong>${propiedadNombre}</strong>, la administracion registro que no se cuenta con el comprobante de solvencia de los siguientes servicios publicos:
      </p>

      <div style="background-color: #fffbeb; border: 1px solid #fde68a; border-radius: 12px; padding: 16px; margin: 20px 0;">
        <span style="font-size: 11px; font-weight: 800; color: #b45309; text-transform: uppercase; letter-spacing: 0.5px; display: block; margin-bottom: 8px;">
          Servicios Pendientes por Justificar
        </span>
        <ul style="margin: 0; padding-left: 20px; font-size: 14px; color: #92400e; font-weight: 700;">
          ${serviciosInsolventes.map((s) => `<li style="margin-bottom: 4px;">${s}</li>`).join("")}
        </ul>
        ${
          serviciosObservaciones
            ? `<div style="font-size: 12px; color: #78350f; margin-top: 10px; border-top: 1px dashed #fcd34d; padding-top: 8px;">
                <strong>Observaciones de Administracion:</strong> ${serviciosObservaciones}
              </div>`
            : ""
        }
      </div>

      <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 14px; margin-bottom: 20px;">
        <h4 style="margin: 0 0 6px 0; font-size: 12px; color: #0f172a; font-weight: 800;">¿Como consignar la solvencia?</h4>
        <p style="margin: 0; font-size: 12px; color: #64748b; line-height: 1.5;">
          Por favor adjunte el comprobante o captura de pago de la factura correspondiente desde su <strong>Portal del Inquilino</strong> en la seccion de Pagos, o entreguela en la oficina de administracion para mantener su ficha solvente.
        </p>
      </div>

      <p style="font-size: 11px; color: #94a3b8; margin: 0; text-align: center; border-top: 1px solid #e2e8f0; padding-top: 16px;">
        Inmobiliaria Conte • Gestion y Administracion de Inmuebles Comerciales
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
    console.error("Error al enviar notificacion de servicios impagos:", error);
    return { success: false, error: "Fallo al enviar correo de servicios al inquilino." };
  }
}
