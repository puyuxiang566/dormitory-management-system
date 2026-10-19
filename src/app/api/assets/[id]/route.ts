import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const asset = await prisma.asset.findUnique({
      where: { id: parseInt(params.id) },
      include: {
        room: { select: { roomNumber: true } },
        person: { select: { name: true, employeeId: true } },
      },
    });

    if (!asset) {
      return NextResponse.json(
        { error: 'Asset not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: asset });
  } catch (error) {
    console.error('Fetch asset error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch asset' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const {
      assetCode,
      name,
      category,
      status,
      specification,
      purchaseDate,
      price,
      responsiblePersonId,
      roomId,
      description,
    } = body;

    const data: any = {};
    if (assetCode !== undefined) data.assetCode = assetCode;
    if (name !== undefined) data.name = name;
    if (category !== undefined) data.category = category;
    if (status !== undefined) data.status = status;
    if (specification !== undefined) data.specification = specification;
    if (description !== undefined) data.description = description;

    if (purchaseDate !== undefined) data.purchaseDate = purchaseDate ? new Date(purchaseDate) : null;
    if (price !== undefined) data.price = price ? Number(price) : null;
    if (responsiblePersonId !== undefined) data.responsiblePersonId = responsiblePersonId ? parseInt(responsiblePersonId) : null;
    if (roomId !== undefined) {
      if (roomId === null) {
        data.roomId = null;
      } else {
        data.roomId = parseInt(roomId);
      }
    }

    const asset = await prisma.asset.update({
      where: { id: parseInt(params.id) },
      data,
      include: {
        room: { select: { roomNumber: true } },
        person: { select: { name: true, employeeId: true } },
      },
    });

    return NextResponse.json({ data: asset, message: 'Asset updated successfully' });
  } catch (error: any) {
    console.error('Update asset error:', error);
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: '资产编码已存在' },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to update asset' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await prisma.asset.delete({
      where: { id: parseInt(params.id) },
    });

    return NextResponse.json({ message: 'Asset deleted successfully' });
  } catch (error) {
    console.error('Delete asset error:', error);
    return NextResponse.json(
      { error: 'Failed to delete asset' },
      { status: 500 }
    );
  }
}
