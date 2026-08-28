const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function main() {
  const passwordHash = await bcrypt.hash('admin123', 12)
  const admin = await prisma.user.upsert({
    where: { email: 'admin@droplync.app' },
    update: {},
    create: {
      email: 'admin@droplync.app',
      name: 'Admin',
      passwordHash,
      role: 'admin'
    }
  })
  console.log('Admin user created:', admin.email)
  console.log('Password: admin123')
}

main().catch(console.error).finally(() => prisma.$disconnect())
