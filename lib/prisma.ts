import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }

function createPrismaClient() {
  // Eliminar sslmode del URL para evitar conflicto con la opción ssl del Pool.
  // pg-connection-string parsea sslmode=verify-full y puede sobrescribir rejectUnauthorized.
  const rawUrl = new URL(process.env.DATABASE_URL!)
  rawUrl.searchParams.delete('sslmode')
  const pool = new Pool({
    connectionString: rawUrl.toString(),
    ssl: { rejectUnauthorized: false },
  })
  const adapter = new PrismaPg(pool)
  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  })
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
