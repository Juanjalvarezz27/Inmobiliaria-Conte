import { sendEmail } from "@/lib/email";

export interface NotificacionTareaParams {
  empleadoNombre: string;
  empleadoEmail: string;
  tareaTitulo: string;
  tareaDescripcion?: string | null;
  propiedadNombre?: string | null;
  prioridad: string;
  fechaLimite?: Date | null;
  requiereEvidencia?: boolean;
}

// Genera y envía el correo institucional de notificación de nueva tarea al trabajador
export async function enviarNotificacionNuevaTarea(params: NotificacionTareaParams): Promise<{
  success: boolean;
  messageId?: string;
  error?: string;
}> {
  try {
    const {
      empleadoNombre,
      empleadoEmail,
      tareaTitulo,
      tareaDescripcion,
      propiedadNombre,
      prioridad,
      fechaLimite,
      requiereEvidencia,
    } = params;

    if (!empleadoEmail || !empleadoEmail.includes("@")) {
      return { success: false, error: "El trabajador no tiene un correo válido configurado." };
    }

    // Configuración de estilo del badge de prioridad
    let badgeBg = "#DCFCE7";
    let badgeColor = "#166534";
    let badgeBorder = "#86EFAC";
    let prioridadLabel = "Normal";

    if (prioridad === "URGENTE") {
      badgeBg = "#FEE2E2";
      badgeColor = "#991B1B";
      badgeBorder = "#FCA5A5";
      prioridadLabel = "Urgente";
    } else if (prioridad === "ALTA") {
      badgeBg = "#FEF3C7";
      badgeColor = "#92400E";
      badgeBorder = "#FCD34D";
      prioridadLabel = "Alta";
    }

    const fechaLimiteTexto = fechaLimite
      ? new Date(fechaLimite).toLocaleDateString("es-VE", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        })
      : "Sin fecha límite";

    const html = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Nueva Tarea Asignada - Inmobiliaria Conté</title>
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
        <!-- Contenedor Principal (ancho optimizado para desktop y móvil) -->
        <table width="100%" border="0" cellspacing="0" cellpadding="0" class="email-container" style="max-width: 520px; background-color: #FFFFFF; border-radius: 14px; overflow: hidden; border: 1px solid #E2E8F0; box-shadow: 0 2px 10px rgba(28, 37, 57, 0.05);">
          
          <!-- Encabezado Institucional -->
          <tr>
            <td class="email-header" style="background-color: #1C2539; padding: 20px 24px; border-bottom: 3px solid #175E38;">
              <table width="100%" border="0" cellspacing="0" cellpadding="0">
                <tr>
                  <td>
                    <h1 style="margin: 0; color: #FFFFFF; font-size: 16px; font-weight: 800; letter-spacing: 0.5px; text-transform: uppercase;">
                      INMOBILIARIA CONTÉ
                    </h1>
                    <p style="margin: 2px 0 0 0; color: #94A3B8; font-size: 11px; font-weight: 500;">
                      Sistema de Gestión de Personal
                    </p>
                  </td>
                  <td align="right">
                    <span style="display: inline-block; background-color: #175E38; color: #FFFFFF; font-size: 10px; font-weight: 800; padding: 3px 8px; border-radius: 12px; text-transform: uppercase; letter-spacing: 0.5px;">
                      NUEVA ORDEN
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
                Hola, ${empleadoNombre}:
              </p>
              <p style="margin: 0 0 18px 0; color: #475569; font-size: 13.5px; line-height: 1.5;">
                Se te ha asignado una nueva orden de trabajo en el sistema con los siguientes detalles:
              </p>

              <!-- Tarjeta de la Tarea (Totalmente fluida) -->
              <div class="email-card" style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 12px; padding: 18px; margin-bottom: 8px;">
                <div style="margin-bottom: 12px;">
                  <span style="display: inline-block; background-color: ${badgeBg}; color: ${badgeColor}; border: 1px solid ${badgeBorder}; font-size: 10px; font-weight: 800; padding: 2px 7px; border-radius: 5px; text-transform: uppercase; margin-bottom: 6px;">
                    Prioridad ${prioridadLabel}
                  </span>
                  <h2 style="margin: 4px 0 0 0; color: #0F172A; font-size: 16px; font-weight: 800; line-height: 1.35;">
                    ${tareaTitulo}
                  </h2>
                </div>

                <!-- Lista de detalles (Adaptable a 1 o 2 columnas) -->
                <table width="100%" border="0" cellspacing="0" cellpadding="0" style="font-size: 13px; line-height: 1.5;">
                  <tr>
                    <td class="field-label" style="padding: 6px 0; color: #64748B; font-weight: 600; width: 34%;">📍 Inmueble:</td>
                    <td class="field-value" style="padding: 6px 0; color: #0F172A; font-weight: 700;">${propiedadNombre || "Sede General / Multipropiedad"}</td>
                  </tr>
                  <tr>
                    <td class="field-label" style="padding: 6px 0; color: #64748B; font-weight: 600;">📅 Fecha Límite:</td>
                    <td class="field-value" style="padding: 6px 0; color: #0F172A; font-weight: 700;">${fechaLimiteTexto}</td>
                  </tr>
                  <tr>
                    <td class="field-label" style="padding: 6px 0; color: #64748B; font-weight: 600;">📸 Evidencias:</td>
                    <td class="field-value" style="padding: 6px 0; color: ${requiereEvidencia ? "#B91C1C" : "#0F172A"}; font-weight: 700;">
                      ${requiereEvidencia ? "Obligatoria (adjuntar fotos al finalizar)" : "Opcional"}
                    </td>
                  </tr>
                </table>

                ${
                  tareaDescripcion
                    ? `
                <div style="margin-top: 14px; padding-top: 12px; border-top: 1px solid #E2E8F0;">
                  <span style="font-size: 11px; font-weight: 700; color: #64748B; text-transform: uppercase; display: block; margin-bottom: 4px; letter-spacing: 0.5px;">
                    Instrucciones:
                  </span>
                  <p style="margin: 0; color: #334155; font-size: 13px; line-height: 1.5; white-space: pre-line;">
                    ${tareaDescripcion}
                  </p>
                </div>
                `
                    : ""
                }
              </div>
            </td>
          </tr>

          <!-- Pie de Página Institucional Sencillo -->
          <tr>
            <td style="background-color: #F8FAFC; padding: 14px 20px; text-align: center; border-top: 1px solid #E2E8F0;">
              <p style="margin: 0; color: #94A3B8; font-size: 11px; line-height: 1.4;">
                Inmobiliaria Conté C.A. • Gestión de Operaciones<br>
                Este es un mensaje automático del sistema. Por favor no respondas a este correo.
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
      to: empleadoEmail,
      subject: `Nueva Tarea Asignada: ${tareaTitulo} — Inmobiliaria Conté`,
      html,
    });

    return {
      success: true,
      messageId: (info as { messageId?: string })?.messageId,
    };
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : "Error desconocido al enviar correo";
    console.error("Error al enviar notificación de tarea por correo:", errorMsg);
    return { success: false, error: errorMsg };
  }
}
