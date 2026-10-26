const nodemailer = require('nodemailer');
const env = require('../config/env');

let transporter = null;

if (env.SMTP.HOST && env.SMTP.USER) {
  transporter = nodemailer.createTransport({
    host: env.SMTP.HOST,
    port: env.SMTP.PORT,
    secure: env.SMTP.PORT === 465,
    auth: {
      user: env.SMTP.USER,
      pass: env.SMTP.PASS
    }
  });
}

/**
 * Sends a workspace invitation email.
 * If SMTP is not configured, logs the link cleanly to the console.
 * 
 * @param {Object} options
 * @param {string} options.to - Recipient email
 * @param {string} options.workspaceName
 * @param {string} options.inviterName
 * @param {string} options.inviteLink
 */
const sendInviteEmail = async ({ to, workspaceName, inviterName, inviteLink }) => {
  if (!transporter) {
    console.log('\n======================================================');
    console.log('📨 [DEV NODEMAILER - SMTP NOT CONFIGURED]');
    console.log(`To: ${to}`);
    console.log(`Workspace: ${workspaceName}`);
    console.log(`Invited By: ${inviterName}`);
    console.log(`Invitation Link: ${inviteLink}`);
    console.log('======================================================\n');
    return { sent: false, loggedToConsole: true, inviteLink };
  }

  try {
    const info = await transporter.sendMail({
      from: `"SaaS PM Team" <${env.SMTP.FROM}>`,
      to,
      subject: `You've been invited to join ${workspaceName} on SaaS PM`,
      html: `
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
      `
    });
    return { sent: true, messageId: info.messageId };
  } catch (error) {
    console.error('Failed to send email via SMTP, logging link:', error.message);
    return { sent: false, error: error.message, inviteLink };
  }
};

module.exports = {
  sendInviteEmail
};
