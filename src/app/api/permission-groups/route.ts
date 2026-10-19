/**
 * 权限分组管理 API
 */

import { NextResponse } from 'next/server';
import {
  getAllPermissionGroups,
  createPermissionGroup,
  autoAssignPermissionsByBuilding,
} from '@/lib/services/permissionGroupService';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const groups = await getAllPermissionGroups();
    return NextResponse.json(groups);
  } catch (error) {
    console.error('Error fetching permission groups:', error);
    return NextResponse.json(
      { error: 'Failed to fetch permission groups' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, description, buildingId } = body;

    const result = await createPermissionGroup({
      name,
      description,
      buildingId,
    });

    if (result.success) {
      const group = await prisma.permissionGroup.findUnique({
        where: { id: result.id },
        include: { building: true },
      });
      return NextResponse.json(group, { status: 201 });
    } else {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Error creating permission group:', error);
    return NextResponse.json(
      { error: 'Failed to create permission group' },
      { status: 500 }
    );
  }
}

// 自动分配权限
export async function PUT(request: Request) {
  try {
    const result = await autoAssignPermissionsByBuilding();
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error auto-assigning permissions:', error);
    return NextResponse.json(
      { error: 'Failed to auto-assign permissions' },
      { status: 500 }
    );
  }
}
