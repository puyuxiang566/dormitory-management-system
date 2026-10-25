import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { normalizeFactoryCode } from '@/lib/factory-utils';

const CODE_PATTERN = /^[A-Za-z0-9_\-\u4e00-\u9fa5]+$/;
const COLOR_PATTERN = /^#[0-9A-Fa-f]{6}$/;

interface RouteParams {
  params: { id: string };
}

export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const id = parseInt(params.id);
    if (isNaN(id)) {
      return NextResponse.json({ error: '无效的工厂ID' }, { status: 400 });
    }

    const existing = await prisma.factory.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: '工厂配置不存在' }, { status: 404 });
    }

    const body = await request.json();
    const data: {
      code?: string;
      name?: string;
      color?: string;
      sortOrder?: number;
      isActive?: boolean;
    } = {};

    let nextCode = existing.code;

    if (body.code !== undefined) {
      nextCode = normalizeFactoryCode(body.code);
      if (!nextCode || !CODE_PATTERN.test(nextCode)) {
        return NextResponse.json({ error: '工厂代号不能为空，且只能包含字母、数字、中文、下划线或短横线' }, { status: 400 });
      }

      if (nextCode !== existing.code) {
        const duplicate = await prisma.factory.findUnique({ where: { code: nextCode } });
        if (duplicate) {
          return NextResponse.json({ error: '工厂代号已存在' }, { status: 400 });
        }
      }
    }

    if (body.name !== undefined) {
      const name = typeof body.name === 'string' ? body.name.trim() : '';
      if (!name) {
        return NextResponse.json({ error: '工厂名称不能为空' }, { status: 400 });
      }
      data.name = name;
    }

    if (body.color !== undefined) {
      const color = typeof body.color === 'string' ? body.color.trim() : '';
      if (color && !COLOR_PATTERN.test(color)) {
        return NextResponse.json({ error: '工厂颜色格式不正确' }, { status: 400 });
      }
      data.color = color || '#10b981';
    }

    if (typeof body.sortOrder === 'number') {
      data.sortOrder = body.sortOrder;
    }

    if (typeof body.isActive === 'boolean') {
      data.isActive = body.isActive;
    }

    const updated = await prisma.$transaction(async (tx) => {
      if (nextCode !== existing.code) {
        data.code = nextCode;
        const legacyCodes = Array.from(new Set([
          existing.code,
          existing.name,
          existing.code.toUpperCase(),
          existing.name.toUpperCase(),
        ])).filter(Boolean);

        await tx.person.updateMany({
          where: { factory: { in: legacyCodes } },
          data: { factory: nextCode },
        });

        await tx.inspectionRecord.updateMany({
          where: { factory: { in: legacyCodes } },
          data: { factory: nextCode },
        });
      }

      return tx.factory.update({ where: { id }, data });
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error updating factory:', error);
    return NextResponse.json({ error: '更新工厂配置失败' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const id = parseInt(params.id);
    if (isNaN(id)) {
      return NextResponse.json({ error: '无效的工厂ID' }, { status: 400 });
    }

    const existing = await prisma.factory.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: '工厂配置不存在' }, { status: 404 });
    }

    await prisma.factory.update({
      where: { id },
      data: { isActive: false },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting factory:', error);
    return NextResponse.json({ error: '停用工厂配置失败' }, { status: 500 });
  }
}
