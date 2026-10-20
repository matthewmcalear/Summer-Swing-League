import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import type { Board } from './model'
import { SCHEDULE_ID, applySchedule, seedBoard } from './schedule'
import { sanitizeBoard } from './validate'

/**
 * The shared Yeti board lives in one row of yeti_boards (see the YetiBoard
 * model). Writes carry the version they were based on and only succeed if
 * nobody saved in between; otherwise the caller gets the newer board back.
 */

export const BOARD_ID = 'yeti-2026-27'

export interface StoredBoard {
  board: Board
  version: number
  updatedAt: string
}

export type SaveResult = ({ ok: true } | { ok: false }) & StoredBoard

// Deploys don't run migrations, so make sure the table exists before first use.
// Same DDL that `prisma db push` generates for the YetiBoard model.
const CREATE_TABLE = `CREATE TABLE IF NOT EXISTS "yeti_boards" (
    "id" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "yeti_boards_pkey" PRIMARY KEY ("id")
)`

let tableReady: Promise<void> | null = null

function ensureTable(): Promise<void> {
  tableReady ??= (async () => {
    try {
      await prisma.$executeRawUnsafe(CREATE_TABLE)
    } catch (err) {
      // Two cold starts racing on CREATE TABLE can trip a catalog conflict; fine if it exists now.
      const rows = await prisma.$queryRawUnsafe<{ t: string | null }[]>(`SELECT to_regclass('public.yeti_boards')::text AS t`)
      if (!rows[0]?.t) throw err
    }
  })().catch((err) => {
    tableReady = null
    throw err
  })
  return tableReady
}

const toStored = (row: { data: Prisma.JsonValue; version: number; updated_at: Date }): StoredBoard => ({
  board: sanitizeBoard(row.data) ?? seedBoard(),
  version: row.version,
  updatedAt: row.updated_at.toISOString(),
})

const isUniqueViolation = (err: unknown) => err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002'

/**
 * The current board. The first ever read creates it (roster, Oct 20 lines and
 * the season schedule); a board from before the schedule existed gets the
 * schedule loaded once, under the same version check as any other save.
 */
export async function readBoard(): Promise<StoredBoard> {
  const current = await readRow()
  if (current.board.schedule === SCHEDULE_ID) return current
  const { count } = await prisma.yetiBoard.updateMany({
    where: { id: BOARD_ID, version: current.version },
    data: { data: applySchedule(current.board) as unknown as Prisma.InputJsonValue, version: { increment: 1 } },
  })
  if (count === 1) console.log('[yeti] loaded the league schedule into the board')
  // Either way the row now holds the latest board (ours, or a newer save that beat us).
  return readRow()
}

async function readRow(): Promise<StoredBoard> {
  await ensureTable()
  const row = await prisma.yetiBoard.findUnique({ where: { id: BOARD_ID } })
  if (row) return toStored(row)
  try {
    const created = await prisma.yetiBoard.create({
      data: { id: BOARD_ID, data: seedBoard() as unknown as Prisma.InputJsonValue, version: 1 },
    })
    return toStored(created)
  } catch (err) {
    if (!isUniqueViolation(err)) throw err
    const again = await prisma.yetiBoard.findUnique({ where: { id: BOARD_ID } })
    if (!again) throw err
    return toStored(again)
  }
}

/** Save `board` if the stored version is still `baseVersion`; either way, return what's stored now. */
export async function saveBoard(board: Board, baseVersion: number): Promise<SaveResult> {
  await ensureTable()
  // No row yet (fresh database) → count 0 → readBoard creates it and the caller rebases.
  const { count } = await prisma.yetiBoard.updateMany({
    where: { id: BOARD_ID, version: baseVersion },
    data: { data: board as unknown as Prisma.InputJsonValue, version: { increment: 1 } },
  })
  const now = await readBoard()
  // A save from a phone still running the old page drops the schedule fields;
  // readBoard just put them back, which bumps the version — still a success.
  return { ok: count === 1, ...now }
}
