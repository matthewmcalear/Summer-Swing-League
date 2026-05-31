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
  const { senderName, text } = await req.json()
  if (!senderName?.trim() || !text?.trim()) {
    return NextResponse.json({ error: 'senderName and text required' }, { status: 400 })
  }

  const msg = await prisma.bdayMessage.create({
    data: { sender_name: senderName.trim(), text: text.trim() },
  })
  return NextResponse.json({ message: msg })
}
