import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET() {
  const messages = await prisma.bdayMessage.findMany({
    orderBy: { sent_at: 'desc' },
    take: 60,
  })
  return NextResponse.json({ messages: messages.reverse() })
}

export async function POST(req: Request) {
  const { groupCode, text } = await req.json()
  if (!groupCode || !text?.trim()) {
    return NextResponse.json({ error: 'groupCode and text required' }, { status: 400 })
  }

  const group = await prisma.bdayGroup.findUnique({ where: { code: groupCode.toUpperCase() } })
  if (!group) return NextResponse.json({ error: 'Group not found' }, { status: 404 })

  const msg = await prisma.bdayMessage.create({
    data: { group_id: group.id, group_name: group.name, text: text.trim() },
  })
  return NextResponse.json({ message: msg })
}
