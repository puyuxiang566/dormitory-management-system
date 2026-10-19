/**
 * 单个7S违规分类管理 API
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

interface RouteParams {
  params: { id: string };
}

// 获取单个分类
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const id = parseInt(params.id);

    if (isNaN(id)) {
      return NextResponse.json(
        { error: '无效的分类ID' },
        { status: 400 }
      );
    }

    const category = await prisma.violationCategory.findUnique({
      where: { id },
    });

    if (!category) {
      return NextResponse.json(
        { error: '分类不存在' },
        { status: 404 }
      );
    }

    return NextResponse.json(category);
  } catch (error) {
    console.error('Error fetching 7S category:', error);
    return NextResponse.json(
      { error: '获取7S分类详情失败' },
      { status: 500 }
    );
  }
}

// 更新分类
export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const id = parseInt(params.id);

    if (isNaN(id)) {
      return NextResponse.json(
        { error: '无效的分类ID' },
        { status: 400 }
      );
    }

    // 检查分类是否存在
    const existing = await prisma.violationCategory.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: '分类不存在' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { name, description, sortOrder } = body;

    // 如果更新名称，检查是否重复
    if (name && name.trim() !== existing.name) {
      const duplicate = await prisma.violationCategory.findUnique({
        where: { name: name.trim() },
      });

      if (duplicate) {
        return NextResponse.json(
          { error: '分类名称已存在' },
          { status: 400 }
        );
      }
    }

    const category = await prisma.violationCategory.update({
      where: { id },
      data: {
        ...(name && { name: name.trim() }),
        ...(description !== undefined && { description: description?.trim() || null }),
        ...(typeof sortOrder === 'number' && { sortOrder }),
      },
    });

    return NextResponse.json(category);
  } catch (error) {
    console.error('Error updating 7S category:', error);
    return NextResponse.json(
      { error: '更新7S分类失败' },
      { status: 500 }
    );
  }
}

// 删除分类（软删除）
export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const id = parseInt(params.id);

    if (isNaN(id)) {
      return NextResponse.json(
        { error: '无效的分类ID' },
        { status: 400 }
      );
    }

    // 检查分类是否存在
    const existing = await prisma.violationCategory.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: '分类不存在' },
        { status: 404 }
      );
    }

    // 软删除：设置 isActive = false
    await prisma.violationCategory.update({
      where: { id },
      data: { isActive: false },
    });

    return NextResponse.json({ message: '分类已删除' });
  } catch (error) {
    console.error('Error deleting 7S category:', error);
    return NextResponse.json(
      { error: '删除7S分类失败' },
      { status: 500 }
    );
  }
}