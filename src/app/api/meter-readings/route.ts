import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const roomId = searchParams.get('roomId');
    
    const where = roomId ? { roomId: parseInt(roomId) } : {};
    
    const meterReadings = await prisma.meterReading.findMany({
      where,
      include: {
        room: {
          include: {
            building: true,
          },
        },
      },
      orderBy: {
        readingDate: 'desc',
      },
    });
    return NextResponse.json(meterReadings);
  } catch (error) {
    console.error('Error fetching meter readings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch meter readings' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { roomId, readingDate, electricity, water, isManual, recordedBy } = body;

    const meterReading = await prisma.meterReading.create({
      data: {
        roomId,
        readingDate: new Date(readingDate),
        electricity: electricity ? parseFloat(electricity) : null,
        water: water ? parseFloat(water) : null,
        isManual: isManual || false,
        recordedBy,
      },
      include: {
        room: {
          include: {
            building: true,
          },
        },
      },
    });

    return NextResponse.json(meterReading, { status: 201 });
  } catch (error) {
    console.error('Error creating meter reading:', error);
    return NextResponse.json(
      { error: 'Failed to create meter reading' },
      { status: 500 }
    );
  }
}
