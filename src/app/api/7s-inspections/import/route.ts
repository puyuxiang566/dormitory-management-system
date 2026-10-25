import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import * as XLSX from 'xlsx';
import { getFactoryOptions } from '@/lib/factory-config';
import { normalizeFactoryCode } from '@/lib/factory-utils';

interface InspectionRow {
  inspectionDate: Date;
  roomNumber: string;
  factory: string;
  department: string;
  personName: string;
  violationDesc: string;
  inspector: string;
  notes: string | null;
  rowIndex: number;
}

/**
 * 解析日期，支持多种格式
 */
function parseDate(dateValue: any): Date | null {
  if (!dateValue) return null;

  if (typeof dateValue === 'string') {
    const parts = dateValue.split(/[\/\-]/);
    if (parts.length === 3) {
      const year = parseInt(parts[0]);
      const month = parseInt(parts[1]) - 1;
      const day = parseInt(parts[2]);
      if (!isNaN(year) && !isNaN(month) && !isNaN(day)) {
        return new Date(year, month, day);
      }
    }
    const date = new Date(dateValue);
    return isNaN(date.getTime()) ? null : date;
  }

  // Excel日期序列号（从1900-01-01开始）
  if (typeof dateValue === 'number') {
    const excelEpoch = new Date(Date.UTC(1899, 11, 30));
    const date = new Date(Date.UTC(
      excelEpoch.getUTCFullYear(),
      excelEpoch.getUTCMonth(),
      excelEpoch.getUTCDate() + dateValue
    ));
    return isNaN(date.getTime()) ? null : date;
  }

  return null;
}

/**
 * 解析Excel行数据
 */
async function parseRow(row: any, rowIndex: number): Promise<InspectionRow | null> {
  const dateValue = row['日期'];
  const roomNumber = String(row['宿舍号'] || row['roomNumber'] || '').trim();
  const factoryRaw = String(row['所属工厂'] || row['factory'] || '').trim();
  const factories = await getFactoryOptions();
  const factoryMap: Record<string, string> = {};
  factories.forEach((item) => {
    factoryMap[item.code.toLowerCase()] = item.code;
    factoryMap[item.name.toLowerCase()] = item.code;
  });
  const factory = factoryRaw
    ? (factoryMap[factoryRaw.toLowerCase()] || normalizeFactoryCode(factoryRaw))
    : '';
  const department = String(row['所属部门'] || row['department'] || '').trim();
  const personName = String(row['姓名'] || row['personName'] || '').trim();
  const violationDesc = String(row['不合格项'] || row['violationDesc'] || '').trim();
  const inspector = String(row['检查人员'] || row['inspector'] || '').trim();
  const notes = row['备注'] || row['notes'];

  // 验证必填字段
  if (!dateValue) {
    return null;
  }
  if (!roomNumber) {
    return null;
  }
  if (!factory) {
    return null;
  }
  if (!department) {
    return null;
  }
  if (!personName) {
    return null;
  }
  if (!violationDesc) {
    return null;
  }
  if (!inspector) {
    return null;
  }

  const inspectionDate = parseDate(dateValue);
  if (!inspectionDate) {
    return null;
  }

  return {
    inspectionDate,
    roomNumber,
    factory,
    department,
    personName,
    violationDesc: String(violationDesc),
    inspector,
    notes: notes ? String(notes) : null,
    rowIndex,
  };
}

/**
 * 创建检查记录
 */
async function createInspectionRecord(data: InspectionRow): Promise<number> {
  const record = await prisma.inspectionRecord.create({
    data: {
      inspectionDate: data.inspectionDate,
      roomNumber: data.roomNumber,
      factory: data.factory,
      department: data.department,
      personName: data.personName,
      violationDesc: data.violationDesc,
      inspector: data.inspector,
      notes: data.notes,
    },
  });

  return record.id;
}

/**
 * POST - 批量导入7S检查记录
 */
export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: '请提供要上传的Excel文件' }, { status: 400 });
    }

    // 验证文件类型
    const validTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
    ];
    if (!validTypes.includes(file.type) && !file.name.match(/\.(xlsx|xls)$/i)) {
      return NextResponse.json({ error: '请上传有效的Excel文件(.xlsx或.xls)' }, { status: 400 });
    }

    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);

    if (!data || data.length === 0) {
      return NextResponse.json({ error: 'Excel文件为空或无有效数据' }, { status: 400 });
    }

    const results = {
      success: 0,
      failed: 0,
      errors: [] as string[],
    };

    const rows: InspectionRow[] = [];
    
    // 第一遍：解析所有行
    for (let i = 0; i < data.length; i++) {
      const row = data[i] as any;
      const parsed = await parseRow(row, i + 2); // Excel行号从2开始（表头在第1行）
      if (parsed) {
        rows.push(parsed);
      } else {
        results.failed++;
        results.errors.push(`第 ${i + 2} 行: 缺少必填字段（日期、宿舍号、所属工厂、所属部门、姓名、不合格项、检查人员）`);
      }
    }

    // 第二遍：创建记录
    for (const row of rows) {
      try {
        await createInspectionRecord(row);
        results.success++;
      } catch (error: any) {
        results.failed++;
        results.errors.push(`第 ${row.rowIndex} 行: ${error.message || '创建记录失败'}`);
      }
    }

    return NextResponse.json({
      message: `导入完成：成功 ${results.success} 条，失败 ${results.failed} 条`,
      success: results.success,
      failed: results.failed,
      errors: results.errors,
    });
  } catch (error) {
    console.error('Error importing 7S inspection records:', error);
    return NextResponse.json({ error: '导入失败，请检查文件格式是否正确' }, { status: 500 });
  }
}