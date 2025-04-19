import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/admin';

export async function DELETE(_req: Request, { params }: { params: { id: string }}) {
  try {
    await requireAdmin();
    await prisma.score.delete({ where: { id: Number(params.id) }});
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: { params: { id: string }}) {
  try {
    await requireAdmin();
    const body = await req.json();
    await prisma.score.update({ where: { id: Number(params.id) }, data: body });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 });
  }
} 