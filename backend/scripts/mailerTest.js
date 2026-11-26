/**
 * Brevo Mailer Verification Suite
 * Run with: npm --prefix server run test:mailer
 */

const assert = require('assert');
const env = require('../config/env');
const { sendInviteEmail } = require('../services/mailer');

const results = [];
const record = (name, passed, details = '') => {
  results.push({ Test: name, Status: passed ? '✅ PASS' : '❌ FAIL', Details: details });
};

async function run() {
  const origKey = env.BREVO_API_KEY;
  const origFrom = env.EMAIL_FROM;
  const origFetch = global.fetch;
  const origConsoleError = console.error;

  try {
    // 1. Sends invite via Brevo HTTPS API
    env.BREVO_API_KEY = 'xkeysib-test-secret-key';
    env.EMAIL_FROM = 'mauligarg0727@gmail.com';
    let capturedCall = null;
    global.fetch = async (url, opts) => {
      capturedCall = { url, opts };
      return {
        ok: true,
        status: 201,
        json: async () => ({ messageId: '<brevo-123@relay>' })
      };
    };

    const okRes = await sendInviteEmail({
      to: 'teammate@example.com',
      workspaceName: 'Acme Corp',
      inviterName: 'Mauli',
      inviteLink: 'https://pulsepm-saas.vercel.app/invites/accept?token=abc'
    });
    assert.strictEqual(okRes.sent, true);
    assert.strictEqual(okRes.provider, 'brevo');
    assert.strictEqual(capturedCall.url, 'https://api.brevo.com/v3/smtp/email');
    assert.strictEqual(capturedCall.opts.headers['api-key'], 'xkeysib-test-secret-key');
    const body = JSON.parse(capturedCall.opts.body);
    assert(body.htmlContent.includes('48 hours'));
    assert(body.htmlContent.includes('Acme Corp'));
    record('1. Brevo HTTPS Send', true, 'messageId returned');

    // 2. Invalid recipient rejected
    const badRes = await sendInviteEmail({
      to: 'not-an-email',
      workspaceName: 'Acme Corp',
      inviterName: 'Mauli',
      inviteLink: 'https://pulsepm-saas.vercel.app/invites/accept?token=abc'
    });
    assert.strictEqual(badRes.sent, false);
    record('2. Invalid Recipient Rejected', true, badRes.error);

    // 3. Brevo API error logged safely without leaking BREVO_API_KEY
    const logs = [];
    console.error = (...a) => logs.push(a.join(' '));
    global.fetch = async () => ({
      ok: false,
      status: 401,
      json: async () => ({ message: 'Key not found' })
    });
    const errRes = await sendInviteEmail({
      to: 'teammate@example.com',
      workspaceName: 'Acme Corp',
      inviterName: 'Mauli',
      inviteLink: 'https://pulsepm-saas.vercel.app/invites/accept?token=abc'
    });
    console.error = origConsoleError;
    assert.strictEqual(errRes.sent, false);
    assert(!logs.join('\n').includes(env.BREVO_API_KEY));
    record('3. Safe Error Logging', true, errRes.error);

    // 4. Console fallback when BREVO_API_KEY is unset
    env.BREVO_API_KEY = '';
    const fbRes = await sendInviteEmail({
      to: 'teammate@example.com',
      workspaceName: 'Acme Corp',
      inviterName: 'Mauli',
      inviteLink: 'https://pulsepm-saas.vercel.app/invites/accept?token=abc'
    });
    assert.strictEqual(fbRes.sent, false);
    assert.strictEqual(fbRes.loggedToConsole, true);
    record('4. Console Fallback', true, 'loggedToConsole=true');

    console.table(results);
    console.log('🎉 ALL 4 BREVO MAILER CHECKS PASSED!\n');
  } finally {
    env.BREVO_API_KEY = origKey;
    env.EMAIL_FROM = origFrom;
    global.fetch = origFetch;
    console.error = origConsoleError;
  }
}

run();
