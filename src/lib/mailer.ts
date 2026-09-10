import nodemailer from "nodemailer";

/**
 * Transporte SMTP (Google Workspace / Gmail).
 * Variables de entorno necesarias (.env):
 *   SMTP_HOST      ej. smtp.gmail.com
 *   SMTP_PORT      ej. 587 (STARTTLS) o 465 (SSL)
 *   SMTP_USER      casilla real del dominio, ej. no-reply@hermanascaradonti.com
 *   SMTP_PASS      App Password de 16 caracteres (requiere 2FA en esa cuenta)
 *   EMAIL_FROM     remitente visible, ej. "Shop <no-reply@hermanascaradonti.com>"
 *   APP_URL        base para armar los links, ej. https://shop.hermanascaradonti.com
 */

function getConfig() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT ?? 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!host || !user || !pass) {
    throw new Error(
      "SMTP no configurado. Definí SMTP_HOST, SMTP_USER y SMTP_PASS en las variables de entorno."
    );
  }
  return { host, port, user, pass };
}

export function getBaseUrl(): string {
  return (
    process.env.APP_URL ??
    process.env.NEXTAUTH_URL ??
    "http://localhost:3000"
  ).replace(/\/$/, "");
}

function crearTransporter() {
  const { host, port, user, pass } = getConfig();
  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465, // 465 = SSL; 587 = STARTTLS
    auth: { user, pass },
  });
}

async function enviar(to: string, subject: string, html: string, text: string) {
  const transporter = crearTransporter();
  const from = process.env.EMAIL_FROM ?? process.env.SMTP_USER!;
  await transporter.sendMail({ from, to, subject, html, text });
}

function layout(titulo: string, cuerpo: string, cta: { label: string; url: string }) {
  return `
  <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#1a1a1a">
    <h1 style="font-size:20px;margin:0 0 16px">${titulo}</h1>
    <div style="font-size:14px;line-height:1.6;color:#444">${cuerpo}</div>
    <div style="margin:28px 0">
      <a href="${cta.url}" style="display:inline-block;background:#111;color:#fff;text-decoration:none;padding:12px 22px;border-radius:8px;font-size:14px;font-weight:600">${cta.label}</a>
    </div>
    <p style="font-size:12px;color:#888;line-height:1.5">
      Si el botón no funciona, copiá y pegá este enlace en tu navegador:<br>
      <span style="word-break:break-all">${cta.url}</span>
    </p>
  </div>`;
}

/** Mail de invitación: el usuario define su contraseña por primera vez. */
export async function enviarInvitacion(email: string, nombre: string | null, link: string) {
  const saludo = nombre ? `Hola ${nombre},` : "Hola,";
  const html = layout(
    "Te invitaron al sistema Shop",
    `<p>${saludo}</p><p>Se creó una cuenta para vos en el sistema de gestión del Shop. Para activarla, definí tu contraseña con el siguiente botón. El enlace vence en 72 horas.</p>`,
    { label: "Definir contraseña", url: link }
  );
  const text = `${saludo}\n\nSe creó una cuenta para vos en el Shop. Definí tu contraseña acá (vence en 72 h):\n${link}`;
  await enviar(email, "Invitación al sistema Shop", html, text);
}

/** Mail de recuperación de contraseña. */
export async function enviarReset(email: string, nombre: string | null, link: string) {
  const saludo = nombre ? `Hola ${nombre},` : "Hola,";
  const html = layout(
    "Restablecer tu contraseña",
    `<p>${saludo}</p><p>Recibimos un pedido para restablecer la contraseña de tu cuenta del Shop. Si fuiste vos, usá el botón de abajo. El enlace vence en 1 hora.</p><p>Si no lo pediste, podés ignorar este mail.</p>`,
    { label: "Restablecer contraseña", url: link }
  );
  const text = `${saludo}\n\nPediste restablecer tu contraseña del Shop. Enlace (vence en 1 h):\n${link}\n\nSi no lo pediste, ignorá este mail.`;
  await enviar(email, "Restablecer contraseña — Shop", html, text);
}
