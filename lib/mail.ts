import nodemailer from "nodemailer";

type ResetEmailParams = {
  to: string;
  resetUrl: string;
  accountLabel: string;
};

export async function sendPasswordResetEmail({
  to,
  resetUrl,
  accountLabel,
}: ResetEmailParams) {
  const host = process.env.SMTP_HOST || "";
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER || "";
  const pass = process.env.SMTP_PASS || "";
  const from = process.env.SMTP_FROM || user;

  if (!host || !user || !pass || !from) {
    console.warn("SMTP_NOT_CONFIGURED");
    return;
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: {
      user,
      pass,
    },
  });

  await transporter.sendMail({
    from,
    to,
    subject: "Recupera tu clave de UWA",
    html: `
      <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;">
        <h2 style="margin:0 0 12px;">Recupera tu clave</h2>
        <p>Recibimos una solicitud para recuperar la clave de tu cuenta ${accountLabel}.</p>
        <p>Presiona el siguiente botón para crear una nueva clave:</p>
        <p style="margin:28px 0;">
          <a href="${resetUrl}" style="background:#10B557;color:white;padding:14px 20px;border-radius:14px;text-decoration:none;font-weight:700;">
            Crear nueva clave
          </a>
        </p>
        <p>Este enlace vence en 30 minutos.</p>
        <p style="color:#666;font-size:13px;">Si no solicitaste esto, puedes ignorar este correo.</p>
      </div>
    `,
  });
}
