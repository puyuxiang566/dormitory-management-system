import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const buildingId = parseInt(params.id);

    // 首先释放此楼被分配的人员关联
    await prisma.person.updateMany({
      where: { buildingId },
      data: { buildingId: null, roomId: null, bedNumber: null },
    });

    // 然后删除属于这款楼栋的所有房间关联资产
    const rooms = await prisma.room.findMany({ where: { buildingId }, select: { id: true } });
    const roomIds = rooms.map((r) => r.id);
    await prisma.asset.deleteMany({
      where: { roomId: { in: roomIds } },
    });
    
    // 然后删除所有的房间
    await prisma.room.deleteMany({
      where: { buildingId },
    });

    // 最后删除这座楼栋
    await prisma.building.delete({
      where: { id: buildingId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting building:', error);
    return NextResponse.json(
      { error: 'Failed to delete building' },
      { status: 500 }
    );
  }
}
