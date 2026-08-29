const assert = require('assert');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

console.log(`\n==========================================`);
console.log(`   UNIT TEST SUITE: STORAGE & CHUNKING`);
console.log(`==========================================\n`);

let passed = 0;
let total = 0;

async function itAsync(name, fn) {
  total++;
  try {
    await fn();
    console.log(`  ✔ [PASS] ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ❌ [FAIL] ${name}`);
    console.error(`     Error:`, err.message);
  }
}

const TEST_DIR = path.join(process.cwd(), 'scratch', 'test_storage');

async function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    await fs.promises.mkdir(dir, { recursive: true });
  }
}

async function writeChunkDirect(storagePath, chunkIndex, chunkSize, data) {
  const dir = path.dirname(storagePath);
  await ensureDir(dir);
  const offset = chunkIndex * chunkSize;

  if (!fs.existsSync(storagePath)) {
    try {
      await fs.promises.writeFile(storagePath, Buffer.alloc(0), { flag: 'wx' });
    } catch (e) {
      if (e.code !== 'EEXIST') throw e;
    }
  }

  const fileHandle = await fs.promises.open(storagePath, 'r+');
  try {
    await fileHandle.write(data, 0, data.length, offset);
  } finally {
    await fileHandle.close();
  }
}

(async () => {
  await ensureDir(TEST_DIR);

  // 1. Direct In-Order Chunk Assembly
  await itAsync('writeChunkDirect writes chunks in sequential order accurately', async () => {
    const testFile = path.join(TEST_DIR, 'seq_test.bin');
    if (fs.existsSync(testFile)) await fs.promises.rm(testFile);

    const chunk1 = Buffer.from('CHUNK_01_DATA_');
    const chunk2 = Buffer.from('CHUNK_02_DATA_');
    const chunk3 = Buffer.from('CHUNK_03_DATA');
    const chunkSize = 14;

    await writeChunkDirect(testFile, 0, chunkSize, chunk1);
    await writeChunkDirect(testFile, 1, chunkSize, chunk2);
    await writeChunkDirect(testFile, 2, chunkSize, chunk3);

    const fileBuffer = await fs.promises.readFile(testFile);
    const expected = Buffer.concat([chunk1, chunk2, chunk3]);

    assert.strictEqual(fileBuffer.length, expected.length);
    assert.strictEqual(fileBuffer.toString('utf8'), 'CHUNK_01_DATA_CHUNK_02_DATA_CHUNK_03_DATA');
  });

  // 2. Out-of-Order Concurrent Chunk Writing
  await itAsync('writeChunkDirect handles out-of-order chunk arrivals at exact offsets', async () => {
    const testFile = path.join(TEST_DIR, 'out_of_order_test.bin');
    if (fs.existsSync(testFile)) await fs.promises.rm(testFile);

    const chunkSize = 10;
    const part0 = Buffer.from('0123456789');
    const part1 = Buffer.from('abcdefghij');
    const part2 = Buffer.from('ABCDEFGHIJ');

    // Write chunk 2 first, then chunk 0, then chunk 1
    await writeChunkDirect(testFile, 2, chunkSize, part2);
    await writeChunkDirect(testFile, 0, chunkSize, part0);
    await writeChunkDirect(testFile, 1, chunkSize, part1);

    const fileBuffer = await fs.promises.readFile(testFile);
    assert.strictEqual(fileBuffer.toString('utf8'), '0123456789abcdefghijABCDEFGHIJ');
  });

  // 3. Multi-Megabyte Binary File Integrity
  await itAsync('verifies SHA-256 checksum on reconstructed 9MB chunked stream', async () => {
    const testFile = path.join(TEST_DIR, 'large_binary.dat');
    if (fs.existsSync(testFile)) await fs.promises.rm(testFile);

    const CHUNK_SIZE = 3 * 1024 * 1024;
    const totalSize = 9 * 1024 * 1024; // 3 full 3MB chunks
    const sourceData = crypto.randomBytes(totalSize);
    const expectedSha256 = crypto.createHash('sha256').update(sourceData).digest('hex');

    for (let i = 0; i < 3; i++) {
      const chunkBuf = sourceData.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
      await writeChunkDirect(testFile, i, CHUNK_SIZE, chunkBuf);
    }

    const writtenBuffer = await fs.promises.readFile(testFile);
    const actualSha256 = crypto.createHash('sha256').update(writtenBuffer).digest('hex');

    assert.strictEqual(writtenBuffer.length, totalSize);
    assert.strictEqual(actualSha256, expectedSha256);
  });

  // Cleanup
  try {
    await fs.promises.rm(TEST_DIR, { recursive: true, force: true });
  } catch {}

  console.log(`\n------------------------------------------`);
  console.log(`Result: ${passed}/${total} Storage Unit Tests Passed.`);
  console.log(`------------------------------------------\n`);

  if (passed !== total) {
    process.exit(1);
  }
})();
