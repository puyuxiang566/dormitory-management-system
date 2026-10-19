import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '7');
    
    const now = new Date();
    // 只统计非关闭状态房间的床位数
    const totalBeds = await prisma.room.aggregate({
      _sum: { bedCount: true },
      where: { status: { not: 'CLOSED' } },
    });
    const totalBedCount = totalBeds._sum.bedCount || 0;
    
    if (totalBedCount === 0) {
      return NextResponse.json({ data: [], totalBeds: 0 });
    }

    // 大于90天按月汇总，否则按日汇总
    if (days > 90) {
      return await getMonthlyTrend(now, days, totalBedCount);
    } else {
      return await getDailyTrend(now, days, totalBedCount);
    }
  } catch (error) {
    console.error('Error getting occupancy trend:', error);
    return NextResponse.json(
      { error: '获取入住率趋势失败' },
      { status: 500 }
    );
  }
}

// 按日汇总（短期：<=90天）
async function getDailyTrend(now: Date, days: number, totalBedCount: number) {
  const data = [];
  // 为了性能，一次查询所有活跃人员，然后在前端计算
  const activePersons = await prisma.person.findMany({
    where: { status: 'ACTIVE' },
    select: { checkInDate: true, checkOutDate: true },
  });

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    date.setHours(0, 0, 0, 0);

    const nextDate = new Date(date);
    nextDate.setDate(nextDate.getDate() + 1);

    // 在该日期前入住且未退宿的人数
    const count = activePersons.filter(p => {
      const checkIn = p.checkInDate ? new Date(p.checkInDate) : null;
      const checkOut = p.checkOutDate ? new Date(p.checkOutDate) : null;
      return checkIn && checkIn <= date && (!checkOut || checkOut > date);
    }).length;

    const occupancy = parseFloat(((count / totalBedCount) * 100).toFixed(1));
    data.push({
      date: `${date.getMonth() + 1}/${date.getDate()}`,
      occupancy,
      beds: count,
    });
  }

  return NextResponse.json({ data, totalBeds: totalBedCount });
}

// 按月汇总（长期：>90天）
async function getMonthlyTrend(now: Date, days: number, totalBedCount: number) {
  const data = [];
  const months = Math.ceil(days / 30);

  // 一次查询所有活跃人员
  const activePersons = await prisma.person.findMany({
    where: { status: 'ACTIVE' },
    select: { checkInDate: true, checkOutDate: true },
  });

  for (let i = months - 1; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const nextMonth = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);

    // 统计该月在住人数（月末数据）
    const count = activePersons.filter(p => {
      const checkIn = p.checkInDate ? new Date(p.checkInDate) : null;
      const checkOut = p.checkOutDate ? new Date(p.checkOutDate) : null;
      return checkIn && checkIn < nextMonth && (!checkOut || checkOut >= nextMonth);
    }).length;

    const occupancy = parseFloat(((count / totalBedCount) * 100).toFixed(1));
    data.push({
      date: `${date.getFullYear()}/${date.getMonth() + 1}`,
      occupancy,
      beds: count,
    });
  }

  return NextResponse.json({ data, totalBeds: totalBedCount });
}
