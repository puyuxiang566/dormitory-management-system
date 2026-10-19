import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

interface RouteParams {
  params: { id: string };
}

export async function GET(request: Request, { params }: RouteParams) {
  try {
    const bill = await prisma.bill.findUnique({
      where: { id: parseInt(params.id) },
      include: {
        person: true,
      },
    });

    if (!bill) {
      return NextResponse.json(
        { error: 'Bill not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(bill);
  } catch (error) {
    console.error('Error fetching bill:', error);
    return NextResponse.json(
      { error: 'Failed to fetch bill' },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request, { params }: RouteParams) {
  try {
    const body = await request.json();
    const { electricity, startMeterReading, endMeterReading, hotWater, coldWater, water, otherFees, totalAmount, status, dueDate, paidAt } = body;

    const updateData: any = {};
    if (electricity !== undefined) updateData.electricity = electricity ? parseFloat(electricity) : null;
    if (startMeterReading !== undefined) updateData.startMeterReading = startMeterReading ? parseFloat(startMeterReading) : null;
    if (endMeterReading !== undefined) updateData.endMeterReading = endMeterReading ? parseFloat(endMeterReading) : null;
    if (hotWater !== undefined) updateData.hotWater = hotWater ? parseFloat(hotWater) : null;
    if (coldWater !== undefined) updateData.coldWater = coldWater ? parseFloat(coldWater) : null;
    if (water !== undefined) updateData.water = water ? parseFloat(water) : null;
    if (otherFees !== undefined) updateData.otherFees = otherFees ? parseFloat(otherFees) : null;
    if (totalAmount !== undefined) updateData.totalAmount = parseFloat(totalAmount);
    if (status !== undefined) updateData.status = status;
    if (dueDate !== undefined) updateData.dueDate = dueDate ? new Date(dueDate) : null;
    if (paidAt !== undefined) updateData.paidAt = paidAt ? new Date(paidAt) : null;

    const bill = await prisma.bill.update({
      where: { id: parseInt(params.id) },
      data: updateData,
      include: {
        person: true,
      },
    });

    return NextResponse.json(bill);
  } catch (error) {
    console.error('Error updating bill:', error);
    return NextResponse.json(
      { error: 'Failed to update bill' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    await prisma.bill.delete({
      where: { id: parseInt(params.id) },
    });

    return NextResponse.json(
      { message: 'Bill deleted successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error deleting bill:', error);
    return NextResponse.json(
      { error: 'Failed to delete bill' },
      { status: 500 }
    );
  }
}
