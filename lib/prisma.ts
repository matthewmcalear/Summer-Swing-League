import { PrismaClient } from '@prisma/client'

/**
 * Cap the connection pool. The Heroku Postgres plan allows 20 connections in total,
 * shared by the web dyno, one-off scripts and — during a deploy — the build, whose
 * prerender workers each open their own client. An explicit connection_limit in
 * DATABASE_URL wins.
 */
function datasourceUrl(): string | undefined {
  const url = process.env.DATABASE_URL
  if (!url || /[?&]connection_limit=/.test(url)) return url
  const limit = process.env.NEXT_PHASE === 'phase-production-build' ? 1 : 5
  return `${url}${url.includes('?') ? '&' : '?'}connection_limit=${limit}`
}

// Prevent multiple instances in development (Next.js hot reload)
const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

export const prisma =
  globalForPrisma.prisma ?? new PrismaClient({ datasourceUrl: datasourceUrl() })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
