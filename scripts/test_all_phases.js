const { execSync } = require('child_process')

console.log('=====================================================')
console.log('🚀 DROPLYNC FULL 3-PHASE AUDIT & ROADMAP TEST RUNNER')
console.log('=====================================================\n')

const suites = [
  { name: 'Phase 1: Critical Security (12 Checks)', script: 'node scripts/test_phase1.js' },
  { name: 'Phase 2: Bug Fixes & Data Integrity (5 Checks)', script: 'node scripts/test_phase2.js' },
  { name: 'Phase 3: New Functionality & Roadmap (9 Checks)', script: 'node scripts/test_phase3.js' },
  { name: 'Phase 3 Deep: Security, Payments, Hashing & Malware Inspection (11 Checks)', script: 'node scripts/test_phase3_deep.js' },
  { name: 'ClamAV Daemon: TCP INSTREAM & Fallback Policy Pipeline (6 Checks)', script: 'npx.cmd tsx scripts/test_clamav.js' }
]

let allPassed = true

for (const suite of suites) {
  console.log(`\n▶️ RUNNING: ${suite.name}...`)
  try {
    const output = execSync(suite.script, { encoding: 'utf8', stdio: 'inherit' })
    console.log(`✅ COMPLETED: ${suite.name}\n`)
  } catch (err) {
    console.error(`❌ FAILED: ${suite.name}\n`)
    allPassed = false
    break
  }
}

if (allPassed) {
  console.log('=====================================================')
  console.log('🎉 ALL 43/43 TESTS PASSED ACROSS ALL AUDIT PHASES!')
  console.log('=====================================================\n')
  process.exit(0)
}

 else {
  console.error('Audit verification failed.')
  process.exit(1)
}
