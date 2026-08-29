const assert = require('assert');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');

// Test JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || 'droplync-super-secret-jwt-key-change-in-production-min-32-chars';

function hashOtpCode(code) {
  return crypto.createHash('sha256').update(code.trim()).digest('hex');
}

function signOtpTicket(payload) {
  const normalizedEmail = payload.email.toLowerCase().trim();
  const codeHash = hashOtpCode(payload.code);
  const exp = payload.expiresAt ? payload.expiresAt.toISOString() : new Date(Date.now() + 10 * 60 * 1000).toISOString();

  return jwt.sign({
    email: normalizedEmail,
    codeHash,
    type: payload.type || 'auth',
    expiresAt: exp
  }, JWT_SECRET, { expiresIn: '15m' });
}

function verifyOtpTicket(ticket, email, inputCode) {
  try {
    const payload = jwt.verify(ticket, JWT_SECRET);
    if (!payload || !payload.email || !payload.codeHash) {
      return { valid: false, reason: 'Invalid OTP ticket payload' };
    }

    const normalizedEmail = email.toLowerCase().trim();
    if (payload.email !== normalizedEmail) {
      return { valid: false, reason: 'Email mismatch on OTP ticket' };
    }

    if (new Date(payload.expiresAt).getTime() < Date.now()) {
      return { valid: false, reason: 'OTP code has expired' };
    }

    const inputHash = hashOtpCode(inputCode);
    if (payload.codeHash !== inputHash) {
      return { valid: false, reason: 'Incorrect verification code' };
    }

    return { valid: true };
  } catch (err) {
    return { valid: false, reason: err.message || 'Invalid or expired OTP ticket' };
  }
}

function generateToken(user) {
  const payload = typeof user === 'string'
    ? { userId: user, nonce: crypto.randomUUID() }
    : {
        userId: user.id,
        email: user.email,
        name: user.name,
        role: user.role || 'user',
        plan: user.plan || 'free',
        nonce: crypto.randomUUID()
      };
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

console.log(`\n==========================================`);
console.log(`   UNIT TEST SUITE: AUTH & OTP LOGIC`);
console.log(`==========================================\n`);

let passed = 0;
let total = 0;

function it(name, fn) {
  total++;
  try {
    fn();
    console.log(`  ✔ [PASS] ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ❌ [FAIL] ${name}`);
    console.error(`     Error:`, err.message);
  }
}

// 1. Hash OTP Code
it('hashOtpCode generates consistent SHA-256 hex string', () => {
  const hash1 = hashOtpCode('123456');
  const hash2 = hashOtpCode(' 123456 ');
  assert.strictEqual(hash1, hash2);
  assert.strictEqual(hash1.length, 64);
});

// 2. Sign and Verify OTP Ticket (Happy Path)
it('signOtpTicket and verifyOtpTicket validate correct 6-digit code', () => {
  const email = 'alex@example.com';
  const code = '582914';
  const ticket = signOtpTicket({ email, code });

  const result = verifyOtpTicket(ticket, email, code);
  assert.strictEqual(result.valid, true);
});

// 3. Reject Wrong Code
it('verifyOtpTicket rejects incorrect 6-digit code', () => {
  const email = 'alex@example.com';
  const code = '582914';
  const ticket = signOtpTicket({ email, code });

  const result = verifyOtpTicket(ticket, email, '999999');
  assert.strictEqual(result.valid, false);
  assert.strictEqual(result.reason, 'Incorrect verification code');
});

// 4. Reject Wrong Email
it('verifyOtpTicket rejects mismatched email address', () => {
  const email = 'alex@example.com';
  const code = '582914';
  const ticket = signOtpTicket({ email, code });

  const result = verifyOtpTicket(ticket, 'other@example.com', code);
  assert.strictEqual(result.valid, false);
  assert.strictEqual(result.reason, 'Email mismatch on OTP ticket');
});

// 5. Reject Expired OTP Ticket
it('verifyOtpTicket rejects expired OTP tickets', () => {
  const email = 'alex@example.com';
  const code = '582914';
  const expiredDate = new Date(Date.now() - 60000); // 1 minute in the past
  const ticket = signOtpTicket({ email, code, expiresAt: expiredDate });

  const result = verifyOtpTicket(ticket, email, code);
  assert.strictEqual(result.valid, false);
  assert.strictEqual(result.reason, 'OTP code has expired');
});

// 6. Reject Tampered OTP Ticket
it('verifyOtpTicket rejects tampered signatures', () => {
  const email = 'alex@example.com';
  const code = '582914';
  const ticket = signOtpTicket({ email, code });
  const tamperedTicket = ticket.slice(0, -4) + 'abcd';

  const result = verifyOtpTicket(tamperedTicket, email, code);
  assert.strictEqual(result.valid, false);
});

// 7. Generate Claim-Bearing JWT Session Token
it('generateToken embeds full user claims into session JWT', () => {
  const user = {
    id: 'usr_test_123',
    email: 'sarah@example.com',
    name: 'Sarah Connor',
    role: 'user',
    plan: 'pro'
  };

  const token = generateToken(user);
  const payload = verifyToken(token);

  assert.ok(payload);
  assert.strictEqual(payload.userId, user.id);
  assert.strictEqual(payload.email, user.email);
  assert.strictEqual(payload.name, user.name);
  assert.strictEqual(payload.role, user.role);
  assert.strictEqual(payload.plan, user.plan);
  assert.ok(payload.nonce);
});

// 8. Reject Invalid JWT Session
it('verifyToken returns null for corrupted session token', () => {
  const invalid = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.corrupted.token';
  const payload = verifyToken(invalid);
  assert.strictEqual(payload, null);
});

console.log(`\n------------------------------------------`);
console.log(`Result: ${passed}/${total} Auth & OTP Unit Tests Passed.`);
console.log(`------------------------------------------\n`);

if (passed !== total) {
  process.exit(1);
}
