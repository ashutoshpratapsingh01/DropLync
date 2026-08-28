const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')
const prisma = new PrismaClient()

async function createDummyUsers() {
  const passwordHash = await bcrypt.hash('Password123!', 12)

  // 1. Regular Free User
  const demoUser = await prisma.user.upsert({
    where: { email: 'demo@droplync.com' },
    update: { passwordHash, isActive: true, plan: 'free' },
    create: {
      email: 'demo@droplync.com',
      name: 'Demo User',
      passwordHash,
      role: 'user',
      plan: 'free',
      isActive: true
    }
  })

  // 2. Admin User
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@droplync.com' },
    update: { passwordHash, isActive: true, role: 'admin' },
    create: {
      email: 'admin@droplync.com',
      name: 'System Admin',
      passwordHash,
      role: 'admin',
      plan: 'enterprise',
      isActive: true
    }
  })

  console.log('Dummy accounts created successfully:')
  console.log('1. User Account:', demoUser.email, '(Role: user, Plan: free)')
  console.log('2. Admin Account:', adminUser.email, '(Role: admin, Plan: enterprise)')
}

createDummyUsers()
  .then(() => prisma.$disconnect())
  .catch((e) => { console.error(e); prisma.$disconnect(); process.exit(1); })
