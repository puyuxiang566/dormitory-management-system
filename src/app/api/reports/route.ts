import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// 获取报表统计数据
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'overview';
    const period = searchParams.get('period') || 'month';
    
    const now = new Date();
    let startDate: Date;
    let endDate: Date = now;
    
    // 计算时间范围
    switch (period) {
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'lastMonth':
        // 上月：上月1号到上月最后一天
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        endDate = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999); // 上月最后一天
        break;
      case 'quarter':
        const currentQuarter = Math.floor(now.getMonth() / 3);
        startDate = new Date(now.getFullYear(), currentQuarter * 3, 1);
        break;
      case 'lastQuarter':
        // 上季度
        const lastQ = Math.floor(now.getMonth() / 3) - 1;
        if (lastQ < 0) {
          // 去年第四季度
          startDate = new Date(now.getFullYear() - 1, 9, 1);
          endDate = new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59, 999);
        } else {
          startDate = new Date(now.getFullYear(), lastQ * 3, 1);
          endDate = new Date(now.getFullYear(), (lastQ + 1) * 3, 0, 23, 59, 59, 999);
        }
        break;
      case 'firstHalf':
        // 上半年：1月1日 - 6月30日
        startDate = new Date(now.getFullYear(), 0, 1);
        endDate = new Date(now.getFullYear(), 5, 31, 23, 59, 59, 999);
        break;
      case 'secondHalf':
        // 下半年：7月1日 - 12月31日
        startDate = new Date(now.getFullYear(), 6, 1);
        endDate = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      case 'all':
        // 全部数据：从2024年开始读取
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
    
    switch (type) {
      case 'overview':
        return await getOverviewStats(startDate, endDate);
      case 'occupancy':
        return await getOccupancyReport(startDate, endDate, period);
      case 'financial':
        return await getFinancialReport(startDate, endDate, period);
      case 'maintenance':
        return await getMaintenanceReport(startDate, endDate);
      case 'visitors':
        return await getVisitorReport(startDate, endDate);
      default:
        return NextResponse.json(
          { error: '未知的报表类型' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Error generating report:', error);
    return NextResponse.json(
      { error: '生成报表失败' },
      { status: 500 }
    );
  }
}

// 概览统计
async function getOverviewStats(startDate: Date, endDate: Date) {
  const [
    totalPersons,
    activePersons,
    totalRooms,
    occupiedRooms,
    totalBeds,
    newPersons,
    movedOutPersons,
    maintenanceTickets,
    visitorCount,
    bills,
  ] = await Promise.all([
    prisma.person.count(),
    prisma.person.count({ where: { status: 'ACTIVE' } }),
    prisma.room.count(),
    prisma.room.count({ where: { status: 'OCCUPIED' } }),
    prisma.room.aggregate({ _sum: { bedCount: true } }),
    prisma.person.count({
      where: {
        createdAt: { gte: startDate, lte: endDate },
      },
    }),
    prisma.person.count({
      where: {
        status: 'MOVED_OUT',
        updatedAt: { gte: startDate, lte: endDate },
      },
    }),
    prisma.maintenanceTicket.count({
      where: {
        createdAt: { gte: startDate, lte: endDate },
      },
    }),
    prisma.visitor.count({
      where: {
        visitDate: { gte: startDate, lte: endDate },
      },
    }),
    prisma.bill.aggregate({
      where: {
        createdAt: { gte: startDate, lte: endDate },
      },
      _sum: { totalAmount: true },
    }),
  ]);
  
  const totalBedCount = totalBeds._sum.bedCount || 0;
  const occupancyRate = totalBedCount > 0 
    ? ((activePersons / totalBedCount) * 100).toFixed(1)
    : '0';
  
  return NextResponse.json({
    overview: {
      totalPersons,
      activePersons,
      totalRooms,
      occupiedRooms,
      totalBeds: totalBedCount,
      occupancyRate,
      vacancyRate: (100 - parseFloat(occupancyRate)).toFixed(1),
    },
    periodStats: {
      newPersons,
      movedOutPersons,
      maintenanceTickets,
      visitorCount,
      totalRevenue: bills._sum.totalAmount || 0,
    },
  });
}

// 入住率报表 - 根据时间范围过滤
async function getOccupancyReport(startDate: Date, endDate: Date, period: string) {
  // 判断是否为"全部数据"——不过滤时间
  const isAllTime = period === 'all';

  // 楼栋统计：排除关闭状态的房间
  // 入住人数逻辑：
  //   - "全部数据"：显示当前所有在住人员
  //   - 其他时间段：显示在时间范围内入住且当前在住的人员
  const buildings = await prisma.building.findMany({
    include: {
      room: {
        where: { status: { not: 'CLOSED' } }, // 排除关闭状态的房间
        include: {
          person: {
            where: isAllTime
              ? { status: 'ACTIVE' }
              : { 
                  status: 'ACTIVE',
                  checkInDate: { gte: startDate, lte: endDate },
                },
          },
        },
      },
    },
  });

  const buildingStats = buildings.map(building => {
    const totalBeds = building.room.reduce((sum, room) => sum + room.bedCount, 0);
    const occupiedBeds = building.room.reduce(
      (sum, room) => sum + room.person.length,
      0
    );
    
    return {
      id: building.id,
      name: building.name,
      totalRooms: building.room.length,
      totalBeds,
      occupiedBeds,
      vacantBeds: totalBeds - occupiedBeds,
      occupancyRate: totalBeds > 0 
        ? ((occupiedBeds / totalBeds) * 100).toFixed(1)
        : '0',
    };
  });
  
  // 性别分布 - "全部数据"时不过滤时间，其他按时间段内入住的人员统计
  const genderStats = await prisma.person.groupBy({
    by: ['gender'],
    where: isAllTime
      ? { status: 'ACTIVE' }
      : { 
          status: 'ACTIVE',
          checkInDate: { gte: startDate, lte: endDate },
        },
    _count: { id: true },
  });
  
  // 部门分布 - 按 factory（imcn, imaw, imft, 职能部门）分组统计
  const factoryStats = await prisma.person.groupBy({
    by: ['factory'],
    where: isAllTime
      ? { status: 'ACTIVE' }
      : {
          status: 'ACTIVE',
          checkInDate: { gte: startDate, lte: endDate },
        },
    _count: { id: true },
  });

  // 工厂标签映射
  const factoryLabelMap: Record<string, string> = {
    'imcn': 'IMCN',
    'imaw': 'IMAW',
    'imft': 'IMFT',
    '职能部门': '职能部门',
  };

  // 部门分布（兼容旧名称，保持4个工厂）
  const departmentStats = factoryStats.map(d => ({
    department: factoryLabelMap[d.factory] || d.factory || '未知',
    count: d._count.id,
  }));
  
  // 性别映射（英文转中文）
  const genderMap: Record<string, string> = {
    'MALE': '男',
    'FEMALE': '女',
    'male': '男',
    'female': '女',
    '男': '男',
    '女': '女',
  };

  return NextResponse.json({
    buildingStats,
    genderStats: genderStats.map(g => ({
      gender: genderMap[g.gender || ''] || g.gender || '未知',
      count: g._count.id,
    })),
    departmentStats,
  });
}

// 财务报表 - 使用 year + month 字段过滤，而非 createdAt
async function getFinancialReport(startDate: Date, endDate: Date, period: string) {
  const isAllTime = period === 'all';

  // 根据时间范围计算年份和月份过滤条件
  const startYear = startDate.getFullYear();
  const startMonth = startDate.getMonth() + 1; // JS月份从0开始
  const endYear = endDate.getFullYear();
  const endMonth = endDate.getMonth() + 1;

  // 构建 where 条件的辅助函数
  function buildYearMonthFilter(sy: number, sm: number, ey: number, em: number) {
    return {
      OR: Array.from({ length: ey - sy + 1 }, (_, yi) => {
        const year = sy + yi;
        const mStart = year === sy ? sm : 1;
        const mEnd = year === ey ? em : 12;
        return { year, month: { gte: mStart, lte: mEnd } };
      }),
    };
  }

  // 全部数据时不过滤时间，否则按时间范围过滤
  const dateFilter = isAllTime ? {} : buildYearMonthFilter(startYear, startMonth, endYear, endMonth);

  const bills = await prisma.bill.findMany({
    where: dateFilter,
    include: {
      person: {
        select: {
          name: true,
          department: true,
          roomId: true,
          room: {
            select: {
              roomNumber: true,
            },
          },
        },
      },
    },
  });
  
  const totalAmount = bills.reduce((sum, bill) => sum + bill.totalAmount, 0);
  const electricityTotal = bills.reduce((sum, bill) => sum + (bill.electricity || 0), 0);
  const hotWaterTotal = bills.reduce((sum, bill) => sum + (bill.hotWater || 0), 0);
  const coldWaterTotal = bills.reduce((sum, bill) => sum + (bill.coldWater || 0), 0);
  
  // 按月份统计 - 包含分项费用
  const monthlyMap: { [key: string]: { amount: number; electricity: number; hotWater: number; coldWater: number } } = {};
  bills.forEach(bill => {
    const month = `${bill.year}-${String(bill.month).padStart(2, '0')}`;
    if (!monthlyMap[month]) {
      monthlyMap[month] = { amount: 0, electricity: 0, hotWater: 0, coldWater: 0 };
    }
    monthlyMap[month].amount += bill.totalAmount;
    monthlyMap[month].electricity += (bill.electricity || 0);
    monthlyMap[month].hotWater += (bill.hotWater || 0);
    monthlyMap[month].coldWater += (bill.coldWater || 0);
  });
  
  // 按房间号统计
  const roomStats: { [key: string]: number } = {};
  bills.forEach(bill => {
    const room = bill.person.room?.roomNumber || '未分配';
    roomStats[room] = (roomStats[room] || 0) + bill.totalAmount;
  });

  // 费用类型统计（顺序：冷水费→热水费→电费）
  const billTypeStats: { type: string; amount: number; percentage: number }[] = [];
  if (totalAmount > 0) {
    if (coldWaterTotal > 0) {
      billTypeStats.push({ type: '冷水费', amount: coldWaterTotal, percentage: parseFloat(((coldWaterTotal / totalAmount) * 100).toFixed(1)) });
    }
    if (hotWaterTotal > 0) {
      billTypeStats.push({ type: '热水费', amount: hotWaterTotal, percentage: parseFloat(((hotWaterTotal / totalAmount) * 100).toFixed(1)) });
    }
    if (electricityTotal > 0) {
      billTypeStats.push({ type: '电费', amount: electricityTotal, percentage: parseFloat(((electricityTotal / totalAmount) * 100).toFixed(1)) });
    }
  }

  // 趋势图数据：本月/上月自动往前扩展1个月以显示趋势，其他按所选范围显示
  const shouldExtendOneMonth = period === 'month' || period === 'lastMonth';
  const trendStart = shouldExtendOneMonth
    ? new Date(startDate.getFullYear(), startDate.getMonth() - 1, 1)
    : new Date(startDate);

  const trendStartYear = trendStart.getFullYear();
  const trendStartMonth = trendStart.getMonth() + 1;

  const trendFilter = isAllTime ? {} : buildYearMonthFilter(trendStartYear, trendStartMonth, endYear, endMonth);

  const trendBills = await prisma.bill.findMany({
    where: trendFilter,
    select: {
      year: true,
      month: true,
      totalAmount: true,
      electricity: true,
      hotWater: true,
      coldWater: true,
    },
  });

  const trendMap: { [key: string]: { amount: number; electricity: number; hotWater: number; coldWater: number } } = {};
  trendBills.forEach(bill => {
    const month = `${bill.year}-${String(bill.month).padStart(2, '0')}`;
    if (!trendMap[month]) {
      trendMap[month] = { amount: 0, electricity: 0, hotWater: 0, coldWater: 0 };
    }
    trendMap[month].amount += bill.totalAmount;
    trendMap[month].electricity += (bill.electricity || 0);
    trendMap[month].hotWater += (bill.hotWater || 0);
    trendMap[month].coldWater += (bill.coldWater || 0);
  });

  // 补充0值月份，确保趋势连续
  const allMonths: string[] = [];
  const cursor = new Date(trendStart);
  const end = new Date(endYear, endMonth - 1, 1);
  while (cursor <= end) {
    allMonths.push(`${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}`);
    cursor.setMonth(cursor.getMonth() + 1);
  }
  allMonths.forEach(m => {
    if (!trendMap[m]) {
      trendMap[m] = { amount: 0, electricity: 0, hotWater: 0, coldWater: 0 };
    }
  });

  const monthlyStatsForTrend = Object.entries(trendMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, data]) => ({ month, ...data }));
  
  return NextResponse.json({
    summary: {
      totalAmount,
      electricityTotal,
      hotWaterTotal,
      coldWaterTotal,
    },
    monthlyStats: monthlyStatsForTrend,
    departmentStats: Object.entries(roomStats)
      .map(([department, amount]) => ({ department, amount }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 10),
    billTypeStats,
  });
}

// 维修报表
async function getMaintenanceReport(startDate: Date, endDate: Date) {
  const tickets = await prisma.maintenanceTicket.findMany({
    where: {
      createdAt: { gte: startDate, lte: endDate },
    },
  });
  
  // 按状态统计
  const statusStats: { [key: string]: number } = {};
  tickets.forEach(ticket => {
    statusStats[ticket.status] = (statusStats[ticket.status] || 0) + 1;
  });
  
  // 平均处理时间（已完成的工单）
  const completedTickets = tickets.filter(t => t.resolvedAt && t.createdAt);
  const avgResolutionTime = completedTickets.length > 0
    ? completedTickets.reduce((sum, t) => {
        const hours = (new Date(t.resolvedAt!).getTime() - new Date(t.createdAt).getTime()) / (1000 * 60 * 60);
        return sum + hours;
      }, 0) / completedTickets.length
    : 0;
  
  return NextResponse.json({
    summary: {
      totalTickets: tickets.length,
      completedTickets: completedTickets.length,
      pendingTickets: tickets.filter(t => t.status !== 'COMPLETED' && t.status !== 'CANCELLED').length,
      avgResolutionTime: avgResolutionTime.toFixed(1),
    },
    statusStats: Object.entries(statusStats).map(([status, count]) => ({
      status,
      count,
    })),
  });
}

// 访客报表
async function getVisitorReport(startDate: Date, endDate: Date) {
  const visitors = await prisma.visitor.findMany({
    where: {
      visitDate: { gte: startDate, lte: endDate },
    },
    include: {
      person: {
        select: {
          name: true,
          department: true,
        },
      },
    },
  });
  
  // 按状态统计
  const statusStats: { [key: string]: number } = {};
  visitors.forEach(visitor => {
    statusStats[visitor.status] = (statusStats[visitor.status] || 0) + 1;
  });
  
  // 按被访人部门统计
  const departmentStats: { [key: string]: number } = {};
  visitors.forEach(visitor => {
    const dept = visitor.person.department || '未分配';
    departmentStats[dept] = (departmentStats[dept] || 0) + 1;
  });
  
  return NextResponse.json({
    summary: {
      totalVisitors: visitors.length,
      approvedVisitors: visitors.filter(v => v.status === 'APPROVED').length,
      pendingVisitors: visitors.filter(v => v.status === 'PENDING').length,
      rejectedVisitors: visitors.filter(v => v.status === 'REJECTED').length,
    },
    statusStats: Object.entries(statusStats).map(([status, count]) => ({
      status,
      count,
    })),
    departmentStats: Object.entries(departmentStats).map(([department, count]) => ({
      department,
      count,
    })),
  });
}
