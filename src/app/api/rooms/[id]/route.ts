import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const roomId = parseInt(params.id);

    // 首先释放此房间被分配的人员关联
    await prisma.person.updateMany({
      where: { roomId },
      data: { roomId: null, bedNumber: null },
    });

    // 删除关联资产
    await prisma.asset.deleteMany({
      where: { roomId },
    });

    // 最后删除房间
    await prisma.room.delete({
      where: { id: roomId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting room:', error);
    return NextResponse.json(
      { error: 'Failed to delete room' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const roomId = parseInt(params.id);
    const body = await request.json();

    const room = await prisma.room.update({
      where: { id: roomId },
      data: body,
    });

    return NextResponse.json(room);
  } catch (error) {
    console.error('Error updating room:', error);
    return NextResponse.json(
      { error: 'Failed to update room' },
      { status: 500 }
    );
  }
}
