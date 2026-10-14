import nodemailer from "nodemailer";

// Obtención segura de credenciales soportando ambas nomenclaturas
const smtpUser = process.env.EMAIL_USER || process.env.GMAIL_USER || "";
const smtpPass = (process.env.EMAIL_PASS || process.env.GMAIL_PASS || "").replace(/\s+/g, "");

// Configuración del transporte SMTP oficial de Gmail
export const emailTransporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: smtpUser,
    pass: smtpPass,
  },
});

interface EmailPayload {
  to: string | string[];
  subject: string;
  html: string;
  attachments?: Array<{
    filename: string;
    content?: string | Buffer;
    path?: string;
    contentType?: string;
  }>;
}

// Función principal para enviar correos a inquilinos o clientes
export async function sendEmail({ to, subject, html, attachments }: EmailPayload) {
  const fromName = process.env.EMAIL_FROM_NAME || "Inmobiliaria Conté";
  const fromAddress = smtpUser;

  return await emailTransporter.sendMail({
    from: `"${fromName}" <${fromAddress}>`,
    to,
    subject,
    html,
    attachments,
  });
}

// Función para enviar alertas automáticas al correo del dueño/administrador
export async function sendAdminNotification(subject: string, html: string) {
  const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL || smtpUser;
  if (!adminEmail) return null;

  return await sendEmail({
    to: adminEmail,
    subject: `[Alerta Admin] ${subject}`,
    html,
  });
}

// Función para verificar conectividad del servicio SMTP
export async function verifyEmailConnection(): Promise<{ success: boolean; error?: string }> {
  try {
    await emailTransporter.verify();
    return { success: true };
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : "Error desconocido en SMTP";
    return { success: false, error: errorMsg };
  }
}
