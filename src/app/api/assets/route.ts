import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const roomId = searchParams.get('roomId');
    const category = searchParams.get('category');
    const status = searchParams.get('status');

    const where: any = {};
    if (roomId) where.roomId = parseInt(roomId);
    if (category) where.category = category;
    if (status) where.status = status;

    const assets = await (prisma.asset as any).findMany({
      where,
      include: {
        room: { select: { roomNumber: true } },
        person: { select: { name: true, employeeId: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ data: assets });
  } catch (error: any) {
    console.error('Fetch assets error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch assets' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      assetCode,
      name,
      category,
      status = 'IN_USE',
      specification,
      purchaseDate,
      price,
      responsiblePersonId,
      roomId,
      description,
    } = body;

    if (!assetCode || !name || !category) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }
    if (!roomId) {
      return NextResponse.json({ error: '必须指定房间 ID' }, { status: 400 });
    }

    // 检查资产编码是否已存在
    const existingAsset = await prisma.asset.findUnique({
      where: { assetCode },
    });

    if (existingAsset) {
      // 资产已存在，检查是否已绑定到其他房间
      if (existingAsset.roomId && existingAsset.roomId !== parseInt(roomId)) {
        return NextResponse.json(
          { error: '该资产已绑定到其他房间' },
          { status: 400 }
        );
      }
      // 如果没有绑定或绑定到同一房间，则更新绑定
      const asset = await (prisma.asset as any).update({
        where: { id: existingAsset.id },
        data: {
          name,
          type: category,
          status,
          specification,
          purchaseDate: purchaseDate ? new Date(purchaseDate) : undefined,
          price: price ? Number(price) : undefined,
          responsiblePersonId: responsiblePersonId ? parseInt(responsiblePersonId) : null,
          roomId: parseInt(roomId),
          description,
        },
        include: {
          room: { select: { roomNumber: true } },
          person: { select: { name: true, employeeId: true } },
        },
      });
      return NextResponse.json({ data: asset, message: 'Asset updated successfully' }, { status: 200 });
    }

    const asset = await (prisma.asset as any).create({
      data: {
        assetCode,
        name,
        type: category,
        status,
        specification,
        purchaseDate: purchaseDate ? new Date(purchaseDate) : undefined,
        price: price ? Number(price) : undefined,
        responsiblePersonId: responsiblePersonId ? parseInt(responsiblePersonId) : null,
        roomId: parseInt(roomId),
        description,
      },
      include: {
        room: { select: { roomNumber: true } },
        person: { select: { name: true, employeeId: true } },
      },
    });

    return NextResponse.json({ data: asset, message: 'Asset created successfully' }, { status: 201 });
  } catch (error: any) {
    console.error('Create asset error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create asset' },
      { status: 500 }
    );
  }
}
