import nodemailer from "nodemailer";

// Configuración del transporte SMTP oficial de Gmail
export const emailTransporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
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
  const fromAddress = process.env.EMAIL_USER;

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
  const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL;
  if (!adminEmail) return null;

  return await sendEmail({
    to: adminEmail,
    subject: `[Alerta Admin] ${subject}`,
    html,
  });
}
