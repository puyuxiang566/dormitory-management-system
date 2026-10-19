import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const accessRecords = await prisma.accessRecord.findMany({
      include: {
        person: {
          include: {
            building: true,
            room: true,
          },
        },
      },
      orderBy: {
        timestamp: 'desc',
      },
    });
    return NextResponse.json(accessRecords);
  } catch (error) {
    console.error('Error fetching access records:', error);
    return NextResponse.json(
      { error: 'Failed to fetch access records' },
      { status: 500 }
    );
  }
}
