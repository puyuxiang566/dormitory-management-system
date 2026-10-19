import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

interface ImportBillData {
  roomNumber: string;
  electricityUsage: number;
  electricityCost: number;
  startMeterReading: number;
  endMeterReading: number;
  hotWaterCost: number;
  coldWaterCost: number;
  totalAmount: number;
}

async function getElectricityPrice(): Promise<number> {
  const setting = await prisma.systemSetting.findUnique({
    where: { key: 'fees.electricityPrice' },
  });
  return setting?.value ? parseFloat(setting.value) : 0.65;
}

async function findPersonIdByRoomNumber(roomNumber: string): Promise<number | null> {
  const room = await prisma.room.findFirst({
    where: { roomNumber: roomNumber },
    include: { person: true },
  });

  if (room && room.person && room.person.length > 0) {
    return room.person[0].id;
  }
  return null;
}

async function findBillByPersonAndPeriod(personId: number, year: number, month: number) {
  return await prisma.bill.findFirst({
    where: {
      personId,
      year,
      month,
    },
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { bills, year, month } = body as {
      bills: ImportBillData[];
      year: number;
      month: number;
    };

    if (!bills || !Array.isArray(bills) || bills.length === 0) {
      return NextResponse.json(
        { error: '没有可导入的账单数据' },
        { status: 400 }
      );
    }

    const results = {
      success: 0,
      failed: 0,
      errors: [] as { roomNumber: string; reason: string }[],
    };

    for (const bill of bills) {
      const personId = await findPersonIdByRoomNumber(bill.roomNumber);

      if (!personId) {
        results.failed++;
        results.errors.push({
          roomNumber: bill.roomNumber,
          reason: '未找到匹配住户',
        });
        continue;
      }

      const existingBill = await findBillByPersonAndPeriod(personId, year, month);

      if (existingBill) {
        await prisma.bill.update({
          where: { id: existingBill.id },
          data: {
            electricity: bill.electricityUsage,
            startMeterReading: bill.startMeterReading,
            endMeterReading: bill.endMeterReading,
            hotWater: bill.hotWaterCost,
            coldWater: bill.coldWaterCost,
            totalAmount: bill.totalAmount,
          },
        });
      } else {
        await prisma.bill.create({
          data: {
            personId,
            year,
            month,
            electricity: bill.electricityUsage,
            startMeterReading: bill.startMeterReading,
            endMeterReading: bill.endMeterReading,
            hotWater: bill.hotWaterCost,
            coldWater: bill.coldWaterCost,
            totalAmount: bill.totalAmount,
            status: 'UNPAID',
          },
        });
      }

      results.success++;
    }

    return NextResponse.json({
      message: `导入完成：成功 ${results.success} 条，失败 ${results.failed} 条`,
      results,
    });
  } catch (error) {
    console.error('Error importing bills:', error);
    return NextResponse.json(
      { error: '导入账单失败' },
      { status: 500 }
    );
  }
}
