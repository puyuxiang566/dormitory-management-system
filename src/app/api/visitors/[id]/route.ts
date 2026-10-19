import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createTemporaryFaceRecordForVisitor } from '@/lib/services/faceSyncService';

interface RouteParams {
  params: { id: string };
}

export async function GET(request: Request, { params }: RouteParams) {
  try {
    const visitor = await prisma.visitor.findUnique({
      where: { id: parseInt(params.id) },
      include: {
        person: {
          include: {
            building: true,
          },
        },
        facerecord: {
          where: { isTemporary: true },
        },
      },
    });

    if (!visitor) {
      return NextResponse.json(
        { error: 'Visitor not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      ...visitor,
      hasTempAccess: visitor.facerecord.length > 0,
      faceRecords: undefined,
    });
  } catch (error) {
    console.error('Error fetching visitor:', error);
    return NextResponse.json(
      { error: 'Failed to fetch visitor' },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request, { params }: RouteParams) {
  try {
    const visitorId = parseInt(params.id);
    const body = await request.json();

    // 获取原始访客信息
    const originalVisitor = await prisma.visitor.findUnique({
      where: { id: visitorId },
      include: { person: true },
    });

    if (!originalVisitor) {
      return NextResponse.json(
        { error: 'Visitor not found' },
        { status: 404 }
      );
    }

    const {
      name,
      idCard,
      phone,
      visitPurpose,
      visitDate,
      startTime,
      endTime,
      status,
      faceData, // 人脸数据（可选）
      autoCreateFaceAccess, // 是否自动创建临时人脸权限（可选）
    } = body;

    const updateData: any = {
      name,
      idCard,
      phone,
      visitPurpose,
      status,
    };

    if (visitDate) updateData.visitDate = new Date(visitDate);
    if (startTime) updateData.startTime = new Date(startTime);
    if (endTime) updateData.endTime = new Date(endTime);

    // 更新访客信息
    const visitor = await prisma.visitor.update({
      where: { id: visitorId },
      data: updateData,
      include: {
        person: {
          include: {
            building: true,
          },
        },
      },
    });

    // 如果状态变为 APPROVED，且提供了人脸数据或要求自动创建，则创建临时人脸权限
    let faceAccessResult = null;
    if (status === 'APPROVED' && originalVisitor.status !== 'APPROVED') {
      const finalEndTime = endTime ? new Date(endTime) : new Date(visitor.visitDate);
      finalEndTime.setHours(23, 59, 59); // 设置为当天最晚时间

      // 如果提供了人脸数据
      if (faceData) {
        faceAccessResult = await createTemporaryFaceRecordForVisitor(
          visitorId,
          faceData,
          finalEndTime
        );
      }
    }

    // 如果状态变为 REJECTED 或 COMPLETED，禁用临时权限
    if ((status === 'REJECTED' || status === 'COMPLETED') && originalVisitor.status !== status) {
      await prisma.faceRecord.updateMany({
        where: {
          visitorId,
          isTemporary: true,
          isActive: true,
        },
        data: { isActive: false },
      });
    }

    return NextResponse.json({
      ...visitor,
      faceAccess: faceAccessResult,
    });
  } catch (error) {
    console.error('Error updating visitor:', error);
    return NextResponse.json(
      { error: 'Failed to update visitor' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    await prisma.visitor.delete({
      where: { id: parseInt(params.id) },
    });

    return NextResponse.json(
      { message: 'Visitor deleted successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error deleting visitor:', error);
    return NextResponse.json(
      { error: 'Failed to delete visitor' },
      { status: 500 }
    );
  }
}
