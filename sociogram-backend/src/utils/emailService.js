import nodemailer from 'nodemailer';

let transporter = null;

async function getTransporter() {
  if (transporter) return transporter;

  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT || 587,
      secure: process.env.SMTP_PORT == 465,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  } else {
    // Development fallback
    console.log('[Email] No SMTP config found. Generating Ethereal test account...');
    const testAccount = await nodemailer.createTestAccount();
    transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });
  }
  return transporter;
}

export async function sendEmail({ to, subject, html }) {
  try {
    const tp = await getTransporter();
    const info = await tp.sendMail({
      from: '"Sociogram" <noreply@sociogram.app>',
      to,
      subject,
      html,
    });
    
    // If using Ethereal, log the preview URL
    if (info.messageId && !process.env.SMTP_HOST) {
      console.log(`[Email] Preview URL: ${nodemailer.getTestMessageUrl(info)}`);
    }
    return info;
  } catch (err) {
    console.error('[Email] Failed to send email:', err.message);
  }
}
