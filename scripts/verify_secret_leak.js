const fs = require('fs')
const path = require('path')

const env = fs.readFileSync('.env', 'utf8')
const match = env.match(/CRON_SECRET=["']?([^"'\r\n]+)["']?/)
if (!match) {
  console.log('No CRON_SECRET found in .env')
  process.exit(1)
}

const secret = match[1].trim()
console.log(`Searching repository code, docs, and configurations for literal CRON_SECRET value (${secret.length} chars)...`)

let leakedFiles = []

function search(dir) {
  for (const f of fs.readdirSync(dir, { withFileTypes: true })) {
    if (['node_modules', '.git', '.next', '.env', 'storage', 'public'].includes(f.name)) continue
    const p = path.join(dir, f.name)
    if (f.isDirectory()) {
      search(p)
    } else if (f.isFile()) {
      try {
        const content = fs.readFileSync(p, 'utf8')
        if (content.includes(secret)) {
          leakedFiles.push(p)
        }
      } catch {}
    }
  }
}

search('.')

if (leakedFiles.length === 0) {
  console.log('✅ CLEAN: The literal CRON_SECRET value was NOT found anywhere in git-tracked code, docs, plans, or scripts.')
} else {
  console.error('❌ LEAK DETECTED in files:', leakedFiles)
  process.exit(1)
}
