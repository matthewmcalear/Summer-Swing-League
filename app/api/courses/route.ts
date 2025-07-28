import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const scores = await prisma.score.findMany({
      select: {
        course_name: true
      }
    });
    
    const courseNames = [...new Set(scores.map(s => s.course_name))].sort();
    
    return NextResponse.json({ 
      courses: courseNames,
      total: courseNames.length 
    });
  } catch (error) {
    console.error('Error fetching courses:', error);
    return NextResponse.json(
      { error: 'Failed to fetch courses' },
      { status: 500 }
    );
  }
} 