import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const members = await prisma.member.findMany({
      orderBy: { full_name: 'asc' }
    });
    return NextResponse.json(members, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('Error fetching members:', error);
    return NextResponse.json({ error: 'Failed to fetch members' }, { status: 500, headers: { 'Cache-Control': 'no-store' } });
  }
} 