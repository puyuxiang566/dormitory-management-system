import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function DELETE() {
  try {
    await prisma.$transaction([
      prisma.accessRecord.deleteMany({}),
      prisma.faceRecord.deleteMany({}),
      prisma.visitor.deleteMany({}),
      prisma.permissionGroup.deleteMany({}),
    ]);

    return NextResponse.json({
      message: '门禁数据已清空',
    });
  } catch (error) {
    console.error('Error clearing access data:', error);
    return NextResponse.json(
      { error: '清空门禁数据失败' },
      { status: 500 }
    );
  }
}
