const assert = require('assert');
const http = require('http');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../app');
const User = require('../models/User');
const { hashToken } = require('../utils/tokens');

const request = (baseUrl, method, path, body, token, headers = {}) =>
  fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers
    },
    body: body ? JSON.stringify(body) : undefined
  }).then(async (res) => ({
    status: res.status,
    data: await res.json().catch(() => ({}))
  }));

async function run() {
  const mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());

  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  const baseUrl = `http://127.0.0.1:${port}`;

  try {
    // 1. Weak password rejection on signup
    const weakPasswords = ['Short1!', 'lowercase1!', 'UPPERCASE1!', 'NoNumbers!!', 'NoSpecial123'];
    for (const pw of weakPasswords) {
      const res = await request(baseUrl, 'POST', '/api/auth/register', {
        name: 'Test User',
        email: 'weak@example.com',
        password: pw
      });
      assert.strictEqual(res.status, 400, `Expected weak password "${pw}" to be rejected`);
      assert.strictEqual(res.data.success, false);
    }
    console.log('✓ Weak password rejection passed (5/5 cases)');

    // 2. Strong password acceptance on signup
    const strongPw1 = 'PulsePM#2026';
    const regRes = await request(baseUrl, 'POST', '/api/auth/register', {
      name: 'Mauli Test',
      email: 'mauli.test@example.com',
      password: strongPw1
    });
    assert.strictEqual(regRes.status, 201);
    assert.ok(regRes.data.data.token, 'Expected JWT token on registration');
    const oldSessionToken = regRes.data.data.token;
    console.log('✓ Strong password signup passed');

    // 3. Forgot password with unregistered email returns generic 200
    const unregRes = await request(baseUrl, 'POST', '/api/auth/forgot-password', {
      email: 'nonexistent@example.com'
    });
    assert.strictEqual(unregRes.status, 200);
    assert.strictEqual(
      unregRes.data.message,
      'If an account exists with this email, you will receive a password reset link shortly.'
    );
    console.log('✓ Forgot password generic response for unregistered email passed');

    // 4. Forgot password with registered email stores hashed token + 20m expiry
    const forgotRes = await request(baseUrl, 'POST', '/api/auth/forgot-password', {
      email: 'mauli.test@example.com'
    });
    assert.strictEqual(forgotRes.status, 200);
    assert.strictEqual(forgotRes.data.message, unregRes.data.message);

    const userWithReset = await User.findOne({ email: 'mauli.test@example.com' }).select(
      '+resetPasswordTokenHash +resetPasswordExpiresAt'
    );
    assert.ok(userWithReset.resetPasswordTokenHash, 'Expected hashed reset token in DB');
    assert.ok(userWithReset.resetPasswordExpiresAt > new Date(), 'Expected future expiry');
    console.log('✓ Hashed reset token & expiration stored in DB');

    // 5. Simulate raw token verification & expired token rejection
    const rawToken = 'a'.repeat(64);
    userWithReset.resetPasswordTokenHash = hashToken(rawToken);
    userWithReset.resetPasswordExpiresAt = new Date(Date.now() - 1000); // expired
    await userWithReset.save({ validateBeforeSave: false });

    const expiredVerify = await request(
      baseUrl,
      'GET',
      `/api/auth/reset-password/verify?token=${rawToken}`
    );
    assert.strictEqual(expiredVerify.status, 400);

    const expiredReset = await request(baseUrl, 'POST', '/api/auth/reset-password', {
      token: rawToken,
      password: 'NewStrong#2026'
    });
    assert.strictEqual(expiredReset.status, 400);
    console.log('✓ Expired reset token rejected');

    // 6. Valid reset token -> verify -> reset password
    userWithReset.resetPasswordExpiresAt = new Date(Date.now() + 20 * 60 * 1000);
    await userWithReset.save({ validateBeforeSave: false });

    const validVerify = await request(
      baseUrl,
      'GET',
      `/api/auth/reset-password/verify?token=${rawToken}`
    );
    assert.strictEqual(validVerify.status, 200);

    // Weak password rejected on reset
    const weakReset = await request(baseUrl, 'POST', '/api/auth/reset-password', {
      token: rawToken,
      password: 'weak'
    });
    assert.strictEqual(weakReset.status, 400);

    // Strong password accepted on reset
    const strongPw2 = 'NewPulse#2026!';
    const resetRes = await request(baseUrl, 'POST', '/api/auth/reset-password', {
      token: rawToken,
      password: strongPw2
    });
    assert.strictEqual(resetRes.status, 200);
    console.log('✓ Valid reset token updated password');

    // 7. Reused reset token is rejected
    const reuseRes = await request(baseUrl, 'POST', '/api/auth/reset-password', {
      token: rawToken,
      password: 'Another#2026!'
    });
    assert.strictEqual(reuseRes.status, 400);
    console.log('✓ Reused reset token rejected');

    // 8. Existing session invalidated after password reset
    const oldSessionMe = await request(baseUrl, 'GET', '/api/auth/me', null, oldSessionToken);
    assert.strictEqual(oldSessionMe.status, 401);
    console.log('✓ Existing JWT session invalidated after password reset');

    // 9. Login with old password fails, login with new password succeeds
    const oldLogin = await request(baseUrl, 'POST', '/api/auth/login', {
      email: 'mauli.test@example.com',
      password: strongPw1
    });
    assert.strictEqual(oldLogin.status, 401);

    const newLogin = await request(baseUrl, 'POST', '/api/auth/login', {
      email: 'mauli.test@example.com',
      password: strongPw2
    });
    assert.strictEqual(newLogin.status, 200);
    const activeToken = newLogin.data.data.token;
    console.log('✓ Old password fails login; new password succeeds');

    // 10. Change password (authenticated)
    const changeRes = await request(
      baseUrl,
      'POST',
      '/api/auth/change-password',
      { currentPassword: strongPw2, newPassword: 'FinalPulse@2026' },
      activeToken
    );
    assert.strictEqual(changeRes.status, 200);
    assert.ok(changeRes.data.data.token);
    console.log('✓ Authenticated change-password succeeded');

    // 11. Rate limiting on /api/auth/forgot-password (max 5 per window)
    // We already made 2 requests above; 3 more should succeed, 6th should 429
    for (let i = 0; i < 3; i++) {
      const r = await request(baseUrl, 'POST', '/api/auth/forgot-password', {
        email: 'ratelimit@example.com'
      });
      assert.strictEqual(r.status, 200);
    }
    const rateLimited = await request(baseUrl, 'POST', '/api/auth/forgot-password', {
      email: 'ratelimit@example.com'
    });
    assert.strictEqual(rateLimited.status, 429);
    console.log('✓ Rate limiting (429) on forgot-password verified');

    console.log('\nALL AUTH & PASSWORD RESET TESTS PASSED!');
  } finally {
    server.close();
    await mongoose.disconnect();
    await mongo.stop();
  }
}

run().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
