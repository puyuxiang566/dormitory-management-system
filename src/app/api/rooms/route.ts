import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const buildingIdRaw = searchParams.get('buildingId');
    const status = searchParams.get('status');

    // 构建查询条件
    const where: any = {};

    if (buildingIdRaw != null && buildingIdRaw !== '') {
      const buildingId = parseInt(buildingIdRaw, 10);
      if (Number.isNaN(buildingId)) {
        return NextResponse.json({ error: '楼栋 ID 无效' }, { status: 400 });
      }
      where.buildingId = buildingId;
    }

    if (status) {
      if (status === 'OCCUPIED') {
        // 已住人房间：排除关闭的房间，且必须有关联的入住人员
        where.status = { not: 'CLOSED' };
        where.person = { some: { status: 'ACTIVE' } };
      } else {
        where.status = status;
      }
    }

    const rooms = await prisma.room.findMany({
      where,
      include: {
        building: true,
        person: true,
        asset: true,
      },
      orderBy: {
        roomNumber: 'asc',
      },
    });
    return NextResponse.json({ data: rooms });
  } catch (error) {
    console.error('Error fetching rooms:', error);
    return NextResponse.json(
      { error: 'Failed to fetch rooms' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { buildingId, floorNumber, roomNumber, bedCount, status } = body;

    const room = await prisma.room.create({
      data: {
        buildingId,
        floorNumber,
        roomNumber,
        bedCount,
        status: status || 'VACANT',
      },
      include: {
        building: true,
      },
    });

    return NextResponse.json(room, { status: 201 });
  } catch (error) {
    console.error('Error creating room:', error);
    return NextResponse.json(
      { error: 'Failed to create room' },
      { status: 500 }
    );
  }
}
