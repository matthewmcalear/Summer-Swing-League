import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { applyAction, seedLedger, withFreeFromNotes, type Action, type Ledger } from './model'

/**
 * The ledger lives in one row of sparx_ledgers. Saves only land if nobody saved
 * in between; a conflict (phone and laptop at once) re-applies on the newer row.
 */

const LEDGER_ID = 'sparx'
const MAX_TRIES = 8

export interface StoredLedger {
  ledger: Ledger
  version: number
}

// Deploys don't run migrations, so make sure the table exists before first use.
// Same DDL that `prisma db push` generates for the SparxLedger model.
const CREATE_TABLE = `CREATE TABLE IF NOT EXISTS "sparx_ledgers" (
    "id" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sparx_ledgers_pkey" PRIMARY KEY ("id")
)`

let tableReady: Promise<void> | null = null

function ensureTable(): Promise<void> {
  tableReady ??= (async () => {
    try {
      await prisma.$executeRawUnsafe(CREATE_TABLE)
    } catch (err) {
      // Two cold starts racing on CREATE TABLE can trip a catalog conflict; fine if it exists now.
      const rows = await prisma.$queryRawUnsafe<{ t: string | null }[]>(`SELECT to_regclass('public.sparx_ledgers')::text AS t`)
      if (!rows[0]?.t) throw err
    }
  })().catch((err) => {
    tableReady = null
    throw err
  })
  return tableReady
}

const toStored = (row: { data: Prisma.JsonValue; version: number }): StoredLedger => ({
  ledger: row.data as unknown as Ledger,
  version: row.version,
})

const isUniqueViolation = (err: unknown) => err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002'

/**
 * The current ledger. The first ever read creates it from the notes; a ledger
 * from before free sharpenings existed gets the ones in the notes added once,
 * under the same version check as any other save.
 */
export async function readLedger(): Promise<StoredLedger> {
  const current = await readRow()
  if (current.ledger.freeFromNotes) return current
  await prisma.sparxLedger.updateMany({
    where: { id: LEDGER_ID, version: current.version },
    data: { data: withFreeFromNotes(current.ledger) as unknown as Prisma.InputJsonValue, version: { increment: 1 } },
  })
  // Either way the row now holds the latest ledger (ours, or a newer save that beat us).
  return readRow()
}

async function readRow(): Promise<StoredLedger> {
  await ensureTable()
  const row = await prisma.sparxLedger.findUnique({ where: { id: LEDGER_ID } })
  if (row) return toStored(row)
  try {
    return toStored(await prisma.sparxLedger.create({ data: { id: LEDGER_ID, data: seedLedger() as unknown as Prisma.InputJsonValue } }))
  } catch (err) {
    if (!isUniqueViolation(err)) throw err
    const again = await prisma.sparxLedger.findUnique({ where: { id: LEDGER_ID } })
    if (!again) throw err
    return toStored(again)
  }
}

export async function saveActions(actions: Action[]): Promise<StoredLedger> {
  for (let attempt = 0; attempt < MAX_TRIES; attempt++) {
    const current = await readLedger()
    const next = actions.reduce((ledger, action) => applyAction(ledger, action), current.ledger)
    if (next === current.ledger) return current
    const { count } = await prisma.sparxLedger.updateMany({
      where: { id: LEDGER_ID, version: current.version },
      data: { data: next as unknown as Prisma.InputJsonValue, version: { increment: 1 } },
    })
    if (count === 1) return readLedger()
  }
  throw new Error('Too many conflicting saves')
}
