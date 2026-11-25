/**
 * Gmail API & Mailer Verification Suite
 *
 * Run with: npm --prefix server run test:mailer
 * Uses mocked googleapis OAuth2 / users.messages.send when real Gmail credentials
 * are not configured so all 10 checks execute safely without emailing random addresses.
 */

const assert = require('assert');
const { google } = require('googleapis');
const env = require('../config/env');
const mailer = require('../utils/mailer');

const results = [];
const record = (name, passed, details = '') => {
  results.push({ Test: name, Status: passed ? '✅ PASS' : '❌ FAIL', Details: details });
};

async function run() {
  console.log('\n=============================================================');
  console.log('🧪 STARTING GMAIL API & MAILER VERIFICATION SUITE');
  console.log('=============================================================\n');

  // Snapshot original env config
  const origGmail = { ...env.GMAIL };
  const origNodeEnv = env.NODE_ENV;
  const origGmailFn = google.gmail;
  const origConsoleError = console.error;

  try {
    // 1. Backend app module loads cleanly
    const app = require('../app');
    record('1. Backend App Loads', typeof app === 'function', 'Express app initialized');

    // 2 & 3. Gmail OAuth2 client initialization & refresh-token auth
    env.GMAIL.CLIENT_ID = 'test-client-id.apps.googleusercontent.com';
    env.GMAIL.CLIENT_SECRET = 'test-client-secret-value';
    env.GMAIL.REFRESH_TOKEN = '1//test-refresh-token-value';
    env.GMAIL.USER = 'sender@gmail.com';

    let capturedAuth = null;
    let capturedSendArgs = null;
    google.gmail = ({ version, auth }) => {
      capturedAuth = auth;
      return {
        users: {
          messages: {
            send: async (args) => {
              capturedSendArgs = args;
              return { data: { id: 'mock-gmail-msg-123' } };
            }
          }
        }
      };
    };

    const client = mailer.createGmailClient();
    assert(client && capturedAuth, 'Gmail client and auth should be initialized');
    assert.strictEqual(capturedAuth.credentials.refresh_token, '1//test-refresh-token-value');
    record('2. Gmail OAuth2 Client Init', true, 'OAuth2 client created');
    record('3. Refresh-Token Auth', true, 'refresh_token set on OAuth2 client');

    // 4 & 5. Gmail API sends workspace invitation email with userId: 'me'
    const res = await mailer.sendInviteEmail({
      to: 'teammate@example.com',
      workspaceName: 'Acme Corp 🚀',
      inviterName: 'Dhruv Owner',
      inviteLink: 'https://pulsepm-saas.vercel.app/invites/accept?token=abc123'
    });
    assert.strictEqual(res.sent, true);
    assert.strictEqual(res.provider, 'gmail-api');
    assert.strictEqual(res.messageId, 'mock-gmail-msg-123');
    assert.strictEqual(capturedSendArgs.userId, 'me');
    assert(typeof capturedSendArgs.requestBody.raw === 'string' && capturedSendArgs.requestBody.raw.length > 0);
    record('4. Gmail API users.messages.send', true, 'userId="me", messageId returned');
    record('5. Workspace Invite Email', true, 'provider="gmail-api"');

    // 6. Verify MIME, Base64URL, UTF-8 subject, and preserved HTML design
    const base64Std = capturedSendArgs.requestBody.raw.replace(/-/g, '+').replace(/_/g, '/');
    const rawMime = Buffer.from(base64Std, 'base64').toString('utf8');
    assert(!capturedSendArgs.requestBody.raw.includes('+'));
    assert(!capturedSendArgs.requestBody.raw.includes('/'));
    assert(!capturedSendArgs.requestBody.raw.includes('='));
    assert(rawMime.includes('Subject: =?UTF-8?B?'));
    assert(rawMime.includes('Content-Type: text/html; charset="UTF-8"'));
    const bodyBase64 = rawMime.split('\r\n\r\n')[1];
    const decodedHtml = Buffer.from(bodyBase64, 'base64').toString('utf8');
    assert(decodedHtml.includes('Workspace Invitation'));
    assert(decodedHtml.includes('Acme Corp 🚀'));
    assert(decodedHtml.includes('Dhruv Owner'));
    assert(decodedHtml.includes('https://pulsepm-saas.vercel.app/invites/accept?token=abc123'));
    assert(decodedHtml.includes('48 hours'));
    record('6. HTML + UTF-8 + Base64URL MIME', true, 'Subject & HTML verified');

    // 7. Invalid recipient error handling
    const invalidRes = await mailer.sendInviteEmail({
      to: 'invalid-email',
      workspaceName: 'Acme Corp',
      inviterName: 'Dhruv',
      inviteLink: 'https://pulsepm-saas.vercel.app/invites/accept?token=abc123'
    });
    assert.strictEqual(invalidRes.sent, false);
    assert(invalidRes.error.includes('Invalid recipient'));
    record('7. Invalid Recipient Handled', true, invalidRes.error);

    // 8. Gmail API failure logged safely (no secrets leaked)
    const loggedMessages = [];
    console.error = (...args) => loggedMessages.push(args.join(' '));
    google.gmail = () => ({
      users: {
        messages: {
          send: async () => {
            throw new Error('invalid_grant: Token has been expired or revoked.');
          }
        }
      }
    });
    const failRes = await mailer.sendInviteEmail({
      to: 'teammate@example.com',
      workspaceName: 'Acme Corp',
      inviterName: 'Dhruv',
      inviteLink: 'https://pulsepm-saas.vercel.app/invites/accept?token=abc123'
    });
    console.error = origConsoleError;
    assert.strictEqual(failRes.sent, false);
    assert(failRes.error.includes('invalid_grant'));
    const combinedLogs = loggedMessages.join('\n');
    assert(!combinedLogs.includes(env.GMAIL.CLIENT_SECRET));
    assert(!combinedLogs.includes(env.GMAIL.REFRESH_TOKEN));
    record('8. Gmail API Failure Logged Safely', true, 'No secrets in logs');

    // 9. Missing/incomplete Gmail credentials produce clear error
    env.GMAIL.REFRESH_TOKEN = '';
    env.GMAIL.CLIENT_SECRET = '';
    const partialRes = await mailer.sendInviteEmail({
      to: 'teammate@example.com',
      workspaceName: 'Acme Corp',
      inviterName: 'Dhruv',
      inviteLink: 'https://pulsepm-saas.vercel.app/invites/accept?token=abc123'
    });
    assert.strictEqual(partialRes.sent, false);
    assert(partialRes.error.includes('GMAIL_CLIENT_SECRET'));
    assert(partialRes.error.includes('GMAIL_REFRESH_TOKEN'));
    record('9. Missing Credentials Clear Error', true, partialRes.error);

    // 10. Production mode never attempts SMTP when Gmail API is unset
    env.NODE_ENV = 'production';
    env.GMAIL.CLIENT_ID = '';
    env.GMAIL.USER = '';
    const prodFallback = await mailer.sendInviteEmail({
      to: 'teammate@example.com',
      workspaceName: 'Acme Corp',
      inviterName: 'Dhruv',
      inviteLink: 'https://pulsepm-saas.vercel.app/invites/accept?token=abc123'
    });
    assert.strictEqual(prodFallback.sent, false);
    assert.strictEqual(prodFallback.loggedToConsole, true);
    record('10. Production Never Uses SMTP', true, 'Console fallback when Gmail unset');

    console.table(results);
    console.log('\n🎉 ALL 10 GMAIL API & MAILER CHECKS PASSED!\n');
  } catch (err) {
    console.error = origConsoleError;
    console.error('Mailer test failed:', err);
    process.exitCode = 1;
  } finally {
    Object.assign(env.GMAIL, origGmail);
    env.NODE_ENV = origNodeEnv;
    google.gmail = origGmailFn;
    console.error = origConsoleError;
  }
}

run();
