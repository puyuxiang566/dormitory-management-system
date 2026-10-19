import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// 获取单个工单详情
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id);
    
    const ticket = await prisma.maintenanceTicket.findUnique({
      where: { id },
      include: {
        person: {
          select: {
            id: true,
            name: true,
            employeeId: true,
            phone: true,
            department: true,
          },
        },
        room: {
          select: {
            id: true,
            roomNumber: true,
            floorNumber: true,
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
    
    if (!ticket) {
      return NextResponse.json(
        { error: '工单不存在' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(ticket);
  } catch (error) {
    console.error('Error fetching maintenance ticket:', error);
    return NextResponse.json(
      { error: '获取工单详情失败' },
      { status: 500 }
    );
  }
}

// 更新工单
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id);
    const body = await request.json();
    const { 
      status, 
      assignedTo, 
      title, 
      description, 
      rating,
      comment,
      resolvedAt 
    } = body;
    
    // 检查工单是否存在
    const existingTicket = await prisma.maintenanceTicket.findUnique({
      where: { id },
    });
    
    if (!existingTicket) {
      return NextResponse.json(
        { error: '工单不存在' },
        { status: 404 }
      );
    }
    
    // 构建更新数据
    const updateData: any = {};
    
    if (status) updateData.status = status.toUpperCase();
    if (assignedTo) updateData.assignedTo = parseInt(assignedTo);
    if (title) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (rating) updateData.rating = parseInt(rating);
    if (comment !== undefined) updateData.comment = comment;
    if (resolvedAt) updateData.resolvedAt = new Date(resolvedAt);
    
    // 如果状态变为已完成，自动设置完成时间
    if (status === 'COMPLETED' && !resolvedAt) {
      updateData.resolvedAt = new Date();
    }
    
    const ticket = await prisma.maintenanceTicket.update({
      where: { id },
      data: updateData,
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
    
    return NextResponse.json(ticket);
  } catch (error) {
    console.error('Error updating maintenance ticket:', error);
    return NextResponse.json(
      { error: '更新工单失败' },
      { status: 500 }
    );
  }
}

// 删除工单
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id);
    
    // 检查工单是否存在
    const existingTicket = await prisma.maintenanceTicket.findUnique({
      where: { id },
    });
    
    if (!existingTicket) {
      return NextResponse.json(
        { error: '工单不存在' },
        { status: 404 }
      );
    }
    
    await prisma.maintenanceTicket.delete({
      where: { id },
    });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting maintenance ticket:', error);
    return NextResponse.json(
      { error: '删除工单失败' },
      { status: 500 }
    );
  }
}
