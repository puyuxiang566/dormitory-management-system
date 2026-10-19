import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

interface RouteParams {
  params: { id: string };
}

export async function GET(request: Request, { params }: RouteParams) {
  try {
    const record = await prisma.inspectionRecord.findUnique({
      where: { id: parseInt(params.id) },
      include: { category: true, person: true },
    });

    if (!record) {
      return NextResponse.json(
        { error: '检查记录不存在' },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: record });
  } catch (error) {
    console.error('获取检查记录失败:', error);
    return NextResponse.json(
      { error: '获取检查记录失败' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const body = await request.json();
    const recordId = parseInt(params.id);

    // 检查记录是否存在
    const existingRecord = await prisma.inspectionRecord.findUnique({
      where: { id: recordId },
    });

    if (!existingRecord) {
      return NextResponse.json(
        { error: '检查记录不存在' },
        { status: 404 }
      );
    }

    const {
      inspectionDate,
      roomNumber,
      factory,
      department,
      personName,
      personId,
      categoryId,
      violationDesc,
      action,
      inspector,
      notes,
    } = body;

    const updateData: any = {};

    if (inspectionDate !== undefined) {
      updateData.inspectionDate = new Date(inspectionDate);
    }
    if (roomNumber !== undefined) {
      updateData.roomNumber = roomNumber;
    }
    if (factory !== undefined) {
      updateData.factory = factory;
    }
    if (department !== undefined) {
      updateData.department = department;
    }
    if (personName !== undefined) {
      updateData.personName = personName;
    }
    if (personId !== undefined) {
      // 通过 person 关系来更新外键，而不是直接设置 personId
      updateData.person = personId ? { connect: { id: parseInt(personId) } } : { disconnect: true };
    }
    if (categoryId !== undefined) {
      updateData.category = categoryId ? { connect: { id: categoryId } } : { disconnect: true };
    }
    if (violationDesc !== undefined) {
      updateData.violationDesc = violationDesc;
    }
    if (action !== undefined) {
      updateData.action = action;
    }
    if (inspector !== undefined) {
      updateData.inspector = inspector;
    }
    if (notes !== undefined) {
      updateData.notes = notes;
    }

    const record = await prisma.inspectionRecord.update({
      where: { id: recordId },
      data: updateData,
      include: { category: true, person: true },
    });

    return NextResponse.json({ data: record });
  } catch (error) {
    console.error('更新检查记录失败:', error);
    return NextResponse.json(
      { error: '更新检查记录失败' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const recordId = parseInt(params.id);

    // 检查记录是否存在
    const existingRecord = await prisma.inspectionRecord.findUnique({
      where: { id: recordId },
    });

    if (!existingRecord) {
      return NextResponse.json(
        { error: '检查记录不存在' },
        { status: 404 }
      );
    }

    await prisma.inspectionRecord.delete({
      where: { id: recordId },
    });

    return NextResponse.json(
      { message: '检查记录删除成功' },
      { status: 200 }
    );
  } catch (error) {
    console.error('删除检查记录失败:', error);
    return NextResponse.json(
      { error: '删除检查记录失败' },
      { status: 500 }
    );
  }
}