import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const visitors = await prisma.visitor.findMany({
      include: {
        person: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
    return NextResponse.json(visitors);
  } catch (error) {
    console.error('Error fetching visitors:', error);
    return NextResponse.json(
      { error: 'Failed to fetch visitors' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      name,
      idCard,
      phone,
      visitPurpose,
      visitDate,
      startTime,
      endTime,
      hostId,
      status,
    } = body;

    const visitor = await prisma.visitor.create({
      data: {
        name,
        idCard,
        phone,
        visitPurpose,
        visitDate: new Date(visitDate),
        startTime: startTime ? new Date(startTime) : null,
        endTime: endTime ? new Date(endTime) : null,
        hostId,
        status: status || 'PENDING',
      },
      include: {
        person: true,
      },
    });

    return NextResponse.json(visitor, { status: 201 });
  } catch (error) {
    console.error('Error creating visitor:', error);
    return NextResponse.json(
      { error: 'Failed to create visitor' },
      { status: 500 }
    );
  }
}
