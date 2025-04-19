import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET() {
  try {
    const scores = await prisma.score.findMany({
      orderBy: {
        play_date: 'desc'
      },
      take: 10 // Limit to 10 most recent scores
    });

    return NextResponse.json(scores);
  } catch (error) {
    console.error('Error fetching scores:', error);
    return NextResponse.json(
      { error: 'Failed to fetch scores' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const {
      player,              // member id (string | number)
      holes,
      gross,
      course_name,
      difficulty,
      play_date,
      group_member_ids: groupMemberIdsRaw = [] // array of additional member ids (excluding player)
    } = await request.json();

    // Basic validation
    if (!player || !holes || !gross || !course_name || !difficulty || !play_date) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const playerId = Number(player);
    if (Number.isNaN(playerId)) {
      return NextResponse.json({ error: 'Invalid player id' }, { status: 400 });
    }

    // Fetch main player and optional group members
    const mainPlayer = await prisma.member.findUnique({ where: { id: playerId } });
    if (!mainPlayer) {
      return NextResponse.json({ error: 'Player not found' }, { status: 404 });
    }

    const groupMemberIds: number[] = Array.isArray(groupMemberIdsRaw)
      ? groupMemberIdsRaw.map((id: any) => Number(id)).filter((id) => !Number.isNaN(id) && id !== playerId)
      : [];

    const groupMembers = await prisma.member.findMany({ where: { id: { in: groupMemberIds } } });

    // Build comma‑separated player string (main player first)
    const playerNames = [
      mainPlayer.full_name,
      ...groupMembers.map((member: { full_name: string }) => member.full_name),
    ];
    const playerString = playerNames.join(', ');

    // ---------- Scoring logic ----------
    const handicapIndex = mainPlayer.handicap;
    const grossScore = Number(gross);
    const holesPlayed = Number(holes);
    const difficultyFactor = Number(difficulty);

    let basePoints: number;
    if (holesPlayed === 9) {
      const nineHoleHandicap = handicapIndex / 2;
      basePoints = 75 - (grossScore - nineHoleHandicap);
    } else {
      basePoints = 150 - ((grossScore - handicapIndex) * 0.5);
    }

    const difficultyAdjusted = basePoints * difficultyFactor;
    const totalGroupMembers = playerNames.length; // includes self
    const totalPoints = difficultyAdjusted + totalGroupMembers;

    // Persist score
    const created = await prisma.score.create({
      data: {
        player: playerString,
        holes: holesPlayed,
        gross: grossScore,
        handicap: handicapIndex,
        difficulty: difficultyFactor,
        group_members: totalGroupMembers,
        total_points: totalPoints,
        play_date: new Date(play_date),
        course_name,
      },
    });

    return NextResponse.json({ success: true, score: created });
  } catch (error) {
    console.error('Error submitting score:', error);
    return NextResponse.json({ error: 'Failed to submit score' }, { status: 500 });
  }
} 