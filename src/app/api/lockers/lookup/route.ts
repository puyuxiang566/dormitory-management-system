import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// GET /api/lockers/lookup?employeeId=xxx
// 输入工号 -> 从人员档案带出姓名/性别/部门/工厂，并检查是否已占用柜子
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const employeeId = (searchParams.get('employeeId') || '').trim();
    if (!employeeId) {
      return NextResponse.json({ error: '请输入工号' }, { status: 400 });
    }

    const persons = await prisma.person.findMany({
      where: { employeeId },
      select: { id: true, name: true, gender: true, employeeId: true, department: true, factory: true },
      take: 5,
    });

    const active = await prisma.lockerAssignment.findFirst({
      where: { employeeId, status: 'ACTIVE' },
      include: { locker: true },
    });

    return NextResponse.json({
      persons,
      currentLocker: active
        ? {
            id: active.locker.id,
            gender: active.locker.gender,
            rowName: active.locker.rowName,
            subRow: active.locker.subRow,
            lockerNo: active.locker.lockerNo,
          }
        : null,
    });
  } catch (error) {
    console.error('Error looking up employee:', error);
    return NextResponse.json({ error: 'Failed to lookup employee' }, { status: 500 });
  }
}
