import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const faceRecords = await prisma.faceRecord.findMany({
      include: {
        person: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
    return NextResponse.json(faceRecords);
  } catch (error) {
    console.error('Error fetching face records:', error);
    return NextResponse.json(
      { error: 'Failed to fetch face records' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { personId, faceData } = body;

    const faceRecord = await prisma.faceRecord.create({
      data: {
        personId,
        faceData,
        isActive: true,
      },
      include: {
        person: true,
      },
    });

    return NextResponse.json(faceRecord, { status: 201 });
  } catch (error) {
    console.error('Error creating face record:', error);
    return NextResponse.json(
      { error: 'Failed to create face record' },
      { status: 500 }
    );
  }
}
