'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { isAdmin as isLeagueAdmin } from '@/lib/auth'
import { currentUser, endSession, hashPin, startSession, verifyPin } from '@/lib/polydan/auth'
import history from '@/data/polydan/iron-man-history.json'
import { executeTrade, TradeError } from '@/lib/polydan/markets'
import { formatMoney } from '@/lib/polydan/money'

export interface ActionState {
  error?: string
  ok?: string
}

export async function login(_: ActionState, form: FormData): Promise<ActionState> {
  const name = String(form.get('name') ?? '')
  const pin = String(form.get('pin') ?? '')
  const user = await prisma.pdUser.findUnique({ where: { name } })
  if (!user || !verifyPin(pin, user.pinHash)) return { error: "That PIN doesn't match" }
  await startSession(user.id)
  redirect('/polydan')
}

/**
 * First-run setup: creates the PolyDan admin account and loads every past
 * Iron Man competitor. Only works while PolyDan has no accounts, and only for
 * someone logged in as the SSL league admin.
 */
export async function setupAdmin(_: ActionState, form: FormData): Promise<ActionState> {
  if (!(await isLeagueAdmin())) return { error: 'Log in to the SSL admin page first' }
  if ((await prisma.pdUser.count()) > 0) return { error: 'PolyDan is already set up — log in instead' }
  const name = String(form.get('name') ?? '').trim()
  const pin = String(form.get('pin') ?? '').trim()
  if (!name) return { error: 'Enter your name' }
  if (!/^\d{4,8}$/.test(pin)) return { error: 'PIN must be 4–8 digits' }
  const user = await prisma.pdUser.create({ data: { name, pinHash: hashPin(pin), isAdmin: true } })
  for (const c of history.leaderboard) {
    await prisma.pdCompetitor.upsert({ where: { name: c.name }, create: { name: c.name }, update: {} })
  }
  await startSession(user.id)
  redirect('/polydan/admin')
}

export async function logout() {
  await endSession()
  redirect('/polydan/login')
}

export async function trade(_: ActionState, form: FormData): Promise<ActionState> {
  const user = await currentUser()
  if (!user) return { error: 'Log in again' }
  const outcomeId = Number(form.get('outcomeId'))
  const side = form.get('side') === 'SELL' ? 'SELL' : 'BUY'
  const amount = Number(form.get('amount'))
  if (!Number.isFinite(amount) || amount <= 0) return { error: 'Enter an amount' }
  try {
    const r =
      side === 'BUY'
        ? await executeTrade({ side, userId: user.id, outcomeId, spendCents: Math.round(amount * 100) })
        : await executeTrade({ side, userId: user.id, outcomeId, shares: amount })
    revalidatePath('/polydan', 'layout')
    return {
      ok:
        side === 'BUY'
          ? `Bought ${r.shares.toFixed(2)} shares for ${formatMoney(r.costCents)}`
          : `Sold ${(-r.shares).toFixed(2)} shares for ${formatMoney(-r.costCents)}`,
    }
  } catch (e) {
    if (e instanceof TradeError) return { error: e.message }
    throw e
  }
}
