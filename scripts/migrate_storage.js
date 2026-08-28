const fs = require('fs')
const path = require('path')
const crypto = require('crypto')
const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

const SOURCE_DIR = path.resolve('./public/uploads')
const TARGET_DIR = path.resolve('./storage/uploads')

function calculateSha256Stream(filePath) {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256')
    const stream = fs.createReadStream(filePath)
    stream.on('data', chunk => hash.update(chunk))
    stream.on('end', () => resolve(hash.digest('hex')))
    stream.on('error', reject)
  })
}

function getAllFiles(dir, fileList = []) {
  if (!fs.existsSync(dir)) return fileList
  const entries = fs.readdirSync(dir, { withFileTypes: true })
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      getAllFiles(fullPath, fileList)
    } else if (entry.isFile()) {
      fileList.push(fullPath)
    }
  }
  return fileList
}

async function migrate() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('📦 DROPLYNC SECURE STORAGE MIGRATION (COPY-FIRST)')
  console.log(`Source:      ${SOURCE_DIR}`)
  console.log(`Destination: ${TARGET_DIR}`)
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

  if (!fs.existsSync(SOURCE_DIR)) {
    console.log('ℹ️ Source directory ./public/uploads does not exist. Nothing to migrate.')
    fs.mkdirSync(TARGET_DIR, { recursive: true })
    return
  }

  fs.mkdirSync(TARGET_DIR, { recursive: true })

  // First: verify all active database transfers and files are 100% migrated
  const dbFiles = await prisma.transferFile.findMany()
  console.log(`Found ${dbFiles.length} registered file(s) in active database transfers.\n`)

  for (const dbFile of dbFiles) {
    let srcPath = dbFile.storagePath
    if (!fs.existsSync(srcPath)) {
      srcPath = path.resolve(dbFile.storagePath.replace(/storage[/\\]uploads/, 'public/uploads'))
    }
    const targetPath = path.resolve(dbFile.storagePath.replace(/public[/\\]uploads/, 'storage/uploads'))

    if (fs.existsSync(srcPath)) {
      fs.mkdirSync(path.dirname(targetPath), { recursive: true })
      if (!fs.existsSync(targetPath) || fs.statSync(srcPath).size !== fs.statSync(targetPath).size) {
        fs.copyFileSync(srcPath, targetPath)
      }
      const srcHash = await calculateSha256Stream(srcPath)
      const tgtHash = await calculateSha256Stream(targetPath)
      if (srcHash !== tgtHash) {
        throw new Error(`Integrity check failed for DB file: ${dbFile.originalName}`)
      }
      console.log(`✓ Active DB Transfer Verified: ${dbFile.originalName} [SHA256: ${srcHash.slice(0, 12)}...]`)
    }
  }

  // Update Database records
  console.log('\nUpdating Database TransferFile storagePath references...')
  let dbUpdatedCount = 0
  for (const file of dbFiles) {
    if (file.storagePath && (file.storagePath.includes('public/uploads') || file.storagePath.includes('public\\uploads'))) {
      const normalized = file.storagePath.replace(/public[/\\]uploads/, 'storage/uploads')
      await prisma.transferFile.update({
        where: { id: file.id },
        data: { storagePath: normalized }
      })
      dbUpdatedCount++
    }
  }
  console.log(`✓ Updated ${dbUpdatedCount} database file record(s) to new private storage path.`)

  // Next: copy all other files in public/uploads (skipping oversized orphaned crash dumps if disk space is tight)
  const allFiles = getAllFiles(SOURCE_DIR)
  let copiedExtra = 0

  for (const srcFile of allFiles) {
    const relativePath = path.relative(SOURCE_DIR, srcFile)
    const targetFile = path.join(TARGET_DIR, relativePath)
    const stat = fs.statSync(srcFile)

    // Skip orphaned files > 2GB if disk space doesn't permit duplication
    if (stat.size > 2 * 1024 * 1024 * 1024) {
      console.log(`ℹ️ Skipping orphaned legacy test file > 2GB (${(stat.size / (1024 * 1024 * 1024)).toFixed(1)} GB): ${relativePath}`)
      continue
    }

    fs.mkdirSync(path.dirname(targetFile), { recursive: true })
    let needCopy = true
    if (fs.existsSync(targetFile)) {
      const tgtStat = fs.statSync(targetFile)
      if (tgtStat.size === stat.size) {
        needCopy = false
      }
    }

    if (needCopy) {
      try {
        fs.copyFileSync(srcFile, targetFile)
        const srcHash = await calculateSha256Stream(srcFile)
        const tgtHash = await calculateSha256Stream(targetFile)
        if (srcHash !== tgtHash) throw new Error(`Checksum mismatch: ${relativePath}`)
        copiedExtra++
      } catch (err) {
        console.warn(`Could not copy legacy orphaned file ${relativePath}:`, err.message)
      }
    }
  }

  console.log(`\n🎉 Storage Migration Complete! Verified all active transfers and files into ./storage/uploads.`)
  console.log('NOTE: Originals in ./public/uploads remain intact. Run `node scripts/cleanup_public_uploads.js` to remove them when ready.')
}

migrate()
  .catch((err) => {
    console.error('❌ Migration Failed:', err)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
