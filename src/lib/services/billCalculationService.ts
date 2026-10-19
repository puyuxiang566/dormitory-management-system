/**
 * 费用计算服务
 * 实现智能结算算法：按房间均摊、按居住天数分摊
 */

import { prisma } from '../prisma'

export type CalculationMethod = 'EQUAL_SPLIT' | 'DAYS_SPLIT' | 'PER_CAPITA_DAILY'

export interface MeterReadingData {
  electricity: number
  water: number
  hotWater: number
  coldWater: number
}

export interface BillCalculationParams {
  roomId: number
  year: number
  month: number
  electricityUsage: number // 用电量（度）
  waterUsage: number // 用水量（吨）
  hotWaterUsage: number // 热水用量（吨）
  coldWaterUsage: number // 冷水用量（吨）
  electricityPrice: number // 电费单价（元/度）
  waterPrice: number // 水费单价（元/吨）
  hotWaterPrice: number // 热水单价（元/吨）
  coldWaterPrice: number // 冷水单价（元/吨）
  method: CalculationMethod
  // 新增：人均日均分摊法需要的自定义天数
  customDays?: Record<number, number> // personId -> days
}

export interface PersonBill {
  personId: number
  personName: string
  employeeId: string
  electricity: number
  water: number
  hotWater: number
  coldWater: number
  totalAmount: number
  calculationDetails: string
  daysInRoom?: number
}

export interface ValidationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
}

/**
 * 计算月份天数
 */
function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate()
}

/**
 * 获取房间当月的居住人员及其居住天数
 */
async function getRoomOccupantsWithDays(
  roomId: number,
  year: number,
  month: number
): Promise<
  Array<{
    personId: number
    name: string
    employeeId: string
    daysInRoom: number
  }>
> {
  const startDate = new Date(year, month - 1, 1)
  const endDate = new Date(year, month, 0, 23, 59, 59)
  const daysInMonth = getDaysInMonth(year, month)

  // 获取当前房间的人员
  const persons = await prisma.person.findMany({
    where: {
      roomId,
      status: { in: ['ACTIVE', 'MOVED_OUT'] },
    },
    select: {
      id: true,
      name: true,
      employeeId: true,
      checkInDate: true,
      checkOutDate: true,
      roomchangehistory: {
        where: {
          OR: [
            { toRoomId: roomId },
            { fromRoomId: roomId },
          ],
          changeDate: {
            gte: startDate,
            lte: endDate,
          },
        },
        orderBy: { changeDate: 'asc' },
      },
    },
  })

  const result: Array<{
    personId: number
    name: string
    employeeId: string
    daysInRoom: number
  }> = []

  for (const person of persons) {
    let daysInRoom = 0

    // 情况1：整月都在房间
    if (
      person.checkInDate &&
      person.checkInDate <= startDate &&
      (!person.checkOutDate || person.checkOutDate >= endDate)
    ) {
      daysInRoom = daysInMonth
    }
    // 情况2：本月入住
    else if (
      person.checkInDate &&
      person.checkInDate >= startDate &&
      person.checkInDate <= endDate
    ) {
      const checkIn = new Date(person.checkInDate)
      daysInRoom = endDate.getDate() - checkIn.getDate() + 1
    }
    // 情况3：本月退宿
    else if (
      person.checkOutDate &&
      person.checkOutDate >= startDate &&
      person.checkOutDate <= endDate
    ) {
      const checkOut = new Date(person.checkOutDate)
      daysInRoom = checkOut.getDate()
    }
    // 情况4：有调房记录
    else if (person.roomchangehistory.length > 0) {
      for (const history of person.roomchangehistory) {
        if (history.toRoomId === roomId) {
          // 调入此房间
          const changeDate = new Date(history.changeDate)
          if (changeDate <= endDate) {
            const startDay = Math.max(changeDate.getDate(), 1)
            daysInRoom = endDate.getDate() - startDay + 1
          }
        } else if (history.fromRoomId === roomId) {
          // 调出此房间
          const changeDate = new Date(history.changeDate)
          if (changeDate >= startDate) {
            daysInRoom = changeDate.getDate() - 1
          }
        }
      }
    }

    if (daysInRoom > 0) {
      result.push({
        personId: person.id,
        name: person.name,
        employeeId: person.employeeId,
        daysInRoom,
      })
    }
  }

  return result
}

/**
 * 计算账单（按房间均摊）
 */
async function calculateEqualSplit(
  params: BillCalculationParams
): Promise<PersonBill[]> {
  const { roomId, year, month, electricityUsage, waterUsage, hotWaterUsage, coldWaterUsage, electricityPrice, waterPrice, hotWaterPrice, coldWaterPrice } = params

  const occupants = await getRoomOccupantsWithDays(roomId, year, month)

  if (occupants.length === 0) {
    return []
  }

  const totalElectricity = electricityUsage * electricityPrice
  const totalWater = waterUsage * waterPrice
  const totalHotWater = hotWaterUsage * hotWaterPrice
  const totalColdWater = coldWaterUsage * coldWaterPrice
  const perPersonElectricity = totalElectricity / occupants.length
  const perPersonWater = totalWater / occupants.length
  const perPersonHotWater = totalHotWater / occupants.length
  const perPersonColdWater = totalColdWater / occupants.length

  return occupants.map((occupant) => ({
    personId: occupant.personId,
    personName: occupant.name,
    employeeId: occupant.employeeId,
    electricity: Math.round(perPersonElectricity * 100) / 100,
    water: Math.round(perPersonWater * 100) / 100,
    hotWater: Math.round(perPersonHotWater * 100) / 100,
    coldWater: Math.round(perPersonColdWater * 100) / 100,
    totalAmount: Math.round((perPersonElectricity + perPersonHotWater + perPersonColdWater) * 100) / 100,
    calculationDetails: `房间总人数${occupants.length}人，均摊计算`,
  }))
}

/**
 * 计算账单（按居住天数分摊）
 */
async function calculateDaysSplit(
  params: BillCalculationParams
): Promise<PersonBill[]> {
  const { roomId, year, month, electricityUsage, waterUsage, hotWaterUsage, coldWaterUsage, electricityPrice, waterPrice, hotWaterPrice, coldWaterPrice } = params

  const daysInMonth = getDaysInMonth(year, month)
  const occupants = await getRoomOccupantsWithDays(roomId, year, month)

  if (occupants.length === 0) {
    return []
  }

  const totalElectricity = electricityUsage * electricityPrice
  const totalWater = waterUsage * waterPrice
  const totalHotWater = hotWaterUsage * hotWaterPrice
  const totalColdWater = coldWaterUsage * coldWaterPrice
  const totalDays = occupants.reduce((sum, o) => sum + o.daysInRoom, 0)

  return occupants.map((occupant) => {
    const ratio = occupant.daysInRoom / totalDays
    const electricity = (totalElectricity * ratio)
    const water = (totalWater * ratio)
    const hotWater = (totalHotWater * ratio)
    const coldWater = (totalColdWater * ratio)

    return {
      personId: occupant.personId,
      personName: occupant.name,
      employeeId: occupant.employeeId,
      electricity: Math.round(electricity * 100) / 100,
      water: Math.round(water * 100) / 100,
      hotWater: Math.round(hotWater * 100) / 100,
      coldWater: Math.round(coldWater * 100) / 100,
      totalAmount: Math.round((electricity + hotWater + coldWater) * 100) / 100,
      calculationDetails: `居住${occupant.daysInRoom}天/总${totalDays}天，占比${(ratio * 100).toFixed(1)}%`,
      daysInRoom: occupant.daysInRoom,
    }
  })
}

/**
 * 计算账单（人均日均分摊法）
 * 房间日均费用 = 总费用 / 当月总天数
 * 每人费用 = 日均费用 * 该人居住天数
 */
async function calculatePerCapitaDaily(
  params: BillCalculationParams
): Promise<PersonBill[]> {
  const { roomId, year, month, electricityUsage, waterUsage, hotWaterUsage, coldWaterUsage, electricityPrice, waterPrice, hotWaterPrice, coldWaterPrice, customDays } = params

  const daysInMonth = getDaysInMonth(year, month)
  const occupants = await getRoomOccupantsWithDays(roomId, year, month)

  if (occupants.length === 0) {
    return []
  }

  // 使用自定义天数（如果提供），否则使用系统计算的天数
  const occupantDays = occupants.map(occupant => ({
    ...occupant,
    daysInRoom: customDays?.[occupant.personId] ?? occupant.daysInRoom,
  }))

  const totalElectricity = electricityUsage * electricityPrice
  const totalWater = waterUsage * waterPrice
  const totalHotWater = hotWaterUsage * hotWaterPrice
  const totalColdWater = coldWaterUsage * coldWaterPrice

  // 计算日均费用
  const dailyElectricity = totalElectricity / daysInMonth
  const dailyWater = totalWater / daysInMonth
  const dailyHotWater = totalHotWater / daysInMonth
  const dailyColdWater = totalColdWater / daysInMonth

  // 先计算每人费用（不做四舍五入，用于后续兜底）
  const rawBills = occupantDays.map(occupant => ({
    personId: occupant.personId,
    personName: occupant.name,
    employeeId: occupant.employeeId,
    daysInRoom: occupant.daysInRoom,
    electricity: dailyElectricity * occupant.daysInRoom,
    water: dailyWater * occupant.daysInRoom,
    hotWater: dailyHotWater * occupant.daysInRoom,
    coldWater: dailyColdWater * occupant.daysInRoom,
  }))

  // 四舍五入并处理最后一人的兜底（确保总和等于总费用）
  const result: PersonBill[] = []
  let electricitySum = 0
  let waterSum = 0
  let hotWaterSum = 0
  let coldWaterSum = 0

  for (let i = 0; i < rawBills.length; i++) {
    const raw = rawBills[i]
    const isLast = i === rawBills.length - 1

    let electricity: number
    let water: number
    let hotWater: number
    let coldWater: number

    if (isLast) {
      // 最后一人兜底，确保总和正确
      electricity = Math.round((totalElectricity - electricitySum) * 100) / 100
      water = Math.round((totalWater - waterSum) * 100) / 100
      hotWater = Math.round((totalHotWater - hotWaterSum) * 100) / 100
      coldWater = Math.round((totalColdWater - coldWaterSum) * 100) / 100
    } else {
      electricity = Math.round(raw.electricity * 100) / 100
      water = Math.round(raw.water * 100) / 100
      hotWater = Math.round(raw.hotWater * 100) / 100
      coldWater = Math.round(raw.coldWater * 100) / 100

      electricitySum += electricity
      waterSum += water
      hotWaterSum += hotWater
      coldWaterSum += coldWater
    }

    const totalAmount = Math.round((electricity + water + hotWater + coldWater) * 100) / 100

    result.push({
      personId: raw.personId,
      personName: raw.personName,
      employeeId: raw.employeeId,
      electricity,
      water,
      hotWater,
      coldWater,
      totalAmount,
      daysInRoom: raw.daysInRoom,
      calculationDetails: `日均${(dailyElectricity + dailyWater + dailyHotWater + dailyColdWater).toFixed(2)}元×${raw.daysInRoom}天=${totalAmount.toFixed(2)}元`,
    })
  }

  return result
}

/**
 * 计算账单（主函数）
 */
export async function calculateBill(
  params: BillCalculationParams
): Promise<PersonBill[]> {
  const { method } = params

  if (method === 'EQUAL_SPLIT') {
    return calculateEqualSplit(params)
  } else if (method === 'DAYS_SPLIT') {
    return calculateDaysSplit(params)
  } else if (method === 'PER_CAPITA_DAILY') {
    return calculatePerCapitaDaily(params)
  }

  return []
}

/**
 * 校验抄表数据
 */
export async function validateMeterReading(
  roomId: number,
  newElectricity: number,
  newWater: number,
  readingDate: Date
): Promise<ValidationResult> {
  const errors: string[] = []
  const warnings: string[] = []

  // 获取上一次抄表记录
  const lastReading = await prisma.meterReading.findFirst({
    where: { roomId },
    orderBy: { readingDate: 'desc' },
  })

  if (lastReading) {
    const lastElectricity = lastReading.electricity || 0
    const lastWater = lastReading.water || 0

    // 检查是否倒走
    if (newElectricity < lastElectricity) {
      errors.push(`电表读数倒走：上次${lastElectricity}度，本次${newElectricity}度`)
    }

    if (newWater < lastWater) {
      errors.push(`水表读数倒走：上次${lastWater}吨，本次${newWater}吨`)
    }

    // 检查是否突增（超过上次的3倍视为异常）
    const electricityIncrease = newElectricity - lastElectricity
    const waterIncrease = newWater - lastWater

    if (electricityIncrease > lastElectricity * 3 && lastElectricity > 0) {
      warnings.push(`用电量异常增长：增加${electricityIncrease.toFixed(1)}度`)
    }

    if (waterIncrease > lastWater * 3 && lastWater > 0) {
      warnings.push(`用水量异常增长：增加${waterIncrease.toFixed(1)}吨`)
    }
  }

  // 检查负数
  if (newElectricity < 0) {
    errors.push('电表读数不能为负数')
  }

  if (newWater < 0) {
    errors.push('水表读数不能为负数')
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  }
}

/**
 * 自动生成月度账单
 */
export async function generateMonthlyBills(
  year: number,
  month: number,
  electricityPrice: number = 0.6,
  waterPrice: number = 5,
  hotWaterPrice: number = 30,
  coldWaterPrice: number = 4,
  method: CalculationMethod = 'DAYS_SPLIT'
): Promise<{ success: boolean; generatedCount: number; errors: string[] }> {
  const errors: string[] = []
  let generatedCount = 0

  try {
    const startDate = new Date(year, month - 1, 1)
    const endDate = new Date(year, month, 0, 23, 59, 59)

    const meterReadings = await prisma.meterReading.findMany({
      where: {
        readingDate: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        room: true,
      },
    })

    const roomReadings = new Map<number, typeof meterReadings[0]>()

    for (const reading of meterReadings) {
      const existing = roomReadings.get(reading.roomId)
      if (!existing || reading.readingDate > existing.readingDate) {
        roomReadings.set(reading.roomId, reading)
      }
    }

    for (const [roomId, reading] of roomReadings) {
      try {
        const lastMonthReading = await prisma.meterReading.findFirst({
          where: {
            roomId,
            readingDate: { lt: startDate },
          },
          orderBy: { readingDate: 'desc' },
        })

        const electricityUsage = (reading.electricity || 0) - (lastMonthReading?.electricity || 0)
        const waterUsage = (reading.water || 0) - (lastMonthReading?.water || 0)
        const hotWaterUsage = (reading.hotWater || 0) - (lastMonthReading?.hotWater || 0)
        const coldWaterUsage = (reading.coldWater || 0) - (lastMonthReading?.coldWater || 0)

        const bills = await calculateBill({
          roomId,
          year,
          month,
          electricityUsage: Math.max(0, electricityUsage),
          waterUsage: Math.max(0, waterUsage),
          hotWaterUsage: Math.max(0, hotWaterUsage),
          coldWaterUsage: Math.max(0, coldWaterUsage),
          electricityPrice,
          waterPrice,
          hotWaterPrice,
          coldWaterPrice,
          method,
        })

        for (const bill of bills) {
          const existing = await prisma.bill.findFirst({
            where: {
              personId: bill.personId,
              year,
              month,
            },
          })

          if (!existing) {
            await prisma.bill.create({
              data: {
                personId: bill.personId,
                year,
                month,
                electricity: bill.electricity,
                water: bill.water,
                hotWater: bill.hotWater,
                coldWater: bill.coldWater,
                totalAmount: bill.totalAmount,
                status: 'UNPAID',
                dueDate: new Date(year, month, 15),
              },
            })
            generatedCount++
          }
        }
      } catch (error) {
        errors.push(`房间${reading.room?.roomNumber || roomId}生成账单失败`)
      }
    }

    return { success: true, generatedCount, errors }
  } catch (error) {
    console.error('生成月度账单失败:', error)
    return { success: false, generatedCount: 0, errors: ['生成账单时发生系统错误'] }
  }
}

/**
 * 获取系统配置的费用单价
 * 兼容两种存储格式：
 * 1. 系统设置页面使用的格式：key = 'fees.electricityPrice' 等
 * 2. 旧版格式：key = 'ELECTRICITY_PRICE'，group = 'BILLING'
 */
export async function getPriceSettings(): Promise<{
  electricityPrice: number
  waterPrice: number
  hotWaterPrice: number
  coldWaterPrice: number
}> {
  try {
    // 优先查询系统设置页面使用的格式（fees.electricityPrice）
    const feeSettings = await prisma.systemSetting.findMany({
      where: {
        OR: [
          { key: 'fees.electricityPrice' },
          { key: 'fees.hotWaterPrice' },
          { key: 'fees.coldWaterPrice' },
        ],
      },
    })

    let electricityPrice = 0.65
    let waterPrice = 5
    let hotWaterPrice = 30
    let coldWaterPrice = 4

    for (const setting of feeSettings) {
      if (setting.key === 'fees.electricityPrice') {
        electricityPrice = parseFloat(setting.value || '0.65')
      } else if (setting.key === 'fees.hotWaterPrice') {
        hotWaterPrice = parseFloat(setting.value || '30')
      } else if (setting.key === 'fees.coldWaterPrice') {
        coldWaterPrice = parseFloat(setting.value || '4')
      }
    }

    // 如果没有找到 fees.* 格式的设置，回退到旧版 BILLING 格式
    if (feeSettings.length === 0) {
      const billingSettings = await prisma.systemSetting.findMany({
        where: {
          group: 'BILLING',
        },
      })

      for (const setting of billingSettings) {
        if (setting.key === 'ELECTRICITY_PRICE') {
          electricityPrice = parseFloat(setting.value || '0.65')
        } else if (setting.key === 'WATER_PRICE') {
          waterPrice = parseFloat(setting.value || '5')
        } else if (setting.key === 'HOT_WATER_PRICE') {
          hotWaterPrice = parseFloat(setting.value || '30')
        } else if (setting.key === 'COLD_WATER_PRICE') {
          coldWaterPrice = parseFloat(setting.value || '4')
        }
      }
    }

    return { electricityPrice, waterPrice, hotWaterPrice, coldWaterPrice }
  } catch (error) {
    console.error('获取费用单价失败:', error)
    return { electricityPrice: 0.65, waterPrice: 5, hotWaterPrice: 30, coldWaterPrice: 4 }
  }
}
