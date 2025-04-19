import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(request: Request) {
  try {
    const { full_name, email, handicap } = await request.json();

    // Validate input
    if (!full_name || !email || handicap === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate handicap range
    const handicapNum = parseFloat(handicap);
    if (isNaN(handicapNum) || handicapNum < 0 || handicapNum > 54) {
      return NextResponse.json(
        { error: 'Invalid handicap value. Must be between 0 and 54.' },
        { status: 400 }
      );
    }

    // Check if email already exists
    const existingMember = await prisma.member.findFirst({
      where: { email }
    });

    if (existingMember) {
      return NextResponse.json(
        { error: 'A member with this email already exists.' },
        { status: 400 }
      );
    }

    // Create member in database
    const member = await prisma.member.create({
      data: {
        full_name,
        email,
        handicap: handicapNum,
        updated_at: new Date()
      },
    });

    return NextResponse.json({ 
      success: true, 
      member,
      message: 'Registration successful! Welcome to the Summer Swing League.'
    });
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'Failed to register member' },
      { status: 500 }
    );
  }
} 