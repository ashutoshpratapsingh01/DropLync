const http = require('http');
const https = require('https');
const crypto = require('crypto');

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';

console.log(`\n==========================================`);
console.log(`   FULL FLOW INTEGRATION TEST SUITE`);
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

function createMultipartFormData(fields, fileField, filename, fileBuffer) {
  const boundary = '----WebKitFormBoundary' + crypto.randomBytes(16).toString('hex');
  const CRLF = '\r\n';
  let body = [];

  for (const [key, value] of Object.entries(fields)) {
    body.push(Buffer.from(`--${boundary}${CRLF}Content-Disposition: form-data; name="${key}"${CRLF}${CRLF}${value}${CRLF}`));
  }

  body.push(Buffer.from(`--${boundary}${CRLF}Content-Disposition: form-data; name="${fileField}"; filename="${filename}"${CRLF}Content-Type: application/octet-stream${CRLF}${CRLF}`));
  body.push(fileBuffer);
  body.push(Buffer.from(`${CRLF}--${boundary}--${CRLF}`));

  return {
    contentType: `multipart/form-data; boundary=${boundary}`,
    buffer: Buffer.concat(body)
  };
}

async function runFlowAudit() {
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
    const testEmail = `e2e_user_${Date.now()}@example.com`;

    // ----------------------------------------------------
    // FLOW 1: Request OTP
    // ----------------------------------------------------
    console.log(`\n--- FLOW 1: OTP REQUEST & GENERATION ---`);
    const otpSendRes = await makeRequest('/api/auth/otp/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-test-suite': 'droplync_e2e'
      }
    }, JSON.stringify({ email: testEmail, type: 'login' }));

    const otpData = otpSendRes.json || {};
    const hasOtpToken = Boolean(otpData.otpToken);
    report('OTP Send Endpoint Returns 200 & Signed OTP Ticket', otpSendRes.status === 200 && hasOtpToken, `token=${otpData.otpToken?.slice(0, 20)}...`);

    const devCode = otpData.devCode || '123456';
    const otpToken = otpData.otpToken;

    // ----------------------------------------------------
    // FLOW 2: Reject Invalid OTP
    // ----------------------------------------------------
    console.log(`\n--- FLOW 2: INVALID OTP REJECTION ---`);
    const wrongOtpRes = await makeRequest('/api/auth/otp/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    }, JSON.stringify({ email: testEmail, code: '000000', otpToken }));

    report('Invalid OTP Returns HTTP 400', wrongOtpRes.status === 400, `error=${wrongOtpRes.json?.error}`);

    // ----------------------------------------------------
    // FLOW 3: Verify Correct OTP & Session Creation
    // ----------------------------------------------------
    console.log(`\n--- FLOW 3: OTP VERIFICATION & SESSION ISSUANCE ---`);
    const validOtpRes = await makeRequest('/api/auth/otp/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    }, JSON.stringify({ email: testEmail, code: devCode, otpToken }));

    const sessionData = validOtpRes.json || {};
    const setCookies = validOtpRes.cookies;
    const authCookieHeader = setCookies.find(c => c.startsWith('auth_token='));
    const sessionToken = sessionData.token;

    report('OTP Verification Returns HTTP 200 & Session Token', validOtpRes.status === 200 && Boolean(sessionToken));
    report('Auth Cookie (auth_token) Set in Response Headers', Boolean(authCookieHeader));

    // Extract cookie value for subsequent requests
    const cookieHeaderVal = authCookieHeader ? authCookieHeader.split(';')[0] : `auth_token=${sessionToken}`;

    // ----------------------------------------------------
    // FLOW 4: Authenticated Session Access
    // ----------------------------------------------------
    console.log(`\n--- FLOW 4: AUTHENTICATED SESSION ACCESS ---`);
    const meRes = await makeRequest('/api/auth/me', {
      method: 'GET',
      headers: {
        'Cookie': cookieHeaderVal
      }
    });

    const meUser = meRes.json?.user || meRes.json?.data?.user;
    report('Session Recognized & Authenticated User Profile Returned', meRes.status === 200 && Boolean(meUser), `user=${meUser?.email}`);

    // ----------------------------------------------------
    // FLOW 5: Password Login Flow
    // ----------------------------------------------------
    console.log(`\n--- FLOW 5: REGISTRATION & PASSWORD AUTHENTICATION ---`);
    const regEmail = `pwd_user_${Date.now()}@example.com`;
    const regOtpRes = await makeRequest('/api/auth/otp/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-test-suite': 'droplync_e2e'
      }
    }, JSON.stringify({ email: regEmail, type: 'register' }));

    const regDevCode = regOtpRes.json?.devCode || '123456';
    const regOtpToken = regOtpRes.json?.otpToken;

    const registerRes = await makeRequest('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, JSON.stringify({
      email: regEmail,
      password: 'SecurePassword123!',
      name: 'Password Test User',
      code: regDevCode,
      otpToken: regOtpToken
    }));

    report('User Registration with Password & OTP Succeeds (HTTP 201)', registerRes.status === 201);

    // Now test login with password
    const pwdLoginRes = await makeRequest('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, JSON.stringify({
      email: regEmail,
      password: 'SecurePassword123!'
    }));

    report('Password Sign-In Succeeds & Returns Active Session', pwdLoginRes.status === 200 && Boolean(pwdLoginRes.json?.token));

    // ----------------------------------------------------
    // FLOW 6: Multi-Part File Upload & Checksum Download
    // ----------------------------------------------------
    console.log(`\n--- FLOW 6: CHUNKED UPLOAD & DOWNLOAD FLOW ---`);
    const transferRes = await makeRequest('/api/transfers', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookieHeaderVal
      }
    }, JSON.stringify({ name: 'Integration Flow File Transfer', expiryDays: 7 }));

    const { transferId, token, uploadToken } = transferRes.json.data || transferRes.json;
    const effectiveUploadToken = uploadToken || token;

    // Create 6MB test file (2 Chunks of 3MB)
    const testFileSize = 6 * 1024 * 1024;
    const testBuffer = crypto.randomBytes(testFileSize);
    const sourceSha256 = crypto.createHash('sha256').update(testBuffer).digest('hex');
    const CHUNK_SIZE = 3 * 1024 * 1024;
    const totalChunks = 2;

    const initRes = await makeRequest('/api/uploads/initiate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-transfer-token': effectiveUploadToken
      }
    }, JSON.stringify({
      transferId,
      filename: 'integration_payload.dat',
      mimeType: 'application/octet-stream',
      size: testFileSize,
      totalChunks
    }));

    const { fileId, uploadToken: fileUploadToken } = initRes.json.data || initRes.json;
    const chunkToken = fileUploadToken || effectiveUploadToken;

    // Stream both chunks
    for (let i = 0; i < totalChunks; i++) {
      const start = i * CHUNK_SIZE;
      const end = start + CHUNK_SIZE;
      const chunkBuf = testBuffer.slice(start, end);
      const multipart = createMultipartFormData(
        { chunkIndex: String(i), totalChunks: String(totalChunks), chunkSize: String(CHUNK_SIZE) },
        'chunk',
        `chunk_${i}.part`,
        chunkBuf
      );

      const chunkRes = await makeRequest(`/api/uploads/${fileId}/chunk`, {
        method: 'POST',
        headers: {
          'Content-Type': multipart.contentType,
          'Content-Length': multipart.buffer.length,
          'x-transfer-token': chunkToken
        }
      }, multipart.buffer);

      report(`Chunk ${i + 1}/${totalChunks} Upload (3MB)`, chunkRes.status === 200);
    }

    // Complete file
    const completeRes = await makeRequest(`/api/uploads/${fileId}/complete`, {
      method: 'POST',
      headers: { 'x-transfer-token': chunkToken }
    });
    report('File Upload Finalized on Storage', completeRes.status === 200);

    // Finalize Transfer
    const finalizeRes = await makeRequest(`/api/transfers/${transferId}/finalize`, {
      method: 'POST',
      headers: { 'x-transfer-token': effectiveUploadToken }
    });
    report('Transfer Session Finalized & Shareable', finalizeRes.status === 200);

    // Download Single File & verify bit-exact SHA-256
    const downloadRes = await makeRequest(`/api/share/${token}/files/${fileId}`, { method: 'GET' });
    const downloadedSha256 = crypto.createHash('sha256').update(downloadRes.buffer).digest('hex');
    const checksumMatch = downloadedSha256 === sourceSha256;

    report('Download Single File & Verify SHA-256 Bit-Exact Integrity', downloadRes.status === 200 && checksumMatch, `sha256=${downloadedSha256.slice(0, 16)}...`);

    // Download ZIP Archive
    const zipRes = await makeRequest(`/api/share/${token}/download-all`, { method: 'GET' });
    report('Download All ZIP Archive Returns 200 OK', zipRes.status === 200 && zipRes.headers['content-type'] === 'application/zip');

    // ----------------------------------------------------
    // FLOW 7: Password-Protected Transfer Flow
    // ----------------------------------------------------
    console.log(`\n--- FLOW 7: PASSWORD-PROTECTED TRANSFER FLOW ---`);
    const protectedTransferRes = await makeRequest('/api/transfers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, JSON.stringify({
      name: 'Password Protected Transfer',
      expiryDays: 7,
      password: 'SecretTransferPassword123'
    }));

    const protTransfer = protectedTransferRes.json.data || protectedTransferRes.json;

    // Check share info without password
    const shareInfoRes = await makeRequest(`/api/share/${protTransfer.token}`, { method: 'GET' });
    report('Protected Transfer Declares hasPassword=true', shareInfoRes.json?.hasPassword === true);

    console.log(`\n==========================================`);
    console.log(`🎉 INTEGRATION TEST SUITE COMPLETE!`);
    console.log(`   Passed: ${passed}/${total} Flow Scenarios`);
    console.log(`==========================================\n`);

    if (passed !== total) {
      process.exit(1);
    }
  } catch (err) {
    console.error(`\n❌ INTEGRATION SUITE EXCEPTION:`, err);
    process.exit(1);
  }
}

runFlowAudit();
