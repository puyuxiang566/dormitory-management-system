import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { normalizeFactoryCode } from '@/lib/factory-utils';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    // 分页参数
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '10');

    // 筛选参数
    const search = searchParams.get('search') || '';
    const factory = normalizeFactoryCode(searchParams.get('factory') || '');
    const department = searchParams.get('department') || '';
    const categoryId = searchParams.get('categoryId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // 构建查询条件
    const where: any = {};

    // 搜索：personName 或 roomNumber
    if (search) {
      where.OR = [
        { personName: { contains: search } },
        { roomNumber: { contains: search } },
      ];
    }

    if (factory) {
      where.factory = factory;
    }

    if (department) {
      where.department = department;
    }

    if (categoryId) {
      where.categoryId = parseInt(categoryId);
    }

    if (startDate || endDate) {
      where.inspectionDate = {};
      if (startDate) {
        where.inspectionDate.gte = new Date(startDate);
      }
      if (endDate) {
        where.inspectionDate.lte = new Date(endDate);
      }
    }

    // 获取总数
    const total = await prisma.inspectionRecord.count({ where });

    // 获取数据，包含 category 关联
    const records = await prisma.inspectionRecord.findMany({
      where,
      include: {
        category: true,
        person: true,
      },
      orderBy: {
        inspectionDate: 'desc',
      },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    return NextResponse.json({
      data: records,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (error) {
    console.error('Error fetching inspection records:', error);
    return NextResponse.json(
      { error: 'Failed to fetch inspection records' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
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

    // 创建检查记录
    const record = await prisma.inspectionRecord.create({
      data: {
        inspectionDate: new Date(inspectionDate),
        roomNumber,
        factory: normalizeFactoryCode(factory),
        department,
        personName,
        personId: personId || null,
        categoryId: categoryId || null,
        violationDesc,
        action: action || null,
        inspector,
        notes: notes || null,
      },
      include: {
        category: true,
        person: true,
      },
    });

    return NextResponse.json(record, { status: 201 });
  } catch (error) {
    console.error('Error creating inspection record:', error);
    return NextResponse.json(
      { error: 'Failed to create inspection record' },
      { status: 500 }
    );
  }
}