import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// 获取工单列表
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // 分页参数
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '10');
    
    // 筛选参数
    const status = searchParams.get('status');
    const statusIn = searchParams.get('statusIn');
    const search = searchParams.get('search');
    const buildingId = searchParams.get('buildingId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // 构建查询条件（楼栋筛选与搜索 OR 用 AND 组合，避免歧义）
    const andParts: Record<string, unknown>[] = [];

    if (statusIn && statusIn.trim()) {
      const parts = statusIn
        .split(',')
        .map((s) => s.trim().toUpperCase())
        .filter(Boolean);
      if (parts.length) {
        andParts.push({ status: { in: parts } });
      }
    } else if (status && status !== 'all') {
      andParts.push({ status: status.toUpperCase() });
    }

    if (buildingId && buildingId !== 'all') {
      andParts.push({ room: { buildingId: parseInt(buildingId, 10) } });
    }

    if (startDate && /^\d{4}-\d{2}-\d{2}$/.test(startDate)) {
      andParts.push({ createdAt: { gte: new Date(`${startDate}T00:00:00`) } });
    }
    if (endDate && /^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
      andParts.push({ createdAt: { lte: new Date(`${endDate}T23:59:59.999`) } });
    }

    if (search && search.trim()) {
      const q = search.trim();
      andParts.push({
        OR: [
          { title: { contains: q } },
          { description: { contains: q } },
          { person: { name: { contains: q } } },
          { room: { roomNumber: { contains: q } } },
        ],
      });
    }

    const where =
      andParts.length === 0
        ? {}
        : andParts.length === 1
          ? andParts[0]
          : { AND: andParts };
    
    // 获取总数
    const total = await prisma.maintenanceTicket.count({ where });
    
    // 获取数据
    const tickets = await prisma.maintenanceTicket.findMany({
      where,
      include: {
        person: {
          select: {
            id: true,
            name: true,
            employeeId: true,
            phone: true,
          },
        },
        room: {
          select: {
            id: true,
            roomNumber: true,
            building: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    // 转换数据，添加 reportedBy 到响应中
    const ticketsWithReporter = tickets.map(ticket => ({
      ...ticket,
      reporterName: ticket.reportedBy || (ticket.person?.name) || '未指定',
    }));
    
    return NextResponse.json({
      data: ticketsWithReporter,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (error) {
    console.error('Error fetching maintenance tickets:', error);
    return NextResponse.json(
      { error: '获取工单列表失败' },
      { status: 500 }
    );
  }
}

// 创建工单
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      buildingId: bodyBuildingId,
      roomNumber: bodyRoomNumber,
      title,
      description,
      images,
      personId,
      reportedBy,
    } = body;

    if (bodyBuildingId == null || bodyBuildingId === '') {
      return NextResponse.json(
        { error: '请选择楼栋' },
        { status: 400 }
      );
    }
    const rn =
      bodyRoomNumber != null ? String(bodyRoomNumber).trim() : '';
    if (!rn) {
      return NextResponse.json(
        { error: '请填写房间号' },
        { status: 400 }
      );
    }
    const bid = parseInt(String(bodyBuildingId), 10);
    if (Number.isNaN(bid)) {
      return NextResponse.json({ error: '楼栋无效' }, { status: 400 });
    }
    const room = await prisma.room.findUnique({
      where: {
        buildingId_roomNumber: { buildingId: bid, roomNumber: rn },
      },
      include: { building: { select: { name: true } } },
    });
    if (!room) {
      return NextResponse.json(
        { error: '未找到该楼栋下的房间，请核对房间号' },
        { status: 400 }
      );
    }

    const reason =
      description != null && String(description).trim()
        ? String(description).trim()
        : '';
    if (!reason) {
      return NextResponse.json(
        { error: '请填写问题原因' },
        { status: 400 }
      );
    }

    const ticketTitle =
      title && String(title).trim()
        ? String(title).trim()
        : `${room.building.name} ${room.roomNumber} 报修`;

    const ticket = await prisma.maintenanceTicket.create({
      data: {
        roomId: room.id,
        personId: personId || null,
        title: ticketTitle,
        description: reason,
        images: images ? JSON.stringify(images) : null,
        status: 'OPEN',
        reportedBy: reportedBy || null,
      },
      include: {
        person: {
          select: {
            id: true,
            name: true,
            employeeId: true,
            phone: true,
          },
        },
        room: {
          select: {
            id: true,
            roomNumber: true,
            building: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });
    
    return NextResponse.json(ticket, { status: 201 });
  } catch (error) {
    console.error('Error creating maintenance ticket:', error);
    return NextResponse.json(
      { error: '创建工单失败' },
      { status: 500 }
    );
  }
}
