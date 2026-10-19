import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// 默认配置
const defaultSettings = {
  general: {
    systemName: '宿舍管理系统',
    companyName: '',
    contactPhone: '',
    contactEmail: '',
    address: '',
    logo: null,
  },
  fees: {
    electricityPrice: 0.65,
    hotWaterPrice: 30.00,
    coldWaterPrice: 4.00,
    depositAmount: 500,
    rentCycle: 'month',
  },
  notifications: {
    emailEnabled: true,
    smsEnabled: true,
    appEnabled: true,
    feeReminder: true,
    accessReminder: true,
    maintenanceReminder: true,
    applicationReminder: true,
  },
  security: {
    minPasswordLength: 8,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSpecialChars: true,
    passwordExpiryDays: 90,
    maxLoginAttempts: 5,
    lockoutDuration: 30,
    twoFactorEnabled: false,
  },
  menu: {
    dashboard: { label: '仪表盘', enabled: true },
    persons: { label: '人员档案', enabled: true },
    dorms: { label: '宿舍资源', enabled: true },
    fees: { label: '费用管理', enabled: true },
    maintenance: { label: '报修维护', enabled: true },
    access: { label: '门禁管理', enabled: true },
    applications: { label: '申请管理', enabled: true },
    visitors: { label: '访客管理', enabled: true },
    reports: { label: '报表分析', enabled: true },
  },
};

// 获取设置
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    
    // 从数据库获取设置
    const settings = await prisma.systemSetting.findMany();
    
    // 转换为对象格式
    const settingsMap: any = {};
    settings.forEach(setting => {
      const keys = setting.key.split('.');
      let current = settingsMap;
      for (let i = 0; i < keys.length - 1; i++) {
        if (!current[keys[i]]) current[keys[i]] = {};
        current = current[keys[i]];
      }
      try {
        current[keys[keys.length - 1]] = JSON.parse(setting.value || '""');
      } catch {
        current[keys[keys.length - 1]] = setting.value || '';
      }
    });
    
    // 合并默认值
    const mergedSettings = {
      general: { ...defaultSettings.general, ...settingsMap.general },
      fees: { ...defaultSettings.fees, ...settingsMap.fees },
      notifications: { ...defaultSettings.notifications, ...settingsMap.notifications },
      security: { ...defaultSettings.security, ...settingsMap.security },
      menu: { ...defaultSettings.menu, ...settingsMap.menu },
    };
    
    // 如果指定了分类，只返回该分类
    if (category && (mergedSettings as Record<string, unknown>)[category]) {
      return NextResponse.json({ [category]: (mergedSettings as Record<string, unknown>)[category] });
    }
    
    return NextResponse.json(mergedSettings);
  } catch (error) {
    console.error('Error fetching settings:', error);
    // 返回默认设置
    return NextResponse.json(defaultSettings);
  }
}

// 更新设置
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { category, settings } = body;
    
    if (!category || !settings) {
      return NextResponse.json(
        { error: '缺少必要参数' },
        { status: 400 }
      );
    }
    
    // 批量更新设置
    const updates = Object.entries(settings).map(async ([key, value]) => {
      const fullKey = `${category}.${key}`;
      const stringValue = typeof value === 'object' ? JSON.stringify(value) : String(value);
      
      await prisma.systemSetting.upsert({
        where: { key: fullKey },
        update: { value: stringValue },
        create: {
          key: fullKey,
          value: stringValue,
          group: category,
        },
      });
    });
    
    await Promise.all(updates);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating settings:', error);
    return NextResponse.json(
      { error: '更新设置失败' },
      { status: 500 }
    );
  }
}

// 重置设置为默认值
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    
    if (category) {
      // 删除指定分类的设置
      await prisma.systemSetting.deleteMany({
        where: { group: category },
      });
    } else {
      // 删除所有设置
      await prisma.systemSetting.deleteMany();
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error resetting settings:', error);
    return NextResponse.json(
      { error: '重置设置失败' },
      { status: 500 }
    );
  }
}
