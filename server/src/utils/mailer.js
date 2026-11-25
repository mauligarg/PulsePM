const nodemailer = require('nodemailer');
const { google } = require('googleapis');
const env = require('../config/env');

let smtpTransporter = null;

if (env.NODE_ENV !== 'production' && env.SMTP.HOST && env.SMTP.USER) {
  smtpTransporter = nodemailer.createTransport({
    host: env.SMTP.HOST,
    port: env.SMTP.PORT,
    secure: env.SMTP.PORT === 465,
    family: 4,
    connectionTimeout: 5000,
    greetingTimeout: 5000,
    socketTimeout: 8000,
    auth: {
      user: env.SMTP.USER,
      pass: env.SMTP.PASS
    }
  });
}

const REQUIRED_GMAIL_KEYS = [
  ['GMAIL_CLIENT_ID', () => env.GMAIL.CLIENT_ID],
  ['GMAIL_CLIENT_SECRET', () => env.GMAIL.CLIENT_SECRET],
  ['GMAIL_REFRESH_TOKEN', () => env.GMAIL.REFRESH_TOKEN],
  ['GMAIL_USER', () => env.GMAIL.USER]
];

const getMissingGmailVars = () =>
  REQUIRED_GMAIL_KEYS.filter(([, getter]) => !String(getter() || '').trim()).map(([key]) => key);

const hasGmailConfig = () => getMissingGmailVars().length === 0;

const hasAnyGmailConfig = () =>
  REQUIRED_GMAIL_KEYS.some(([, getter]) => Boolean(String(getter() || '').trim()));

/**
 * Initializes Google OAuth2 client with refresh token and returns Gmail v1 client.
 */
const createGmailClient = () => {
  const missing = getMissingGmailVars();
  if (missing.length > 0) {
    throw new Error(`Missing Gmail API credentials: ${missing.join(', ')}`);
  }

  const oauth2Client = new google.auth.OAuth2(
    env.GMAIL.CLIENT_ID,
    env.GMAIL.CLIENT_SECRET
  );
  oauth2Client.setCredentials({
    refresh_token: env.GMAIL.REFRESH_TOKEN
  });

  return google.gmail({ version: 'v1', auth: oauth2Client });
};

/**
 * Encodes an HTML email as a Base64URL RFC 2822 MIME message with UTF-8 subject and body.
 */
const encodeMimeMessage = ({ from, to, subject, html }) => {
  const encodedSubject = `=?UTF-8?B?${Buffer.from(subject, 'utf8').toString('base64')}?=`;
  const encodedBody = Buffer.from(html, 'utf8').toString('base64');

  const mimeLines = [
    `From: "PulsePM Team" <${from}>`,
    `To: ${to}`,
    `Subject: ${encodedSubject}`,
    'MIME-Version: 1.0',
    'Content-Type: text/html; charset="UTF-8"',
    'Content-Transfer-Encoding: base64',
    '',
    encodedBody
  ];

  return Buffer.from(mimeLines.join('\r\n'), 'utf8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
};

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
 * Sends a workspace invitation email.
 * Priority:
 * 1. Google Gmail API over HTTPS (GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, GMAIL_REFRESH_TOKEN, GMAIL_USER)
 * 2. Local development Nodemailer SMTP fallback (only when NODE_ENV !== 'production')
 * 3. Console fallback
 */
const sendInviteEmail = async ({ to, workspaceName, inviterName, inviteLink }) => {
  if (!isValidEmail(to)) {
    const msg = 'Invalid recipient email address';
    console.error(`[Mailer] ${msg}`);
    return { sent: false, error: msg, inviteLink };
  }

  const subject = `You've been invited to join ${workspaceName} on PulsePM`;
  const html = buildInviteHtml({ workspaceName, inviterName, inviteLink });

  // 1. Gmail API (HTTPS port 443 — works on Render Free tier)
  if (hasGmailConfig()) {
    try {
      const gmail = createGmailClient();
      const raw = encodeMimeMessage({
        from: env.GMAIL.USER,
        to: to.trim(),
        subject,
        html
      });

      const response = await gmail.users.messages.send({
        userId: 'me',
        requestBody: { raw }
      });

      return {
        sent: true,
        provider: 'gmail-api',
        messageId: response?.data?.id || ''
      };
    } catch (error) {
      // Log only safe error metadata — never log OAuth client secrets or refresh tokens
      const safeMsg =
        error?.response?.data?.error?.message ||
        error?.response?.data?.error_description ||
        error?.message ||
        'Gmail API request failed';
      console.error(`[Mailer:GmailAPI] Failed to send invitation email: ${safeMsg}`);
      return { sent: false, provider: 'gmail-api', error: safeMsg, inviteLink };
    }
  }

  if (hasAnyGmailConfig()) {
    const missing = getMissingGmailVars();
    const errMsg = `Incomplete Gmail API credentials. Missing: ${missing.join(', ')}`;
    console.error(`[Mailer:GmailAPI] ${errMsg}`);
    return { sent: false, provider: 'gmail-api', error: errMsg, inviteLink };
  }

  // 2. Local dev Nodemailer SMTP fallback (never attempted in production)
  if (env.NODE_ENV !== 'production' && smtpTransporter) {
    try {
      const info = await smtpTransporter.sendMail({
        from: `"PulsePM Team" <${env.SMTP.FROM}>`,
        to: to.trim(),
        subject,
        html
      });
      return { sent: true, provider: 'smtp', messageId: info.messageId };
    } catch (error) {
      console.error('Failed to send email via SMTP, logging link:', error.message);
      return { sent: false, provider: 'smtp', error: error.message, inviteLink };
    }
  }

  // 3. Console fallback
  console.log('\n======================================================');
  console.log('📨 [MAILER FALLBACK - NO GMAIL API CREDENTIALS CONFIGURED]');
  console.log(`To: ${to}`);
  console.log(`Workspace: ${workspaceName}`);
  console.log(`Invited By: ${inviterName}`);
  console.log(`Invitation Link: ${inviteLink}`);
  console.log('======================================================\n');
  return { sent: false, loggedToConsole: true, inviteLink };
};

module.exports = {
  sendInviteEmail,
  createGmailClient,
  encodeMimeMessage,
  buildInviteHtml,
  hasGmailConfig,
  getMissingGmailVars
};
