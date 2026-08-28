const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')
const prisma = new PrismaClient()

async function seedBrowserUser() {
  const email = 'ui_tester@droplync.com'
  const passwordHash = await bcrypt.hash('Password123!', 12)
  const user = await prisma.user.upsert({
    where: { email },
    update: { plan: 'free', passwordHash },
    create: {
      email,
      name: 'UI Tester',
      passwordHash,
      role: 'user',
      plan: 'free',
      isActive: true
    }
  })
  console.log('Seeded UI Tester User:', user.email, 'Plan:', user.plan)
}

seedBrowserUser().then(() => prisma.$disconnect())
