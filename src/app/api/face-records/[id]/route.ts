import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

interface RouteParams {
  params: { id: string };
}

export async function GET(request: Request, { params }: RouteParams) {
  try {
    const faceRecord = await prisma.faceRecord.findUnique({
      where: { id: parseInt(params.id) },
      include: {
        person: true,
      },
    });

    if (!faceRecord) {
      return NextResponse.json(
        { error: 'Face record not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(faceRecord);
  } catch (error) {
    console.error('Error fetching face record:', error);
    return NextResponse.json(
      { error: 'Failed to fetch face record' },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request, { params }: RouteParams) {
  try {
    const body = await request.json();
    const { faceData, isActive } = body;

    const faceRecord = await prisma.faceRecord.update({
      where: { id: parseInt(params.id) },
      data: {
        faceData,
        isActive,
      },
      include: {
        person: true,
      },
    });

    return NextResponse.json(faceRecord);
  } catch (error) {
    console.error('Error updating face record:', error);
    return NextResponse.json(
      { error: 'Failed to update face record' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    await prisma.faceRecord.delete({
      where: { id: parseInt(params.id) },
    });

    return NextResponse.json(
      { message: 'Face record deleted successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error deleting face record:', error);
    return NextResponse.json(
      { error: 'Failed to delete face record' },
      { status: 500 }
    );
  }
}
