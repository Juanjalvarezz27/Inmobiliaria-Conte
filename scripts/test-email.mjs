import nodemailer from "nodemailer";

const user = process.env.EMAIL_USER || process.env.GMAIL_USER || "";
const pass = (process.env.EMAIL_PASS || process.env.GMAIL_PASS || "").replace(/\s+/g, "");

console.log("\n=======================================================");
console.log(" 📧 Comprobador de Conexión Gmail SMTP — Inmobiliaria Conté");
console.log("=======================================================\n");
console.log(`• Usuario / Remitente: ${user || "(No configurado)"}`);
console.log(`• Clave de aplicación: ${pass ? pass.slice(0, 4) + " **** **** " + pass.slice(-4) : "(No configurada)"}`);
console.log(`• Longitud de clave:   ${pass.length} caracteres (debe ser 16)\n`);

if (!user || !pass) {
  console.error("❌ ERROR: Faltan credenciales en el archivo .env (EMAIL_USER / EMAIL_PASS).");
  process.exit(1);
}

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: { user, pass },
});

console.log("Conectando con servidores de Google SMTP (smtp.gmail.com)...");

try {
  await transporter.verify();
  console.log("\n✅ ¡ÉXITO! Conexión y credenciales de Gmail validadas correctamente.");
  console.log("El sistema está autenticado y listo para enviar correos.");

  if (process.argv.includes("--send")) {
    console.log(`\nEnviando correo de prueba real a: ${user}...`);
    const info = await transporter.sendMail({
      from: `"Inmobiliaria Conté" <${user}>`,
      to: user,
      subject: "✅ Prueba Exitosa de Envío — Inmobiliaria Conté",
      html: `
        <div style="font-family: sans-serif; padding: 24px; background-color: #f8fafc; border-radius: 16px; border: 1px solid #e2e8f0; max-width: 500px;">
          <h2 style="color: #175E38; margin-top: 0;">¡Conexión y Envío Exitoso!</h2>
          <p style="color: #334155; font-size: 14px; line-height: 1.5;">El servicio de correo transaccional de <strong>Inmobiliaria Conté C.A.</strong> está correctamente vinculado con tu cuenta de Gmail.</p>
          <div style="margin-top: 16px; padding: 12px; background-color: #ffffff; border-radius: 8px; border: 1px solid #cbd5e1; font-size: 12px; color: #64748b;">
            • Remitente: ${user}<br/>
            • Fecha: ${new Date().toLocaleString("es-ES")}<br/>
            • Estado: Verificado y Entregado
          </div>
        </div>
      `,
    });
    console.log(`✉️ Correo de prueba entregado a Google con ID: ${info.messageId}\n`);
  } else {
    console.log("Tip: Ejecuta 'npm run email:test -- --send' si deseas enviar un correo real de prueba.\n");
  }
} catch (error) {
  console.error("\n❌ ERROR DE AUTENTICACIÓN GOOGLE (535 BadCredentials):");
  console.error(error?.message || error);
  console.log("\n💡 CÓMO SOLUCIONARLO:");
  console.log("1. Inicia sesión en Google con: " + user);
  console.log("2. Entra a: https://myaccount.google.com/apppasswords (requiere Verificación en 2 pasos)");
  console.log("3. Escribe como nombre de app: 'Inmobiliaria Conte'");
  console.log("4. Haz clic en 'Crear' y copia la clave amarilla de 16 caracteres.");
  console.log("5. Pégala en tu archivo .env en EMAIL_PASS.");
  console.log("6. Vuelve a ejecutar: npm run email:test\n");
  process.exit(1);
}
