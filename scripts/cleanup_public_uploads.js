const fs = require('fs')
const path = require('path')

const SOURCE_DIR = path.resolve('./public/uploads')

function cleanup() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('🗑️ DROPLYNC PUBLIC STORAGE CLEANUP')
  console.log(`Target to remove: ${SOURCE_DIR}`)
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

  if (!fs.existsSync(SOURCE_DIR)) {
    console.log('ℹ️ ./public/uploads does not exist. Already clean.')
    return
  }

  fs.rmSync(SOURCE_DIR, { recursive: true, force: true })
  console.log('✓ Successfully removed ./public/uploads directory and all its contents.')
  console.log('✓ Public static exposure of files is now completely closed.')
}

cleanup()
