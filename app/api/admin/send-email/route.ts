import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { isAdmin } from '@/lib/auth'
import nodemailer from 'nodemailer'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  if (!isAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { subject, body, member_ids } = await request.json()
  if (!subject || !body || !member_ids?.length) {
    return NextResponse.json({ error: 'subject, body, and member_ids are required' }, { status: 400 })
  }

  const members = await prisma.member.findMany({
    where: { id: { in: member_ids }, is_active: true },
    select: { email: true, full_name: true },
  })

  if (!members.length) {
    return NextResponse.json({ error: 'No valid members found' }, { status: 400 })
  }

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: 'matthew.mcalear@gmail.com',
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  })

  const to = members.map((m) => m.email).join(', ')

  await transporter.sendMail({
    from: '"Summer Swing League" <matthew.mcalear@gmail.com>',
    to,
    subject,
    text: body,
    html: body.replace(/\n/g, '<br>'),
  })

  return NextResponse.json({ sent: members.length })
}
