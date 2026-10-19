import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// 统计数据响应类型
interface StatisticsResponse {
  overview: {
    total: number;
    violations: number;
    violationRate: number;
  };
  factoryDistribution: Array<{
    factory: string;
    count: number;
    rate: number;
  }>;
  departmentDistribution: Array<{
    factory: string;
    department: string;
    count: number;
    rate: number;
  }>;
  categoryDistribution: Array<{
    categoryName: string;
    count: number;
    rate: number;
  }>;
  trendData: Array<{
    date: string;
    count: number;
    monthOverMonth?: number;
    yearOverYear?: number;
  }>;
  repeatedViolators: Array<{
    personName: string;
    personId?: number;
    count: number;
    lastViolationDate: string;
    recentViolations: Array<{
      date: string;
      violationDesc: string;
    }>;
  }>;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const factory = searchParams.get('factory');
    const department = searchParams.get('department');

    // 构建基础查询条件
    const where: any = {};
    
    if (startDate || endDate) {
      where.inspectionDate = {};
      if (startDate) {
        where.inspectionDate.gte = new Date(startDate);
      }
      if (endDate) {
        where.inspectionDate.lte = new Date(endDate);
      }
    }

    if (factory) {
      where.factory = factory;
    }

    if (department) {
      where.department = department;
    }

    // 1. 基础统计
    const total = await prisma.inspectionRecord.count({ where });

    // 2. 工厂分布
    const factoryData = await prisma.inspectionRecord.groupBy({
      by: ['factory'],
      _count: { id: true },
      where,
    });

    const factoryDistribution = factoryData.map(item => ({
      factory: item.factory,
      count: item._count.id,
      rate: total > 0 ? parseFloat(((item._count.id / total) * 100).toFixed(2)) : 0,
    }));

    // 3. 部门分布（同时按工厂和部门分组，以便在前端按工厂着色）
    const departmentData = await prisma.inspectionRecord.groupBy({
      by: ['factory', 'department'],
      _count: { id: true },
      where,
    });

    const departmentDistribution = departmentData
      .map(item => ({
        factory: item.factory,
        department: item.department,
        count: item._count.id,
        rate: total > 0 ? parseFloat(((item._count.id / total) * 100).toFixed(2)) : 0,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10); // 只返回前10个部门

    // 4. 分类分布
    const categoryData = await prisma.inspectionRecord.groupBy({
      by: ['categoryId'],
      _count: { id: true },
      where,
    });

    // 获取分类名称
    const categories = await prisma.violationCategory.findMany({
      where: {
        id: { in: categoryData.map(item => item.categoryId).filter(Boolean) as number[] },
      },
    });

    const categoryMap = new Map(categories.map(cat => [cat.id, cat.name]));

    const categoryDistribution = categoryData
      .filter(item => item.categoryId !== null)
      .map(item => ({
        categoryName: categoryMap.get(item.categoryId!) || '未分类',
        count: item._count.id,
        rate: total > 0 ? parseFloat(((item._count.id / total) * 100).toFixed(2)) : 0,
      }))
      .sort((a, b) => b.count - a.count);

    // 5. 趋势数据（按月统计）
    const allRecords = await prisma.inspectionRecord.findMany({
      where,
      select: {
        inspectionDate: true,
      },
      orderBy: {
        inspectionDate: 'asc',
      },
    });

    // 按月分组
    const monthMap = new Map<string, number>();
    allRecords.forEach(record => {
      const date = new Date(record.inspectionDate);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      monthMap.set(monthKey, (monthMap.get(monthKey) || 0) + 1);
    });

    // 转换为数组并计算环比、同比
    const trendData = Array.from(monthMap.entries())
      .map(([date, count], index, array) => {
        const result: any = { date, count };
        
        // 计算环比（与上月相比）
        if (index > 0) {
          const prevCount = array[index - 1][1];
          if (prevCount > 0) {
            result.monthOverMonth = parseFloat((((count - prevCount) / prevCount) * 100).toFixed(2));
          }
        }

        // 计算同比（与去年同期相比）
        const [year, month] = date.split('-');
        const lastYearKey = `${parseInt(year) - 1}-${month}`;
        const lastYearCount = monthMap.get(lastYearKey);
        if (lastYearCount && lastYearCount > 0) {
          result.yearOverYear = parseFloat((((count - lastYearCount) / lastYearCount) * 100).toFixed(2));
        }

        return result;
      })
      .sort((a, b) => a.date.localeCompare(b.date));

    // 6. 重复违规人员（违规次数 >= 2）
    const violatorsData = await prisma.inspectionRecord.groupBy({
      by: ['personName'],
      _count: { id: true },
      where,
      having: {
        personName: { _count: { gte: 2 } },
      },
      orderBy: {
        _count: {
          id: 'desc',
        },
      },
    });

    // 获取每个违规人员的详细信息
    const repeatedViolators = await Promise.all(
      violatorsData.map(async (violator) => {
        const violations = await prisma.inspectionRecord.findMany({
          where: {
            ...where,
            personName: violator.personName,
          },
          select: {
            inspectionDate: true,
            violationDesc: true,
            personId: true,
          },
          orderBy: {
            inspectionDate: 'desc',
          },
          take: 5, // 只取最近5次
        });

        return {
          personName: violator.personName,
          personId: violations[0]?.personId || undefined,
          count: violator._count.id,
          lastViolationDate: violations[0]?.inspectionDate.toISOString().split('T')[0] || '',
          recentViolations: violations.map(v => ({
            date: v.inspectionDate.toISOString().split('T')[0],
            violationDesc: v.violationDesc,
          })),
        };
      })
    );

    // 构建响应
    const response: StatisticsResponse = {
      overview: {
        total,
        violations: total, // 当前所有记录都视为违规记录
        violationRate: 100, // 100% 因为所有记录都是违规记录
      },
      factoryDistribution,
      departmentDistribution,
      categoryDistribution,
      trendData,
      repeatedViolators,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching statistics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch statistics' },
      { status: 500 }
    );
  }
}
