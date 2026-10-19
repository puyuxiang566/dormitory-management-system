import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || 'month';
    
    const now = new Date();
    let startDate: Date;
    let endDate: Date = now;
    
    // 计算时间范围
    switch (period) {
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'lastMonth':
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        endDate = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
        break;
      case 'quarter': {
        const currentQuarter = Math.floor(now.getMonth() / 3);
        startDate = new Date(now.getFullYear(), currentQuarter * 3, 1);
        break;
      }
      case 'lastQuarter': {
        const lastQ = Math.floor(now.getMonth() / 3) - 1;
        if (lastQ < 0) {
          startDate = new Date(now.getFullYear() - 1, 9, 1);
          endDate = new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59, 999);
        } else {
          startDate = new Date(now.getFullYear(), lastQ * 3, 1);
          endDate = new Date(now.getFullYear(), (lastQ + 1) * 3, 0, 23, 59, 59, 999);
        }
        break;
      }
      case 'firstHalf':
        startDate = new Date(now.getFullYear(), 0, 1);
        endDate = new Date(now.getFullYear(), 5, 31, 23, 59, 59, 999);
        break;
      case 'secondHalf':
        startDate = new Date(now.getFullYear(), 6, 1);
        endDate = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      case 'all':
        // 全部数据：从2024年开始
        startDate = new Date(2024, 0, 1);
        break;
      default:
        // 支持按年度查询：year_2024, year_2025 等
        if (period.startsWith('year_')) {
          const year = parseInt(period.replace('year_', ''));
          if (!isNaN(year)) {
            startDate = new Date(year, 0, 1);
            endDate = new Date(year, 11, 31, 23, 59, 59, 999);
            break;
          }
        }
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    }
    
    // 并行获取所有数据
    const [flowData, checkInByFactory, checkOutByFactory, checkInByDepartment, checkOutByDepartment, checkInByFactoryDetail, summary] = await Promise.all([
      getFlowData(startDate, endDate, period),
      getCheckInByFactory(startDate, endDate, period),
      getCheckOutByFactory(startDate, endDate, period),
      getCheckInByDepartment(startDate, endDate, period),
      getCheckOutByDepartment(startDate, endDate, period),
      getCheckInByFactoryDetail(startDate, endDate, period),
      getSummary(startDate, endDate, period),
    ]);
    
    return NextResponse.json({
      flowData,
      checkInByFactory,
      checkOutByFactory,
      checkInByDepartment,
      checkOutByDepartment,
      checkInByFactoryDetail,
      summary,
    });
  } catch (error) {
    console.error('Error generating personnel flow report:', error);
    return NextResponse.json(
      { error: '生成人员流动报表失败' },
      { status: 500 }
    );
  }
}

// 获取流动趋势数据 - 批量查询优化
async function getFlowData(startDate: Date, endDate: Date, period: string) {
  // 判断是否按月聚合（>90天或全部数据时按月聚合）
  const daySpan = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  const useMonthlyAggregation = daySpan > 90 || period === 'all';

  // 批量查询所有入住记录
  const checkInRecords = await prisma.person.findMany({
    where: {
      checkInDate: { gte: startDate, lte: endDate },
    },
    select: { checkInDate: true },
  });

  // 批量查询所有退宿记录
  const checkOutRecords = await prisma.person.findMany({
    where: {
      checkOutDate: { gte: startDate, lte: endDate },
    },
    select: { checkOutDate: true },
  });

  if (useMonthlyAggregation) {
    // 按月聚合
    const monthMap: Record<string, { checkIns: number; checkOuts: number }> = {};

    checkInRecords.forEach(record => {
      const d = new Date(record.checkInDate!);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (!monthMap[key]) monthMap[key] = { checkIns: 0, checkOuts: 0 };
      monthMap[key].checkIns++;
    });

    checkOutRecords.forEach(record => {
      const d = new Date(record.checkOutDate!);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (!monthMap[key]) monthMap[key] = { checkIns: 0, checkOuts: 0 };
      monthMap[key].checkOuts++;
    });

    // 生成完整月份列表
    const data = [];
    const current = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
    const end = new Date(endDate.getFullYear(), endDate.getMonth(), 1);

    while (current <= end) {
      const key = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}`;
      const entry = monthMap[key] || { checkIns: 0, checkOuts: 0 };
      data.push({
        date: key,
        checkIns: entry.checkIns,
        checkOuts: entry.checkOuts,
        netChange: entry.checkIns - entry.checkOuts,
      });
      current.setMonth(current.getMonth() + 1);
    }

    return data;
  } else {
    // 按日聚合（<=90天）
    const dayMap: Record<string, { checkIns: number; checkOuts: number }> = {};

    checkInRecords.forEach(record => {
      const d = new Date(record.checkInDate!);
      const key = `${d.getMonth() + 1}/${d.getDate()}`;
      if (!dayMap[key]) dayMap[key] = { checkIns: 0, checkOuts: 0 };
      dayMap[key].checkIns++;
    });

    checkOutRecords.forEach(record => {
      const d = new Date(record.checkOutDate!);
      const key = `${d.getMonth() + 1}/${d.getDate()}`;
      if (!dayMap[key]) dayMap[key] = { checkIns: 0, checkOuts: 0 };
      dayMap[key].checkOuts++;
    });

    // 生成完整日期列表
    const data = [];
    for (let i = daySpan - 1; i >= 0; i--) {
      const date = new Date(endDate);
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      const key = `${date.getMonth() + 1}/${date.getDate()}`;
      const entry = dayMap[key] || { checkIns: 0, checkOuts: 0 };
      data.push({
        date: key,
        checkIns: entry.checkIns,
        checkOuts: entry.checkOuts,
        netChange: entry.checkIns - entry.checkOuts,
      });
    }

    return data;
  }
}

// 按工厂统计入住
async function getCheckInByFactory(startDate: Date, endDate: Date, period: string) {
  const isAllTime = period === 'all';
  const result = await prisma.person.groupBy({
    by: ['factory'],
    where: isAllTime
      ? { checkInDate: { gte: startDate, lte: endDate } }
      : { checkInDate: { gte: startDate, lte: endDate } },
    _count: { id: true },
  });
  
  return result.map(r => ({
    name: r.factory || '未知',
    value: r._count.id,
  }));
}

// 按工厂统计退宿
async function getCheckOutByFactory(startDate: Date, endDate: Date, period: string) {
  const result = await prisma.person.groupBy({
    by: ['factory'],
    where: {
      checkOutDate: { gte: startDate, lte: endDate },
    },
    _count: { id: true },
  });
  
  return result.map(r => ({
    name: r.factory || '未知',
    value: r._count.id,
  }));
}

// 按部门统计入住
async function getCheckInByDepartment(startDate: Date, endDate: Date, period: string) {
  const checkIns = await prisma.person.groupBy({
    by: ['department'],
    where: {
      checkInDate: { gte: startDate, lte: endDate },
    },
    _count: { id: true },
  });

  const checkOuts = await prisma.person.groupBy({
    by: ['department'],
    where: {
      checkOutDate: { gte: startDate, lte: endDate },
    },
    _count: { id: true },
  });

  // 合并入住和退宿数据
  const deptMap: Record<string, { checkIns: number; checkOuts: number }> = {};
  checkIns.forEach(r => {
    const dept = r.department || '未分配';
    deptMap[dept] = { checkIns: r._count.id, checkOuts: 0 };
  });
  checkOuts.forEach(r => {
    const dept = r.department || '未分配';
    if (!deptMap[dept]) deptMap[dept] = { checkIns: 0, checkOuts: 0 };
    deptMap[dept].checkOuts = r._count.id;
  });

  return Object.entries(deptMap).map(([department, data]) => ({
    department,
    checkIns: data.checkIns,
    checkOuts: data.checkOuts,
  }));
}

// 按部门统计退宿（已合并到 getCheckInByDepartment，此函数保留兼容）
async function getCheckOutByDepartment(startDate: Date, endDate: Date, period: string) {
  const result = await prisma.person.groupBy({
    by: ['department'],
    where: {
      checkOutDate: { gte: startDate, lte: endDate },
    },
    _count: { id: true },
  });
  
  return result.map(r => ({
    department: r.department || '未分配',
    checkOuts: r._count.id,
  }));
}

// 按工厂统计入住退宿明细（用于对比分析和变动明细）
async function getCheckInByFactoryDetail(startDate: Date, endDate: Date, period: string) {
  const checkIns = await prisma.person.groupBy({
    by: ['factory'],
    where: {
      checkInDate: { gte: startDate, lte: endDate },
    },
    _count: { id: true },
  });

  const checkOuts = await prisma.person.groupBy({
    by: ['factory'],
    where: {
      checkOutDate: { gte: startDate, lte: endDate },
    },
    _count: { id: true },
  });

  // 合并入住和退宿数据
  const factoryMap: Record<string, { checkIns: number; checkOuts: number }> = {};
  checkIns.forEach(r => {
    const factory = r.factory || '未知';
    factoryMap[factory] = { checkIns: r._count.id, checkOuts: 0 };
  });
  checkOuts.forEach(r => {
    const factory = r.factory || '未知';
    if (!factoryMap[factory]) factoryMap[factory] = { checkIns: 0, checkOuts: 0 };
    factoryMap[factory].checkOuts = r._count.id;
  });

  return Object.entries(factoryMap).map(([factory, data]) => ({
    factory,
    checkIns: data.checkIns,
    checkOuts: data.checkOuts,
  }));
}

// 计算汇总统计
async function getSummary(startDate: Date, endDate: Date, period: string) {
  const [totalCheckIns, totalCheckOuts] = await Promise.all([
    prisma.person.count({
      where: {
        checkInDate: { gte: startDate, lte: endDate },
      },
    }),
    prisma.person.count({
      where: {
        checkOutDate: { gte: startDate, lte: endDate },
      },
    }),
  ]);
  
  const daySpan = Math.max(1, Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)));
  
  return {
    totalCheckIns,
    totalCheckOuts,
    netChange: totalCheckIns - totalCheckOuts,
    avgDailyCheckIns: parseFloat((totalCheckIns / daySpan).toFixed(1)),
    avgDailyCheckOuts: parseFloat((totalCheckOuts / daySpan).toFixed(1)),
  };
}
