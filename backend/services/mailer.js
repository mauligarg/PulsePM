const env = require('../config/env');

const isValidEmail = (email) =>
  typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

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

const buildPasswordResetHtml = ({ userName, resetLink, expiresInMinutes = 20 }) => `
  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #0f172a;">
    <h2 style="color: #2563eb; margin-bottom: 12px;">Reset Your PulsePM Password</h2>
    <p>Hi ${userName || 'there'},</p>
    <p>We received a request to reset the password for your PulsePM account. Click the button below to choose a new password:</p>
    <p style="margin: 24px 0;">
      <a href="${resetLink}" style="background-color: #2563eb; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
        Reset Password
      </a>
    </p>
    <p style="color: #64748b; font-size: 13px;">This link will expire in ${expiresInMinutes} minutes and can only be used once. If you did not request a password reset, you can safely ignore this email.</p>
  </div>
`;

/**
 * Shared email sender using Brevo HTTPS API (port 443) with dev console fallback.
 */
const sendEmail = async ({ to, subject, html, devFallbackInfo }) => {
  if (!isValidEmail(to)) {
    const msg = 'Invalid recipient email address';
    console.error(`[Mailer] ${msg}`);
    return { sent: false, error: msg };
  }

  if (!env.BREVO_API_KEY) {
    if (env.NODE_ENV !== 'production') {
      console.log('\n======================================================');
      console.log('📨 [MAILER FALLBACK - BREVO_API_KEY NOT CONFIGURED]');
      console.log(`To: ${to}`);
      console.log(`Subject: ${subject}`);
      if (devFallbackInfo) console.log(devFallbackInfo);
      console.log('======================================================\n');
    } else {
      console.warn('[Mailer] BREVO_API_KEY is not configured in production');
    }
    return { sent: false, loggedToConsole: env.NODE_ENV !== 'production' };
  }

  try {
    const resp = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'api-key': env.BREVO_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        sender: { name: 'PulsePM Team', email: env.EMAIL_FROM },
        to: [{ email: to.trim() }],
        subject,
        htmlContent: html
      })
    });

    const body = await resp.json().catch(() => ({}));
    if (resp.ok) {
      return { sent: true, provider: 'brevo', messageId: body.messageId || '' };
    }

    const errMsg = body?.message || `Brevo API error (${resp.status})`;
    console.error(`[Mailer:Brevo] ${errMsg}`);
    return { sent: false, provider: 'brevo', error: errMsg };
  } catch (error) {
    console.error(`[Mailer:Brevo] Request failed: ${error.message}`);
    return { sent: false, provider: 'brevo', error: error.message };
  }
};

/**
 * Sends a workspace invitation email via Brevo HTTPS API (port 443).
 * Falls back to console logging when BREVO_API_KEY is not configured.
 */
const sendInviteEmail = async ({ to, workspaceName, inviterName, inviteLink }) => {
  const subject = `You've been invited to join ${workspaceName} on PulsePM`;
  const html = buildInviteHtml({ workspaceName, inviterName, inviteLink });
  const result = await sendEmail({
    to,
    subject,
    html,
    devFallbackInfo: `Workspace: ${workspaceName}\nInvited By: ${inviterName}\nInvitation Link: ${inviteLink}`
  });

  return result.sent ? result : { ...result, inviteLink };
};

/**
 * Sends a password reset email via Brevo HTTPS API (port 443).
 * Never exposes the reset token in production logs.
 */
const sendPasswordResetEmail = async ({ to, userName, resetLink, expiresInMinutes = 20 }) => {
  const subject = 'Reset your PulsePM password';
  const html = buildPasswordResetHtml({ userName, resetLink, expiresInMinutes });
  return sendEmail({
    to,
    subject,
    html,
    devFallbackInfo: `Password Reset Link: ${resetLink}`
  });
};

module.exports = {
  sendInviteEmail,
  sendPasswordResetEmail,
  buildInviteHtml,
  buildPasswordResetHtml
};
