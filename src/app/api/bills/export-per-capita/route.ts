/**
 * 人均日均分摊法导出 API
 * 接收自定义天数，按人均日均法计算并导出 Excel
 *
 * 逻辑：
 * 1. 从 Bill 表读取房间总费用（取第一条记录的用电量×单价作为房间总费用）
 * 2. 计算总人天 = 所有人居住天数之和
 * 3. 每人费用 = 房间总费用 × (该人居住天数 / 总人天)
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
  '居住天数': number;
  '当月总天数': number;
  '电费分摊': string;
  '冷水分摊': string;
  '热水分摊': string;
  '合计': string;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { year, month, roomIds, customDays } = body;

    // 参数校验
    if (!year || !month || !roomIds || !Array.isArray(roomIds) || roomIds.length === 0) {
      return NextResponse.json(
        { error: '缺少必要参数：year、month、roomIds' },
        { status: 400 }
      );
    }

    const daysInMonth = new Date(year, month, 0).getDate();
    const exportData: ExportRow[] = [];

    // 获取系统单价（仅电费需要，冷水和热水在Bill表中已存储为金额）
    const { electricityPrice } = await getPriceSettings();

    for (const roomId of roomIds) {
      // 获取房间信息
      const room = await prisma.room.findUnique({
        where: { id: roomId },
      });

      if (!room) continue;

      // === 从 Bill 表读取房间总费用（取该房间第一条记录）===
      const roomBill = await prisma.bill.findFirst({
        where: {
          year,
          month,
          person: {
            roomId,
          },
        },
        include: {
          person: {
            include: {
              room: true,
            },
          },
        },
      });

      if (!roomBill) continue;

      // Bill 表中：
      // - electricity 存储的是用电量（度），需要乘以单价得到电费金额
      // - coldWater 和 hotWater 存储的是费用金额（已乘过单价），不需要再乘
      const totalElectricity = (roomBill.electricity || 0) * electricityPrice;
      const totalColdWater = roomBill.coldWater || 0;
      const totalHotWater = roomBill.hotWater || 0;

      // 获取该房间的自定义天数
      const roomCustomDays = customDays?.[roomId];
      if (!roomCustomDays) continue;

      // 获取人员信息
      const personIds = Object.keys(roomCustomDays).map(id => parseInt(id));
      const persons = await prisma.person.findMany({
        where: { id: { in: personIds } },
        select: {
          id: true,
          name: true,
          employeeId: true,
          gender: true,
          checkInDate: true,
        },
      });

      const occupants = personIds.map(personId => {
        const person = persons.find(p => p.id === personId);
        return {
          personId,
          name: person?.name || '',
          employeeId: person?.employeeId || '',
          gender: person?.gender || null,
          checkInDate: person?.checkInDate,
          daysInRoom: roomCustomDays[personId] || 0,
        };
      }).filter(o => o.daysInRoom > 0);

      if (occupants.length === 0) continue;

      // 判断是否需要使用人均日均分摊法
      const hasPartialMonth = occupants.some(o => o.daysInRoom < daysInMonth);

      if (hasPartialMonth) {
        // === 人均日均分摊法（按人天比例分摊）===
        // 总人天 = 所有人居住天数之和
        const totalPersonDays = occupants.reduce((sum, o) => sum + o.daysInRoom, 0);

        // 先计算每人原始费用（不做四舍五入）
        const rawBills = occupants.map(occupant => ({
          ...occupant,
          electricity: totalElectricity * (occupant.daysInRoom / totalPersonDays),
          hotWater: totalHotWater * (occupant.daysInRoom / totalPersonDays),
          coldWater: totalColdWater * (occupant.daysInRoom / totalPersonDays),
        }));

        // 四舍五入并处理最后一人的兜底（确保不会出现负数）
        let electricitySum = 0;
        let hotWaterSum = 0;
        let coldWaterSum = 0;

        for (let i = 0; i < rawBills.length; i++) {
          const raw = rawBills[i];
          const isLast = i === rawBills.length - 1;

          let electricity: number;
          let hotWater: number;
          let coldWater: number;

          if (isLast) {
            // 最后一人兜底，确保不会出现负数
            electricity = Math.max(0, Math.round((totalElectricity - electricitySum) * 100) / 100);
            hotWater = Math.max(0, Math.round((totalHotWater - hotWaterSum) * 100) / 100);
            coldWater = Math.max(0, Math.round((totalColdWater - coldWaterSum) * 100) / 100);
          } else {
            electricity = Math.round(raw.electricity * 100) / 100;
            hotWater = Math.round(raw.hotWater * 100) / 100;
            coldWater = Math.round(raw.coldWater * 100) / 100;

            electricitySum += electricity;
            hotWaterSum += hotWater;
            coldWaterSum += coldWater;
          }

          const totalAmount = Math.round((electricity + hotWater + coldWater) * 100) / 100;

          exportData.push({
            '姓名': raw.name,
            '工号': raw.employeeId,
            '性别': raw.gender === 'MALE' ? '男' : raw.gender === 'FEMALE' ? '女' : '',
            '房间号': room.roomNumber,
            '入住日期': raw.checkInDate ? raw.checkInDate.toISOString().split('T')[0] : '',
            '居住天数': raw.daysInRoom,
            '当月总天数': daysInMonth,
            '电费分摊': electricity.toFixed(2),
            '冷水分摊': coldWater.toFixed(2),
            '热水分摊': hotWater.toFixed(2),
            '合计': totalAmount.toFixed(2),
          });
        }
      } else {
        // === 所有人住满整月，按人数均摊 ===
        const personCount = occupants.length;
        const electricityPerPerson = Math.round((totalElectricity / personCount) * 100) / 100;
        const hotWaterPerPerson = Math.round((totalHotWater / personCount) * 100) / 100;
        const coldWaterPerPerson = Math.round((totalColdWater / personCount) * 100) / 100;
        const totalPerPerson = Math.round((electricityPerPerson + hotWaterPerPerson + coldWaterPerPerson) * 100) / 100;

        for (const occupant of occupants) {
          exportData.push({
            '姓名': occupant.name,
            '工号': occupant.employeeId,
            '性别': occupant.gender === 'MALE' ? '男' : occupant.gender === 'FEMALE' ? '女' : '',
            '房间号': room.roomNumber,
            '入住日期': occupant.checkInDate ? occupant.checkInDate.toISOString().split('T')[0] : '',
            '居住天数': occupant.daysInRoom,
            '当月总天数': daysInMonth,
            '电费分摊': electricityPerPerson.toFixed(2),
            '冷水分摊': coldWaterPerPerson.toFixed(2),
            '热水分摊': hotWaterPerPerson.toFixed(2),
            '合计': totalPerPerson.toFixed(2),
          });
        }
      }
    }

    if (exportData.length === 0) {
      return NextResponse.json(
        { error: '没有可导出的数据（请确保所选房间已有账单记录）' },
        { status: 404 }
      );
    }

    // 按房间号排序
    exportData.sort((a, b) => a['房间号'].localeCompare(b['房间号']));

    // 创建 Excel 文件
    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, '人均日均分摊');

    // 设置列宽
    const colWidths = [
      { wch: 10 }, // 姓名
      { wch: 15 }, // 工号
      { wch: 8 },  // 性别
      { wch: 12 }, // 房间号
      { wch: 12 }, // 入住日期
      { wch: 10 }, // 居住天数
      { wch: 10 }, // 当月总天数
      { wch: 12 }, // 电费分摊
      { wch: 12 }, // 冷水分摊
      { wch: 12 }, // 热水分摊
      { wch: 12 }, // 合计
    ];
    worksheet['!cols'] = colWidths;

    // 生成文件 buffer
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    // 设置文件名
    const fileName = `${year}年${month}月人均日均分摊.xlsx`;
    const encodedFileName = encodeURIComponent(fileName);

    // 返回文件
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${encodedFileName}"; filename*=UTF-8''${encodedFileName}`,
      },
    });
  } catch (error) {
    console.error('Error exporting per capita bills:', error);
    return NextResponse.json(
      { error: '导出失败，请稍后重试' },
      { status: 500 }
    );
  }
}
