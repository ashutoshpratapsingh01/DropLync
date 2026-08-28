const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function check() {
  const transfers = await prisma.transfer.findMany({ include: { files: true } })
  console.log('Total Transfers in DB:', transfers.length)
  for (const t of transfers) {
    console.log('Transfer:', t.id, t.token, 'Files count:', t.files.length)
    for (const f of t.files) {
      console.log(' - File:', f.id, f.originalName, f.storagePath, f.size.toString())
    }
  }
}

check()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect()
  })
