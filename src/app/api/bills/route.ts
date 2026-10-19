import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const personId = searchParams.get('personId');
    const year = searchParams.get('year');
    const month = searchParams.get('month');
    
    const where: any = {};
    if (personId) where.personId = parseInt(personId);
    if (year) where.year = parseInt(year);
    if (month) where.month = parseInt(month);
    
    const bills = await prisma.bill.findMany({
      where,
      include: {
        person: {
          include: {
            room: true,
            building: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
    return NextResponse.json(bills);
  } catch (error) {
    console.error('Error fetching bills:', error);
    return NextResponse.json(
      { error: 'Failed to fetch bills' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { personId, month, year, electricity, startMeterReading, endMeterReading, hotWater, coldWater, otherFees, totalAmount, status, dueDate } = body;

    const bill = await prisma.bill.create({
      data: {
        personId,
        month,
        year,
        electricity: electricity ? parseFloat(electricity) : null,
        startMeterReading: startMeterReading ? parseFloat(startMeterReading) : null,
        endMeterReading: endMeterReading ? parseFloat(endMeterReading) : null,
        hotWater: hotWater ? parseFloat(hotWater) : null,
        coldWater: coldWater ? parseFloat(coldWater) : null,
        otherFees: otherFees ? parseFloat(otherFees) : null,
        totalAmount: parseFloat(totalAmount),
        status: status || 'UNPAID',
        dueDate: dueDate ? new Date(dueDate) : null,
      },
      include: {
        person: {
          include: {
            room: true,
            building: true,
          },
        },
      },
    });

    return NextResponse.json(bill, { status: 201 });
  } catch (error) {
    console.error('Error creating bill:', error);
    return NextResponse.json(
      { error: 'Failed to create bill' },
      { status: 500 }
    );
  }
}
