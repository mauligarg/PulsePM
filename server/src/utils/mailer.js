const nodemailer = require('nodemailer');
const env = require('../config/env');

let transporter = null;

if (env.SMTP.HOST && env.SMTP.USER) {
  transporter = nodemailer.createTransport({
    host: env.SMTP.HOST,
    port: env.SMTP.PORT,
    secure: env.SMTP.PORT === 465,
    connectionTimeout: 5000,
    greetingTimeout: 5000,
    socketTimeout: 8000,
    auth: {
      user: env.SMTP.USER,
      pass: env.SMTP.PASS
    }
  });
}

const buildInviteHtml = ({ workspaceName, inviterName, inviteLink }) => `
  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
    <h2 style="color: #2563eb;">Workspace Invitation</h2>
    <p>Hi,</p>
    <p><strong>${inviterName}</strong> has invited you to collaborate in the workspace <strong>${workspaceName}</strong>.</p>
    <p style="margin: 24px 0;">
      <a href="${inviteLink}" style="background-color: #2563eb; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
        Accept Invitation
      </a>
    </p>
    <p style="color: #64748b; font-size: 13px;">This invitation will expire in 48 hours. If you did not expect this invitation, you can ignore this email.</p>
  </div>
`;

/**
 * Sends a workspace invitation email.
 * Priority:
 * 1. Resend HTTPS API (RESEND_API_KEY) — works on Render free tier (port 443)
 * 2. Brevo HTTPS API (BREVO_API_KEY) — works on Render free tier (port 443)
 * 3. Nodemailer SMTP (SMTP_HOST/USER/PASS) — works locally or on hosts allowing port 587/465
 * 4. Console fallback
 */
const sendInviteEmail = async ({ to, workspaceName, inviterName, inviteLink }) => {
  const subject = `You've been invited to join ${workspaceName} on PulsePM`;
  const html = buildInviteHtml({ workspaceName, inviterName, inviteLink });

  // 1. Resend HTTPS API (bypasses Render free-tier SMTP port block)
  if (env.RESEND_API_KEY) {
    try {
      const resp = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${env.RESEND_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: env.SMTP.FROM || 'PulsePM <onboarding@resend.dev>',
          to: [to],
          subject,
          html
        })
      });
      const body = await resp.json().catch(() => ({}));
      if (resp.ok) {
        return { sent: true, provider: 'resend', messageId: body.id };
      }
      console.error('Resend API error:', body);
    } catch (err) {
      console.error('Resend request failed:', err.message);
    }
  }

  // 2. Brevo HTTPS API (bypasses Render free-tier SMTP port block, allows any verified sender)
  if (env.BREVO_API_KEY) {
    try {
      const resp = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'api-key': env.BREVO_API_KEY,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          sender: { name: 'PulsePM Team', email: env.SMTP.FROM || env.SMTP.USER },
          to: [{ email: to }],
          subject,
          htmlContent: html
        })
      });
      const body = await resp.json().catch(() => ({}));
      if (resp.ok) {
        return { sent: true, provider: 'brevo', messageId: body.messageId };
      }
      console.error('Brevo API error:', body);
    } catch (err) {
      console.error('Brevo request failed:', err.message);
    }
  }

  // 3. Nodemailer SMTP
  if (!transporter) {
    console.log('\n======================================================');
    console.log('📨 [DEV NODEMAILER - NO EMAIL PROVIDER CONFIGURED]');
    console.log(`To: ${to}`);
    console.log(`Workspace: ${workspaceName}`);
    console.log(`Invited By: ${inviterName}`);
    console.log(`Invitation Link: ${inviteLink}`);
    console.log('======================================================\n');
    return { sent: false, loggedToConsole: true, inviteLink };
  }

  try {
    const info = await transporter.sendMail({
      from: `"PulsePM Team" <${env.SMTP.FROM}>`,
      to,
      subject,
      html
    });
    return { sent: true, provider: 'smtp', messageId: info.messageId };
  } catch (error) {
    console.error('Failed to send email via SMTP, logging link:', error.message);
    return { sent: false, error: error.message, inviteLink };
  }
};

module.exports = {
  sendInviteEmail
};
