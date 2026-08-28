import { PrismaClient } from '@prisma/client'
import fs from 'fs'
import path from 'path'

// Handle Vercel Serverless environment: copy bundled SQLite template to writable /tmp
if (process.env.VERCEL) {
  const currentDbUrl = process.env.DATABASE_URL || ''
  // Only apply for SQLite
  if (!currentDbUrl || currentDbUrl.startsWith('file:')) {
    const tmpDbPath = '/tmp/dev.db'
    if (!fs.existsSync(tmpDbPath)) {
      const candidates = [
        path.join(process.cwd(), 'prisma', 'dev.db'),
        path.join(process.cwd(), 'dev.db'),
      ]
      for (const candidate of candidates) {
        if (fs.existsSync(candidate)) {
          try {
            fs.copyFileSync(candidate, tmpDbPath)
            break
          } catch (e) {
            console.error('Error copying template SQLite database:', e)
          }
        }
      }
    }
    process.env.DATABASE_URL = `file:${tmpDbPath}`
  }
}

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

export const prisma = globalForPrisma.prisma || new PrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

