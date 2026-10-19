/**
 * 自动生成账单 API
 */

import { NextResponse } from 'next/server';
import { generateMonthlyBills, getPriceSettings } from '@/lib/services/billCalculationService';
import type { CalculationMethod } from '@/lib/services/billCalculationService';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      roomIds,  // 可选参数，留作将来扩展
      year: customYear,
      month: customMonth,
      electricityPrice: customElectricityPrice,
      waterPrice: customWaterPrice,
      hotWaterPrice: customHotWaterPrice,
      coldWaterPrice: customColdWaterPrice,
      method,
    } = body;

    // 设置默认年月为当前年月
    const now = new Date();
    const year = customYear ?? now.getFullYear();
    const month = customMonth ?? now.getMonth() + 1;

    // 参数校验
    if (typeof year !== 'number' || typeof month !== 'number') {
      return NextResponse.json(
        { error: '年份和月份必须是数字' },
        { status: 400 }
      );
    }

    if (year < 2020 || year > 2030) {
      return NextResponse.json(
        { error: '年份必须在 2020-2030 范围内' },
        { status: 400 }
      );
    }

    if (month < 1 || month > 12) {
      return NextResponse.json(
        { error: '月份必须在 1-12 范围内' },
        { status: 400 }
      );
    }

    const { electricityPrice: systemElectricityPrice, waterPrice: systemWaterPrice, hotWaterPrice: systemHotWaterPrice, coldWaterPrice: systemColdWaterPrice } =
      await getPriceSettings();

    const electricityPrice = customElectricityPrice || systemElectricityPrice;
    const waterPrice = customWaterPrice || systemWaterPrice;
    const hotWaterPrice = customHotWaterPrice || systemHotWaterPrice;
    const coldWaterPrice = customColdWaterPrice || systemColdWaterPrice;

    const result = await generateMonthlyBills(
      year,
      month,
      electricityPrice,
      waterPrice,
      hotWaterPrice,
      coldWaterPrice,
      method as CalculationMethod
    );

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: `成功生成 ${result.generatedCount} 条账单`,
        generatedCount: result.generatedCount,
        errors: result.errors,
      });
    } else {
      return NextResponse.json(
        {
          success: false,
          message: '生成账单失败',
          errors: result.errors,
        },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Error generating bills:', error);
    return NextResponse.json(
      { error: 'Failed to generate bills' },
      { status: 500 }
    );
  }
}
