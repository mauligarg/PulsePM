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

/**
 * Sends a workspace invitation email via Brevo HTTPS API (port 443).
 * Falls back to console logging when BREVO_API_KEY is not configured.
 */
const sendInviteEmail = async ({ to, workspaceName, inviterName, inviteLink }) => {
  if (!isValidEmail(to)) {
    const msg = 'Invalid recipient email address';
    console.error(`[Mailer] ${msg}`);
    return { sent: false, error: msg, inviteLink };
  }

  const subject = `You've been invited to join ${workspaceName} on PulsePM`;
  const html = buildInviteHtml({ workspaceName, inviterName, inviteLink });

  if (!env.BREVO_API_KEY) {
    console.log('\n======================================================');
    console.log('📨 [MAILER FALLBACK - BREVO_API_KEY NOT CONFIGURED]');
    console.log(`To: ${to}`);
    console.log(`Workspace: ${workspaceName}`);
    console.log(`Invited By: ${inviterName}`);
    console.log(`Invitation Link: ${inviteLink}`);
    console.log('======================================================\n');
    return { sent: false, loggedToConsole: true, inviteLink };
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
    return { sent: false, provider: 'brevo', error: errMsg, inviteLink };
  } catch (error) {
    console.error(`[Mailer:Brevo] Request failed: ${error.message}`);
    return { sent: false, provider: 'brevo', error: error.message, inviteLink };
  }
};

module.exports = {
  sendInviteEmail,
  buildInviteHtml
};
