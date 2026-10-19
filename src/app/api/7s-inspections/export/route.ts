import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import * as XLSX from 'xlsx';

// 标记为动态路由
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const ids = searchParams.get('ids');

    // 构建查询条件
    let where: any = {};

    // 如果有指定ID列表，只导出这些记录
    if (ids) {
      const idList = ids.split(',').map(id => parseInt(id)).filter(id => !isNaN(id));
      if (idList.length > 0) {
        where = {
          id: {
            in: idList,
          },
        };
      }
    }

    // 获取检查记录
    const records = await prisma.inspectionRecord.findMany({
      where,
      orderBy: {
        inspectionDate: 'desc',
      },
    });

    if (records.length === 0) {
      return NextResponse.json(
        { error: '没有可导出的记录' },
        { status: 404 }
      );
    }

    // 准备Excel数据
    const excelData = records.map(record => ({
      '日期': formatDate(record.inspectionDate),
      '宿舍号': record.roomNumber,
      '所属工厂': record.factory,
      '所属部门': record.department,
      '姓名': record.personName,
      '不合格项': record.violationDesc,
      '检查人员': record.inspector,
      '备注': record.notes || '',
    }));

    // 创建工作簿
    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, '7S检查记录');

    // 设置列宽
    worksheet['!cols'] = [
      { wch: 12 }, // 日期
      { wch: 10 }, // 宿舍号
      { wch: 12 }, // 所属工厂
      { wch: 15 }, // 所属部门
      { wch: 10 }, // 姓名
      { wch: 40 }, // 不合格项
      { wch: 10 }, // 检查人员
      { wch: 20 }, // 备注
    ];

    // 生成Excel文件
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    // 生成文件名
    const dateStr = new Date().toISOString().split('T')[0].replace(/-/g, '');
    const filename = `7S检查记录_${dateStr}.xlsx`;

    // 返回文件
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(filename)}"`,
      },
    });
  } catch (error) {
    console.error('Error exporting 7S inspection records:', error);
    return NextResponse.json(
      { error: '导出失败' },
      { status: 500 }
    );
  }
}

/**
 * 格式化日期为 YYYY-MM-DD
 */
function formatDate(date: Date): string {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
