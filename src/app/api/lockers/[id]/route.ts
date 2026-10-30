import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// GET /api/lockers/[id] 柜详情 + 变更历史
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const locker = await prisma.locker.findUnique({
      where: { id: Number(id) },
      include: {
        assignments: { orderBy: { assignedAt: 'desc' } },
      },
    });
    if (!locker) return NextResponse.json({ error: '更衣柜不存在' }, { status: 404 });
    // 该柜所在排（同性别+同排名）的全量最大层号，用于「上排/下排/中排」标签
    const rowMax = await prisma.locker.aggregate({
      where: { gender: locker.gender, rowName: locker.rowName },
      _max: { subRow: true },
    });
    return NextResponse.json({ data: { ...locker, maxSub: rowMax._max.subRow ?? 1 } });
  } catch (error) {
    console.error('Error fetching locker:', error);
    return NextResponse.json({ error: 'Failed to fetch locker' }, { status: 500 });
  }
}

// PATCH /api/lockers/[id] 操作：assign / release / disable / enable / note / edit / editAssignment / deleteAssignment
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const lockerId = Number(id);
    const body = await request.json();
    const { action, employeeId, employeeName, factory, department, reason, note, lockerNo, subRow } = body;

    const locker = await prisma.locker.findUnique({ where: { id: lockerId } });
    if (!locker) return NextResponse.json({ error: '更衣柜不存在' }, { status: 404 });

    if (action === 'assign') {
      if (!employeeId) return NextResponse.json({ error: '工号必填' }, { status: 400 });
      if (locker.status === 'OCCUPIED') {
        return NextResponse.json({ error: '该柜已有使用人，请先回收' }, { status: 400 });
      }
      if (locker.status === 'DISABLED') {
        return NextResponse.json({ error: '该柜已停用' }, { status: 400 });
      }

      // 一人一柜校验
      const active = await prisma.lockerAssignment.findFirst({
        where: { employeeId, status: 'ACTIVE' },
        include: { locker: true },
      });
      if (active) {
        return NextResponse.json(
          { error: `该员工已占用柜号 ${active.locker.lockerNo}（${active.locker.rowName}），一人一柜不可重复分配` },
          { status: 400 }
        );
      }

      // 从人员档案带出姓名/部门/工厂（录入值为空时）
      let finalName = employeeName || '';
      let finalFactory = factory || null;
      let finalDepartment = department || null;
      const person = await prisma.person.findFirst({
        where: { employeeId },
        select: { name: true, factory: true, department: true },
      });
      if (person) {
        if (!finalName) finalName = person.name;
        if (finalFactory == null || finalFactory === '') finalFactory = person.factory;
        if (finalDepartment == null || finalDepartment === '') finalDepartment = person.department;
      }
      if (!finalName) return NextResponse.json({ error: '未找到该工号对应的人员档案，请手工填写姓名' }, { status: 400 });

      const [, assignment] = await prisma.$transaction([
        prisma.locker.update({ where: { id: lockerId }, data: { status: 'OCCUPIED' } }),
        prisma.lockerAssignment.create({
          data: { lockerId, employeeId, employeeName: finalName, factory: finalFactory, department: finalDepartment, reason: reason || null },
        }),
      ]);
      return NextResponse.json({ data: assignment, autoFilled: !!person }, { status: 201 });
    }

    if (action === 'release') {
      const updated = await prisma.lockerAssignment.updateMany({
        where: { lockerId, status: 'ACTIVE' },
        data: { status: 'RELEASED', releasedAt: new Date(), reason: reason || undefined },
      });
      await prisma.locker.update({ where: { id: lockerId }, data: { status: 'FREE' } });
      return NextResponse.json({ data: { released: updated.count } });
    }

    if (action === 'disable' || action === 'enable') {
      if (action === 'disable' && locker.status === 'OCCUPIED') {
        return NextResponse.json({ error: '该柜使用中，请先回收再停用' }, { status: 400 });
      }
      const status = action === 'disable' ? 'DISABLED' : 'FREE';
      await prisma.locker.update({ where: { id: lockerId }, data: { status } });
      return NextResponse.json({ data: { status } });
    }

    if (action === 'note') {
      await prisma.locker.update({ where: { id: lockerId }, data: { note: note ?? null } });
      return NextResponse.json({ data: { ok: true } });
    }

    // 编辑柜子：修改柜号 / 层号 / 备注
    if (action === 'edit') {
      const newNo = typeof lockerNo === 'string' && lockerNo.trim() ? lockerNo.trim() : locker.lockerNo;
      const newSub = Number.isFinite(Number(subRow)) && Number(subRow) > 0 ? Number(subRow) : locker.subRow;
      if (newNo !== locker.lockerNo || newSub !== locker.subRow) {
        const dup = await prisma.locker.findUnique({
          where: { gender_rowName_subRow_lockerNo: { gender: locker.gender, rowName: locker.rowName, subRow: newSub, lockerNo: newNo } },
        });
        if (dup && dup.id !== lockerId) {
          return NextResponse.json({ error: `${locker.rowName} 第${newSub}排已存在柜号 ${newNo}` }, { status: 400 });
        }
      }
      const updated = await prisma.locker.update({
        where: { id: lockerId },
        data: { lockerNo: newNo, subRow: newSub, note: note ?? locker.note },
      });
      return NextResponse.json({ data: updated });
    }

    // 编辑变更历史记录（工号/姓名/工厂/部门/原因）
    if (action === 'editAssignment') {
      const assignmentId = Number(body.assignmentId);
      const assignment = await prisma.lockerAssignment.findUnique({ where: { id: assignmentId } });
      if (!assignment || assignment.lockerId !== lockerId) {
        return NextResponse.json({ error: '变更记录不存在' }, { status: 404 });
      }
      const newEmployeeId = typeof employeeId === 'string' ? employeeId.trim() : '';
      const newEmployeeName = typeof employeeName === 'string' ? employeeName.trim() : '';
      if (!newEmployeeId || !newEmployeeName) {
        return NextResponse.json({ error: '工号和姓名必填' }, { status: 400 });
      }
      // 使用中记录改工号时，保持一人一柜约束
      if (assignment.status === 'ACTIVE' && newEmployeeId !== assignment.employeeId) {
        const active = await prisma.lockerAssignment.findFirst({
          where: { employeeId: newEmployeeId, status: 'ACTIVE' },
          include: { locker: true },
        });
        if (active && active.lockerId !== lockerId) {
          return NextResponse.json(
            { error: `该工号已占用柜号 ${active.locker.lockerNo}（${active.locker.rowName}），一人一柜不可重复` },
            { status: 400 }
          );
        }
      }
      const updated = await prisma.lockerAssignment.update({
        where: { id: assignmentId },
        data: {
          employeeId: newEmployeeId,
          employeeName: newEmployeeName,
          factory: typeof factory === 'string' && factory.trim() ? factory.trim() : null,
          department: typeof department === 'string' && department.trim() ? department.trim() : null,
          reason: typeof reason === 'string' && reason.trim() ? reason.trim() : null,
        },
      });
      return NextResponse.json({ data: updated });
    }

    // 删除变更历史记录（使用中的记录不可删除，避免柜子状态不一致）
    if (action === 'deleteAssignment') {
      const assignmentId = Number(body.assignmentId);
      const assignment = await prisma.lockerAssignment.findUnique({ where: { id: assignmentId } });
      if (!assignment || assignment.lockerId !== lockerId) {
        return NextResponse.json({ error: '变更记录不存在' }, { status: 404 });
      }
      if (assignment.status === 'ACTIVE') {
        return NextResponse.json({ error: '使用中的记录不可删除，请先回收' }, { status: 400 });
      }
      await prisma.lockerAssignment.delete({ where: { id: assignmentId } });
      return NextResponse.json({ data: { ok: true } });
    }

    return NextResponse.json({ error: '未知操作' }, { status: 400 });
  } catch (error) {
    console.error('Error updating locker:', error);
    return NextResponse.json({ error: 'Failed to update locker' }, { status: 500 });
  }
}

// DELETE /api/lockers/[id] 删除柜子（使用中禁止删除；历史记录级联删除）
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const lockerId = Number(id);
    const locker = await prisma.locker.findUnique({
      where: { id: lockerId },
      include: { assignments: { where: { status: 'ACTIVE' } } },
    });
    if (!locker) return NextResponse.json({ error: '更衣柜不存在' }, { status: 404 });
    if (locker.assignments.length > 0) {
      return NextResponse.json({ error: '该柜使用中，请先回收再删除' }, { status: 400 });
    }
    await prisma.locker.delete({ where: { id: lockerId } });
    return NextResponse.json({ data: { ok: true } });
  } catch (error) {
    console.error('Error deleting locker:', error);
    return NextResponse.json({ error: 'Failed to delete locker' }, { status: 500 });
  }
}
