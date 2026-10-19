import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const personId = searchParams.get('personId');
    const type = searchParams.get('type');
    const status = searchParams.get('status');
    
    const where: any = {};
    if (personId) where.personId = parseInt(personId);
    if (type) where.type = type;
    if (status) where.status = status;
    
    const applications = await prisma.application.findMany({
      where,
      include: {
        person: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
    return NextResponse.json(applications);
  } catch (error) {
    console.error('Error fetching applications:', error);
    return NextResponse.json(
      { error: 'Failed to fetch applications' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { personId, type, requestData, note } = body;

    const application = await prisma.application.create({
      data: {
        personId,
        type,
        status: 'PENDING',
        requestData: requestData || {},
        note,
      },
      include: {
        person: true,
      },
    });

    return NextResponse.json(application, { status: 201 });
  } catch (error) {
    console.error('Error creating application:', error);
    return NextResponse.json(
      { error: 'Failed to create application' },
      { status: 500 }
    );
  }
}
