import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getFactoryOptions } from '@/lib/factory-config';
import { normalizeFactoryCode } from '@/lib/factory-utils';

export const dynamic = 'force-dynamic';

const CODE_PATTERN = /^[A-Za-z0-9_\-\u4e00-\u9fa5]+$/;
const COLOR_PATTERN = /^#[0-9A-Fa-f]{6}$/;

export async function GET() {
  try {
    const factories = await getFactoryOptions({ includeInactive: true });
    return NextResponse.json({ data: factories });
  } catch (error) {
    console.error('Error fetching factories:', error);
    return NextResponse.json({ error: '获取工厂配置失败' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const code = normalizeFactoryCode(body.code);
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    const color = typeof body.color === 'string' ? body.color.trim() : '';
    const sortOrder = typeof body.sortOrder === 'number' ? body.sortOrder : 0;

    if (!code || !CODE_PATTERN.test(code)) {
      return NextResponse.json({ error: '工厂代号不能为空，且只能包含字母、数字、中文、下划线或短横线' }, { status: 400 });
    }

    if (!name) {
      return NextResponse.json({ error: '工厂名称不能为空' }, { status: 400 });
    }

    if (color && !COLOR_PATTERN.test(color)) {
      return NextResponse.json({ error: '工厂颜色格式不正确' }, { status: 400 });
    }

    const duplicate = await prisma.factory.findUnique({ where: { code } });
    if (duplicate) {
      return NextResponse.json({ error: '工厂代号已存在' }, { status: 400 });
    }

    const factory = await prisma.factory.create({
      data: {
        code,
        name,
        color: color || '#10b981',
        sortOrder,
        isActive: body.isActive !== false,
      },
    });

    return NextResponse.json(factory, { status: 201 });
  } catch (error) {
    console.error('Error creating factory:', error);
    return NextResponse.json({ error: '创建工厂配置失败' }, { status: 500 });
  }
}
