const assert = require('assert');
const http = require('http');
const https = require('https');
const crypto = require('crypto');

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';

console.log(`\n==========================================`);
console.log(`   DASHBOARD & REGRESSION TEST SUITE`);
console.log(`   Target: ${BASE_URL}`);
console.log(`==========================================\n`);

async function makeRequest(urlStr, options = {}, body = null) {
  const url = new URL(urlStr, BASE_URL);
  const client = url.protocol === 'https:' ? https : http;

  return new Promise((resolve, reject) => {
    const req = client.request(url, options, (res) => {
      let data = [];
      res.on('data', (chunk) => data.push(chunk));
      res.on('end', () => {
        const buffer = Buffer.concat(data);
        let json = null;
        try { json = JSON.parse(buffer.toString('utf8')); } catch {}
        resolve({
          status: res.statusCode,
          headers: res.headers,
          cookies: res.headers['set-cookie'] || [],
          buffer,
          json
        });
      });
    });

    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

async function runDashboardTests() {
  let passed = 0;
  let total = 0;

  function report(name, success, info = '') {
    total++;
    if (success) {
      console.log(`  ✔ [PASS] ${name} ${info ? `(${info})` : ''}`);
      passed++;
    } else {
      console.error(`  ❌ [FAIL] ${name} ${info ? `-> ${info}` : ''}`);
    }
  }

  try {
    const testUserEmail = `dash_user_${Date.now()}@example.com`;

    // 1. Authenticate user via OTP
    console.log(`\n--- 1. AUTHENTICATING TEST USER ---`);
    const otpRes = await makeRequest('/api/auth/otp/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-test-suite': 'droplync_e2e'
      }
    }, JSON.stringify({ email: testUserEmail, type: 'login' }));

    const devCode = otpRes.json?.devCode || '123456';
    const otpToken = otpRes.json?.otpToken;

    const verifyRes = await makeRequest('/api/auth/otp/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, JSON.stringify({ email: testUserEmail, code: devCode, otpToken }));

    const authCookieHeader = (verifyRes.cookies || []).find(c => c.startsWith('auth_token='));
    const sessionToken = verifyRes.json?.token;
    const cookieHeaderVal = authCookieHeader ? authCookieHeader.split(';')[0] : `auth_token=${sessionToken}`;

    report('Test User Authenticated & Session Cookie Obtained', verifyRes.status === 200 && Boolean(sessionToken));

    // 2. Create transfer while authenticated
    console.log(`\n--- 2. TRANSFER CREATION & USER LINKAGE ---`);
    const createRes = await makeRequest('/api/transfers', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookieHeaderVal
      }
    }, JSON.stringify({
      name: 'Dashboard Telemetry Test Document.pdf',
      expiryDays: 7
    }));

    const transferData = createRes.json?.data || createRes.json;
    const transferId = transferData?.transferId || transferData?.id;
    const transferToken = transferData?.token;

    report('Transfer Created Under Authenticated Session', createRes.status === 201 && Boolean(transferId), `id=${transferId}`);

    // 3. Fetch user transfers via GET /api/transfers
    console.log(`\n--- 3. FETCH TRANSFERS FOR DASHBOARD ---`);
    const listRes = await makeRequest('/api/transfers', {
      method: 'GET',
      headers: { 'Cookie': cookieHeaderVal }
    });

    const userTransfers = listRes.json?.data?.transfers || listRes.json?.transfers || [];
    const found = userTransfers.some(t => t.id === transferId || t.token === transferToken);

    report('GET /api/transfers Lists Authenticated User Transfers', listRes.status === 200 && found, `count=${userTransfers.length}`);

    // 4. Test Background Sync Route: POST /api/transfers/sync
    console.log(`\n--- 4. TEST TRANSFERS RESILIENT SYNC ---`);
    const clientCachedTransfer = {
      id: `client_sync_${Date.now()}`,
      token: crypto.randomBytes(8).toString('hex'),
      name: 'Client Cached Upload.zip',
      expiresAt: new Date(Date.now() + 7 * 86400000).toISOString(),
      totalSize: '52428800',
      isActive: true
    };

    const syncRes = await makeRequest('/api/transfers/sync', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookieHeaderVal
      }
    }, JSON.stringify({ transfers: [clientCachedTransfer] }));

    report('POST /api/transfers/sync Syncs Client Transfers into Database', syncRes.status === 200 && (syncRes.json?.data?.synced >= 1 || syncRes.json?.synced >= 1), `status=${syncRes.status}, body=${JSON.stringify(syncRes.json)}`);

    // 5. Test Extend Transfer: PATCH /api/transfers/[id]
    console.log(`\n--- 5. TEST TRANSFER ACTIONS: EXTEND VALIDITY ---`);
    const extendRes = await makeRequest(`/api/transfers/${transferId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookieHeaderVal
      }
    }, JSON.stringify({ action: 'extend', days: 14 }));

    const extendedExpiry = extendRes.json?.data?.expiresAt || extendRes.json?.expiresAt;
    report('PATCH /api/transfers/[id] (extend) Returns New Future Expiry', extendRes.status === 200 && Boolean(extendedExpiry));

    // 6. Test Disable/Pause Transfer: PATCH /api/transfers/[id]
    console.log(`\n--- 6. TEST TRANSFER ACTIONS: TOGGLE ACTIVE / PAUSE ---`);
    const pauseRes = await makeRequest(`/api/transfers/${transferId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookieHeaderVal
      }
    }, JSON.stringify({ action: 'disable' }));

    report('PATCH /api/transfers/[id] (disable) Pauses Transfer', pauseRes.status === 200);

    const enableRes = await makeRequest(`/api/transfers/${transferId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookieHeaderVal
      }
    }, JSON.stringify({ action: 'enable' }));

    report('PATCH /api/transfers/[id] (enable) Re-activates Transfer', enableRes.status === 200);

    // 7. Test Delete Transfer: DELETE /api/transfers/[id]
    console.log(`\n--- 7. TEST TRANSFER ACTIONS: DELETE & PURGE ---`);
    const deleteRes = await makeRequest(`/api/transfers/${transferId}`, {
      method: 'DELETE',
      headers: { 'Cookie': cookieHeaderVal }
    });

    report('DELETE /api/transfers/[id] Purges Transfer Successfully', deleteRes.status === 200);

    console.log(`\n==========================================`);
    console.log(`🎉 DASHBOARD & REGRESSION TEST RESULTS:`);
    console.log(`   Passed: ${passed}/${total} Regression Tests`);
    console.log(`==========================================\n`);

    if (passed !== total) process.exit(1);
  } catch (err) {
    console.error(`\n❌ REGRESSION TEST EXCEPTION:`, err);
    process.exit(1);
  }
}

runDashboardTests();
