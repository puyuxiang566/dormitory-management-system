/**
 * 单个权限分组管理 API
 */

import { NextResponse } from 'next/server';
import {
  updatePermissionGroup,
  deletePermissionGroup,
  getPermissionGroupMembers,
  assignPermissionToFaceRecord,
} from '@/lib/services/permissionGroupService';
import { prisma } from '@/lib/prisma';

interface RouteParams {
  params: { id: string };
}

export async function GET(request: Request, { params }: RouteParams) {
  try {
    const id = parseInt(params.id);
    const members = await getPermissionGroupMembers(id);
    
    const group = await prisma.permissionGroup.findUnique({
      where: { id },
      include: { building: true },
    });

    if (!group) {
      return NextResponse.json(
        { error: 'Permission group not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      ...group,
      members,
    });
  } catch (error) {
    console.error('Error fetching permission group:', error);
    return NextResponse.json(
      { error: 'Failed to fetch permission group' },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request, { params }: RouteParams) {
  try {
    const id = parseInt(params.id);
    const body = await request.json();

    // 检查是否是分配权限的操作
    if (body.faceRecordId && body.permissionGroupId) {
      // 分配权限
      const result = await assignPermissionToFaceRecord({
        faceRecordId: body.faceRecordId,
        permissionGroupId: body.permissionGroupId,
      });

      if (result.success) {
        return NextResponse.json({ message: 'Permission assigned successfully' });
      } else {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }
    } else {
      // 更新权限组
      const { name, description, buildingId } = body;
      const result = await updatePermissionGroup(id, {
        name,
        description,
        buildingId,
      });

      if (result.success) {
        const group = await prisma.permissionGroup.findUnique({
          where: { id },
          include: { building: true },
        });
        return NextResponse.json(group);
      } else {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }
    }
  } catch (error) {
    console.error('Error updating permission group:', error);
    return NextResponse.json(
      { error: 'Failed to update permission group' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const id = parseInt(params.id);
    const result = await deletePermissionGroup(id);

    if (result.success) {
      return NextResponse.json({ message: 'Permission group deleted successfully' });
    } else {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
  } catch (error) {
    console.error('Error deleting permission group:', error);
    return NextResponse.json(
      { error: 'Failed to delete permission group' },
      { status: 500 }
    );
  }
}
