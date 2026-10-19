import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const now = new Date();
    
    // 使用 UTC 时间进行查询，避免时区问题
    const startOfMonth = new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1));
    const startOfToday = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
    const startOfYesterday = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate() - 1));
    const endOfToday = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate() + 1));

    const [
      monthBills,
      todayVisitors,
      yesterdayVisitors,
      monthBillsLastMonth,
    ] = await Promise.all([
      prisma.bill.aggregate({
        _sum: {
          totalAmount: true,
        },
        where: {
          createdAt: {
            gte: startOfMonth,
          },
          status: 'PAID',
        },
      }),
      prisma.visitor.count({
        where: {
          visitDate: {
            gte: startOfToday,
            lt: endOfToday,
          },
        },
      }),
      prisma.visitor.count({
        where: {
          visitDate: {
            gte: startOfYesterday,
            lt: startOfToday,
          },
        },
      }),
      prisma.bill.aggregate({
        _sum: {
          totalAmount: true,
        },
        where: {
          createdAt: {
            gte: new Date(now.getFullYear(), now.getMonth() - 1, 1),
            lt: startOfMonth,
          },
          status: 'PAID',
        },
      }),
    ]);

    const currentMonthRevenue = monthBills._sum.totalAmount || 0;
    const lastMonthRevenue = monthBillsLastMonth._sum.totalAmount || 0;
    const revenueChange = lastMonthRevenue > 0 
      ? (((currentMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100).toFixed(1)
      : '0';

    const visitorChange = todayVisitors - yesterdayVisitors;

    return NextResponse.json({
      data: {
        currentMonthRevenue,
        revenueChange,
        todayVisitors,
        visitorChange,
      },
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard stats' },
      { status: 500 }
    );
  }
}
