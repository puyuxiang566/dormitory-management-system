/**
 * 获取房间人员及居住天数 API
 * 用于人均日均分摊法的前置数据获取
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const roomIdParam = searchParams.get('roomId');
    const yearParam = searchParams.get('year');
    const monthParam = searchParams.get('month');

    if (!roomIdParam || !yearParam || !monthParam) {
      return NextResponse.json(
        { error: '缺少必要参数：roomId、year、month' },
        { status: 400 }
      );
    }

    const roomId = parseInt(roomIdParam);
    const year = parseInt(yearParam);
    const month = parseInt(monthParam);

    if (isNaN(roomId) || isNaN(year) || isNaN(month)) {
      return NextResponse.json(
        { error: '参数格式错误' },
        { status: 400 }
      );
    }

    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);
    const daysInMonth = getDaysInMonth(year, month);

    // 获取房间人员
    const persons = await prisma.person.findMany({
      where: {
        roomId,
        status: { in: ['ACTIVE', 'MOVED_OUT'] },
        checkInDate: { lte: endDate },
        OR: [
          { checkOutDate: null },
          { checkOutDate: { gte: startDate } },
        ],
      },
      select: {
        id: true,
        name: true,
        employeeId: true,
        gender: true,
        checkInDate: true,
        checkOutDate: true,
      },
    });

    // 计算每人居住天数
    const occupants = persons.map(person => {
      let daysInRoom = 0;

      // 情况1：整月都在房间
      if (
        person.checkInDate &&
        person.checkInDate <= startDate &&
        (!person.checkOutDate || person.checkOutDate >= endDate)
      ) {
        daysInRoom = daysInMonth;
      }
      // 情况2：本月入住
      else if (
        person.checkInDate &&
        person.checkInDate >= startDate &&
        person.checkInDate <= endDate
      ) {
        const checkIn = new Date(person.checkInDate);
        daysInRoom = endDate.getDate() - checkIn.getDate() + 1;
      }
      // 情况3：本月退宿
      else if (
        person.checkOutDate &&
        person.checkOutDate >= startDate &&
        person.checkOutDate <= endDate
      ) {
        const checkOut = new Date(person.checkOutDate);
        daysInRoom = checkOut.getDate();
      }

      return {
        personId: person.id,
        name: person.name,
        employeeId: person.employeeId,
        gender: person.gender,
        checkInDate: person.checkInDate?.toISOString().split('T')[0] || '',
        checkOutDate: person.checkOutDate?.toISOString().split('T')[0] || '',
        daysInRoom,
      };
    }).filter(o => o.daysInRoom > 0);

    return NextResponse.json({
      success: true,
      data: occupants,
      daysInMonth,
    });
  } catch (error) {
    console.error('Error fetching room occupants:', error);
    return NextResponse.json(
      { error: '获取房间人员失败' },
      { status: 500 }
    );
  }
}
