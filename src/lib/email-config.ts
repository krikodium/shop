/**
 * Interruptor único del subsistema de email (invitaciones / reset).
 * Mientras esté apagado, las rutas relacionadas responden 503 y no
 * ejecutan ningún trabajo: ni crean tokens ni intentan enviar mails.
 *
 * Se enciende poniendo NEXT_PUBLIC_EMAIL_ENABLED="true" y completando
 * SMTP_USER / SMTP_PASS.
 */
export const EMAIL_ENABLED = process.env.NEXT_PUBLIC_EMAIL_ENABLED === "true";

export function emailDeshabilitadoResponse() {
  return Response.json(
    { error: "El envío de mails está deshabilitado en esta instalación." },
    { status: 503 }
  );
}
