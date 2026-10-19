/**
 * 费用分摊导出 API
 * 按房间人数均分电费、冷水费、热水费，导出 Excel
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getPriceSettings } from '@/lib/services/billCalculationService';
import * as XLSX from 'xlsx';

interface ExportRow {
  '姓名': string;
  '工号': string;
  '性别': string;
  '房间号': string;
  '入住日期': string;
  '电费分摊': string;
  '冷水分摊': string;
  '热水分摊': string;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const yearParam = searchParams.get('year');
    const monthParam = searchParams.get('month');
    const roomIdsParam = searchParams.get('roomIds');

    // 参数校验
    if (!yearParam || !monthParam) {
      return NextResponse.json(
        { error: '缺少必要参数：year 和 month' },
        { status: 400 }
      );
    }

    const year = parseInt(yearParam);
    const month = parseInt(monthParam);

    if (isNaN(year) || isNaN(month) || year < 2020 || year > 2030 || month < 1 || month > 12) {
      return NextResponse.json(
        { error: '无效的年份或月份' },
        { status: 400 }
      );
    }

    // 解析房间ID列表
    let roomIds: number[] = [];
    if (roomIdsParam) {
      roomIds = roomIdsParam.split(',').map(id => parseInt(id)).filter(id => !isNaN(id));
    }

    // 计算月份的起始和结束日期
    const monthStart = new Date(year, month - 1, 1);
    const monthEnd = new Date(year, month, 0, 23, 59, 59, 999);

    // 构建查询条件
    const roomWhere = roomIds.length > 0 ? { roomId: { in: roomIds } } : {};

    // 获取指定月份的所有账单
    const bills = await prisma.bill.findMany({
      where: {
        year,
        month,
        person: {
          ...roomWhere,
        },
      },
      include: {
        person: {
          include: {
            room: true,
            building: true,
          },
        },
      },
    });

    if (bills.length === 0) {
      return NextResponse.json(
        { error: '未找到指定月份的账单数据' },
        { status: 404 }
      );
    }

    // 获取系统设置的费用单价
    const { electricityPrice } = await getPriceSettings();

    // 按房间分组账单，计算各房间总费用
    const roomBills = new Map<number, {
      roomNumber: string;
      buildingName: string;
      electricity: number;
      coldWater: number;
      hotWater: number;
      persons: Array<{
        id: number;
        name: string;
        employeeId: string;
        gender: string | null;
        checkInDate: Date | null;
      }>;
    }>();

    // 初始化房间数据
    for (const bill of bills) {
      if (!bill.person || !bill.person.room) continue;

      const roomId = bill.person.roomId;
      if (!roomId) continue;

      if (!roomBills.has(roomId)) {
        roomBills.set(roomId, {
          roomNumber: bill.person.room.roomNumber,
          buildingName: bill.person.building?.name || '',
          electricity: 0,
          coldWater: 0,
          hotWater: 0,
          persons: [],
        });
      }

      const roomData = roomBills.get(roomId)!;
      // electricity 存储的是用电量（度），需要乘以单价得到电费金额
      roomData.electricity += (bill.electricity || 0) * electricityPrice;
      roomData.coldWater += bill.coldWater || 0;
      roomData.hotWater += bill.hotWater || 0;
    }

    // 获取每个房间在指定月份的入住人员
    for (const [roomId, roomData] of roomBills) {
      const occupants = await prisma.person.findMany({
        where: {
          roomId,
          status: { in: ['ACTIVE', 'MOVED_OUT'] },
          // 该月实际入住：入住日期 <= 月末 且 (退宿日期 >= 月初 或未退宿)
          checkInDate: { lte: monthEnd },
          OR: [
            { checkOutDate: null },
            { checkOutDate: { gte: monthStart } },
          ],
        },
        select: {
          id: true,
          name: true,
          employeeId: true,
          gender: true,
          checkInDate: true,
        },
      });

      roomData.persons = occupants;
    }

    // 生成导出数据
    const exportData: ExportRow[] = [];

    for (const [roomId, roomData] of roomBills) {
      // 跳过无人入住的房间
      if (roomData.persons.length === 0) continue;

      const personCount = roomData.persons.length;

      // 计算每人分摊费用（四舍五入保留两位小数）
      const electricityPerPerson = Math.round((roomData.electricity / personCount) * 100) / 100;
      const coldWaterPerPerson = Math.round((roomData.coldWater / personCount) * 100) / 100;
      const hotWaterPerPerson = Math.round((roomData.hotWater / personCount) * 100) / 100;

      for (const person of roomData.persons) {
        exportData.push({
          '姓名': person.name,
          '工号': person.employeeId,
          '性别': person.gender === 'MALE' ? '男' : person.gender === 'FEMALE' ? '女' : '',
          '房间号': roomData.roomNumber,
          '入住日期': person.checkInDate
            ? person.checkInDate.toISOString().split('T')[0]
            : '',
          '电费分摊': electricityPerPerson.toFixed(2),
          '冷水分摊': coldWaterPerPerson.toFixed(2),
          '热水分摊': hotWaterPerPerson.toFixed(2),
        });
      }
    }

    if (exportData.length === 0) {
      return NextResponse.json(
        { error: '没有可导出的数据（所有选中房间均无人入住）' },
        { status: 404 }
      );
    }

    // 按房间号排序
    exportData.sort((a, b) => a['房间号'].localeCompare(b['房间号']));

    // 创建 Excel 文件
    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, '费用分摊');

    // 设置列宽
    const colWidths = [
      { wch: 10 }, // 姓名
      { wch: 15 }, // 工号
      { wch: 8 },  // 性别
      { wch: 12 }, // 房间号
      { wch: 12 }, // 入住日期
      { wch: 12 }, // 电费分摊
      { wch: 12 }, // 冷水分摊
      { wch: 12 }, // 热水分摊
    ];
    worksheet['!cols'] = colWidths;

    // 生成文件 buffer
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    // 设置文件名
    const fileName = `${year}年${month}月费用分摊.xlsx`;
    const encodedFileName = encodeURIComponent(fileName);

    // 返回文件
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${encodedFileName}"; filename*=UTF-8''${encodedFileName}`,
      },
    });
  } catch (error) {
    console.error('Error exporting bills:', error);
    return NextResponse.json(
      { error: '导出失败，请稍后重试' },
      { status: 500 }
    );
  }
}
