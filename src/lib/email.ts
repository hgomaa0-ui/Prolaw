import nodemailer from 'nodemailer';

const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM } = process.env;

if (!SMTP_HOST) {
  console.warn('SMTP env vars not set; email sending disabled');
}

export async function sendMail(to: string, subject: string, html: string) {
  if (!SMTP_HOST) {
    console.warn('SMTP not configured; skipping email to', to);
    return;
  }
  const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT) || 587,
    secure: Number(SMTP_PORT) === 465,
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
  });
  try {
    const info = await transporter.sendMail({ from: SMTP_USER, to, subject, html });
    console.log('Email sent to', to, 'MessageId:', info.messageId);
  } catch (err) {
    console.error('Email error:', (err as Error).message);
  }
}
