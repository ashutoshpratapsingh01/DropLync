const http = require('http');
const https = require('https');
const crypto = require('crypto');

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';

console.log(`\n🚀 ==========================================`);
console.log(`   LARGE MULTI-CHUNK FILE STRESS TEST (30MB)`);
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
        resolve({ status: res.statusCode, headers: res.headers, buffer, json });
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

  const fullBuffer = Buffer.concat(body);
  return {
    contentType: `multipart/form-data; boundary=${boundary}`,
    buffer: fullBuffer
  };
}

async function runStressTest() {
  try {
    // 1. Create Transfer
    console.log(`[STEP 1] Creating Transfer Session...`);
    const transferRes = await makeRequest('/api/transfers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, JSON.stringify({ name: '30MB Stress Test File', expiryDays: 7 }));

    const { transferId, token, uploadToken } = transferRes.json.data || transferRes.json;
    const effectiveUploadToken = uploadToken || token;
    console.log(`  ✔ Transfer Created: ID=${transferId}, Token=${token.slice(0, 30)}...`);

    // 2. Generate 30 MB Random Buffer
    const testFileSize = 30 * 1024 * 1024;
    console.log(`\n[STEP 2] Generating 30 MB Random Byte Buffer (10 Chunks of 3MB)...`);
    const testBuffer = crypto.randomBytes(testFileSize);
    const originalSha256 = crypto.createHash('sha256').update(testBuffer).digest('hex');
    const CHUNK_SIZE = 3 * 1024 * 1024;
    const totalChunks = Math.ceil(testFileSize / CHUNK_SIZE);
    console.log(`  ✔ Original SHA-256: ${originalSha256}`);
    console.log(`  ✔ Total Chunks: ${totalChunks}`);

    // 3. Initiate Upload
    console.log(`\n[STEP 3] Initiating Upload...`);
    const initRes = await makeRequest('/api/uploads/initiate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-transfer-token': effectiveUploadToken }
    }, JSON.stringify({
      transferId,
      filename: 'stress_test_large_archive.dat',
      mimeType: 'application/octet-stream',
      size: testFileSize,
      totalChunks
    }));

    const { fileId, uploadToken: fileUploadToken } = initRes.json.data || initRes.json;
    const chunkToken = fileUploadToken || effectiveUploadToken;
    console.log(`  ✔ Initiated File ID=${fileId}`);

    // 4. Stream Chunks
    console.log(`\n[STEP 4] Streaming 10 Chunks (30 MB Total)...`);
    const startTime = Date.now();
    for (let i = 0; i < totalChunks; i++) {
      const start = i * CHUNK_SIZE;
      const end = Math.min(start + CHUNK_SIZE, testFileSize);
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

      if (chunkRes.status !== 200) {
        throw new Error(`Chunk ${i + 1}/${totalChunks} failed: HTTP ${chunkRes.status}`);
      }
      process.stdout.write(`  ✔ Uploaded Chunk ${i + 1}/${totalChunks} (3.00 MB)\r`);
    }
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`\n  ⚡ All 10 Chunks Uploaded in ${duration}s (${(30 / duration).toFixed(2)} MB/s)`);

    // 5. Complete File
    console.log(`\n[STEP 5] Completing File...`);
    const completeRes = await makeRequest(`/api/uploads/${fileId}/complete`, {
      method: 'POST',
      headers: { 'x-transfer-token': chunkToken }
    });
    console.log(`  ✔ Completed:`, completeRes.json);

    // 6. Finalize Transfer
    console.log(`\n[STEP 6] Finalizing Transfer...`);
    const finalizeRes = await makeRequest(`/api/transfers/${transferId}/finalize`, {
      method: 'POST',
      headers: { 'x-transfer-token': effectiveUploadToken }
    });
    const finData = finalizeRes.json.data || finalizeRes.json;
    console.log(`  ✔ Transfer Active: Total Size = ${finData.totalSize} bytes`);

    // 7. Download & Checksum Verification
    console.log(`\n[STEP 7] Downloading & Verifying SHA-256 Checksum...`);
    const downloadRes = await makeRequest(`/api/share/${token}/files/${fileId}`, { method: 'GET' });
    const downloadedSha256 = crypto.createHash('sha256').update(downloadRes.buffer).digest('hex');

    console.log(`  ✔ Downloaded Size: ${(downloadRes.buffer.length / (1024 * 1024)).toFixed(2)} MB`);
    console.log(`  ✔ Downloaded SHA-256: ${downloadedSha256}`);

    if (downloadedSha256 !== originalSha256) {
      throw new Error(`Checksum Mismatch! Expected ${originalSha256}, got ${downloadedSha256}`);
    }

    console.log(`\n==========================================`);
    console.log(`🎉 30MB MULTI-CHUNK STRESS TEST 100% SUCCESSFUL!`);
    console.log(`   PERFECT BIT-EXACT SHA-256 MATCH`);
    console.log(`==========================================\n`);
  } catch (err) {
    console.error(`\n❌ TEST FAILED:`, err.message);
    process.exit(1);
  }
}

runStressTest();
