/**
 * 费用计算 API
 */

import { NextResponse } from 'next/server';
import { calculateBill, validateMeterReading, getPriceSettings } from '@/lib/services/billCalculationService';
import type { CalculationMethod } from '@/lib/services/billCalculationService';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      roomId,
      year,
      month,
      electricityUsage,
      waterUsage,
      electricityPrice: customElectricityPrice,
      waterPrice: customWaterPrice,
      method,
    } = body;

    // 获取系统配置的费用单价
    const { electricityPrice: systemElectricityPrice, waterPrice: systemWaterPrice } =
      await getPriceSettings();

    // 使用自定义单价或系统默认单价
    const electricityPrice = customElectricityPrice || systemElectricityPrice;
    const waterPrice = customWaterPrice || systemWaterPrice;

    // 计算账单
    const bills = await calculateBill({
      roomId,
      year,
      month,
      electricityUsage,
      waterUsage,
      hotWaterUsage: 0,
      coldWaterUsage: 0,
      electricityPrice,
      waterPrice,
      hotWaterPrice: 0,
      coldWaterPrice: 0,
      method: method as CalculationMethod,
    });

    return NextResponse.json({
      success: true,
      bills,
      priceSettings: {
        electricityPrice,
        waterPrice,
      },
    });
  } catch (error) {
    console.error('Error calculating bills:', error);
    return NextResponse.json(
      { error: 'Failed to calculate bills' },
      { status: 500 }
    );
  }
}

// 校验抄表数据
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { roomId, electricity, water, readingDate } = body;

    const result = await validateMeterReading(
      roomId,
      electricity,
      water,
      new Date(readingDate)
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error validating meter reading:', error);
    return NextResponse.json(
      { error: 'Failed to validate meter reading' },
      { status: 500 }
    );
  }
}
