/**
 * 7S 违规分类管理 API
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// 获取所有启用的分类
export async function GET() {
  try {
    const categories = await prisma.violationCategory.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    });
    return NextResponse.json(categories);
  } catch (error) {
    console.error('Error fetching 7S categories:', error);
    return NextResponse.json(
      { error: '获取7S分类列表失败' },
      { status: 500 }
    );
  }
}

// 创建新分类
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, description, sortOrder } = body;

    // 验证必填字段
    if (!name || typeof name !== 'string' || name.trim() === '') {
      return NextResponse.json(
        { error: '分类名称不能为空' },
        { status: 400 }
      );
    }

    // 检查名称是否已存在
    const existing = await prisma.violationCategory.findUnique({
      where: { name: name.trim() },
    });

    if (existing) {
      return NextResponse.json(
        { error: '分类名称已存在' },
        { status: 400 }
      );
    }

    const category = await prisma.violationCategory.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        sortOrder: typeof sortOrder === 'number' ? sortOrder : 0,
      },
    });

    return NextResponse.json(category, { status: 201 });
  } catch (error) {
    console.error('Error creating 7S category:', error);
    return NextResponse.json(
      { error: '创建7S分类失败' },
      { status: 500 }
    );
  }
}