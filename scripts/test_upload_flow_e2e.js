const http = require('http');
const https = require('https');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// Target baseUrl: default to localhost or production
const BASE_URL = process.env.TEST_BASE_URL || 'https://droplync.in';

console.log(`\n🚀 ==========================================`);
console.log(`   DROPLYNC END-TO-END FLOW TESTING SUITE`);
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
        try {
          json = JSON.parse(buffer.toString('utf8'));
        } catch {}
        resolve({ status: res.statusCode, headers: res.headers, buffer, json });
      });
    });

    req.on('error', reject);
    if (body) {
      req.write(body);
    }
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

async function runTests() {
  let passed = 0;
  let failed = 0;

  try {
    // ----------------------------------------------------
    // TEST 1: Create Transfer Session
    // ----------------------------------------------------
    console.log(`[TEST 1] Creating Transfer Session (/api/transfers)...`);
    const transferName = `E2E Automated Test Transfer - ${Date.now()}`;
    const transferRes = await makeRequest('/api/transfers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, JSON.stringify({
      name: transferName,
      expiryDays: 7,
      maxDownloads: 10
    }));

    if (transferRes.status !== 201 && transferRes.status !== 200) {
      throw new Error(`Failed to create transfer: HTTP ${transferRes.status} -> ${JSON.stringify(transferRes.json)}`);
    }

    const { transferId, token, uploadToken } = transferRes.json.data || transferRes.json;
    const effectiveUploadToken = uploadToken || token;
    console.log(`  ✔ Transfer Created: ID=${transferId}, Token=${token}`);
    passed++;

    // ----------------------------------------------------
    // TEST 2: Generate 12 MB Multi-Chunk Test File
    // ----------------------------------------------------
    console.log(`\n[TEST 2] Generating 12 MB Multi-Chunk File (3 Chunks: 5MB + 5MB + 2MB)...`);
    const testFileSize = 12 * 1024 * 1024;
    const testBuffer = crypto.randomBytes(testFileSize);
    const originalSha256 = crypto.createHash('sha256').update(testBuffer).digest('hex');
    const testFilename = `e2e_video_payload_${Date.now()}.mp4`;
    const CHUNK_SIZE = 3 * 1024 * 1024;
    const totalChunks = Math.ceil(testFileSize / CHUNK_SIZE);
    console.log(`  ✔ Original File SHA-256: ${originalSha256}`);
    console.log(`  ✔ Total Chunks to Stream: ${totalChunks}`);
    passed++;

    // ----------------------------------------------------
    // TEST 3: Initiate Upload Session
    // ----------------------------------------------------
    console.log(`\n[TEST 3] Initiating Upload Session (/api/uploads/initiate)...`);
    const initRes = await makeRequest('/api/uploads/initiate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-transfer-token': effectiveUploadToken
      }
    }, JSON.stringify({
      transferId,
      filename: testFilename,
      mimeType: 'video/mp4',
      size: testFileSize,
      totalChunks
    }));

    if (initRes.status !== 201 && initRes.status !== 200) {
      throw new Error(`Failed to initiate upload: HTTP ${initRes.status} -> ${JSON.stringify(initRes.json)}`);
    }

    const { fileId } = initRes.json.data || initRes.json;
    console.log(`  ✔ File Upload Session Initialized: FileID=${fileId}`);
    passed++;

    // ----------------------------------------------------
    // TEST 4: Stream All Chunks
    // ----------------------------------------------------
    console.log(`\n[TEST 4] Streaming Chunks to (/api/uploads/${fileId}/chunk)...`);
    for (let i = 0; i < totalChunks; i++) {
      const start = i * CHUNK_SIZE;
      const end = Math.min(start + CHUNK_SIZE, testFileSize);
      const chunkBuf = testBuffer.slice(start, end);
      const currentLength = end - start;

      const multipart = createMultipartFormData(
        {
          chunkIndex: String(i),
          totalChunks: String(totalChunks),
          chunkSize: String(CHUNK_SIZE)
        },
        'chunk',
        `chunk_${i}.part`,
        chunkBuf
      );

      const chunkRes = await makeRequest(`/api/uploads/${fileId}/chunk`, {
        method: 'POST',
        headers: {
          'Content-Type': multipart.contentType,
          'Content-Length': multipart.buffer.length,
          'x-transfer-token': effectiveUploadToken
        }
      }, multipart.buffer);

      if (chunkRes.status !== 200) {
        throw new Error(`Chunk ${i + 1}/${totalChunks} upload failed: HTTP ${chunkRes.status} -> ${JSON.stringify(chunkRes.json)}`);
      }

      console.log(`  ✔ Uploaded Chunk ${i + 1}/${totalChunks} (${(currentLength / (1024 * 1024)).toFixed(2)} MB) -> HTTP 200 OK`);
    }
    passed++;

    // ----------------------------------------------------
    // TEST 5: Complete File Upload
    // ----------------------------------------------------
    console.log(`\n[TEST 5] Completing File Upload Session (/api/uploads/${fileId}/complete)...`);
    const completeRes = await makeRequest(`/api/uploads/${fileId}/complete`, {
      method: 'POST',
      headers: {
        'x-transfer-token': effectiveUploadToken
      }
    });

    if (completeRes.status !== 200) {
      throw new Error(`Failed to complete file upload: HTTP ${completeRes.status} -> ${JSON.stringify(completeRes.json)}`);
    }
    console.log(`  ✔ File Upload Finalized on Storage:`, completeRes.json);
    passed++;

    // ----------------------------------------------------
    // TEST 6: Finalize Transfer
    // ----------------------------------------------------
    console.log(`\n[TEST 6] Finalizing Transfer Session (/api/transfers/${transferId}/finalize)...`);
    const finalizeRes = await makeRequest(`/api/transfers/${transferId}/finalize`, {
      method: 'POST',
      headers: {
        'x-transfer-token': effectiveUploadToken
      }
    });

    if (finalizeRes.status !== 200) {
      throw new Error(`Failed to finalize transfer: HTTP ${finalizeRes.status} -> ${JSON.stringify(finalizeRes.json)}`);
    }
    console.log(`  ✔ Transfer Active & Shareable at: ${BASE_URL}/f/${token}`);
    passed++;

    // ----------------------------------------------------
    // TEST 7: Download File & Verify Bit-Exact Checksum
    // ----------------------------------------------------
    console.log(`\n[TEST 7] Downloading File from Recipient Portal (/api/share/${token}/files/${fileId})...`);
    const downloadRes = await makeRequest(`/api/share/${token}/files/${fileId}`, {
      method: 'GET'
    });

    if (downloadRes.status !== 200) {
      throw new Error(`Failed to download file: HTTP ${downloadRes.status} -> ${downloadRes.buffer.toString('utf8').slice(0, 200)}`);
    }

    const downloadedSha256 = crypto.createHash('sha256').update(downloadRes.buffer).digest('hex');
    console.log(`  ✔ Downloaded File Size: ${(downloadRes.buffer.length / (1024 * 1024)).toFixed(2)} MB`);
    console.log(`  ✔ Downloaded File SHA-256: ${downloadedSha256}`);

    if (downloadedSha256 !== originalSha256) {
      throw new Error(`Checksum mismatch! Expected ${originalSha256}, received ${downloadedSha256}`);
    }
    console.log(`  🌟 PERFECT 100% BIT-FOR-BIT SHA-256 INTEGRITY MATCH!`);
    passed++;

    // ----------------------------------------------------
    // TEST 8: Download All as ZIP Archive
    // ----------------------------------------------------
    console.log(`\n[TEST 8] Downloading ZIP Archive (/api/share/${token}/download-all)...`);
    const zipRes = await makeRequest(`/api/share/${token}/download-all`, {
      method: 'GET'
    });

    if (zipRes.status !== 200) {
      throw new Error(`Failed to download ZIP: HTTP ${zipRes.status}`);
    }
    console.log(`  ✔ Downloaded ZIP Archive Size: ${(zipRes.buffer.length / (1024 * 1024)).toFixed(2)} MB`);
    console.log(`  ✔ Content-Type: ${zipRes.headers['content-type']}`);
    passed++;

    console.log(`\n==========================================`);
    console.log(`🎉 ALL ${passed} TESTS PASSED SUCCESSFULLY!`);
    console.log(`==========================================\n`);
  } catch (err) {
    console.error(`\n❌ TEST FAILURE:`, err.message);
    failed++;
    process.exit(1);
  }
}

runTests();
