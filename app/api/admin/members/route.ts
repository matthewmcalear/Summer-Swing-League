import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/admin';

export async function POST(req: Request) {
  try {
    await requireAdmin();
    const body = await req.json();
    const created = await prisma.member.create({ data: body });
    return NextResponse.json(created);
  } catch {
    return NextResponse.json({ error: 'Failed to create' }, { status: 500 });
  }
} 