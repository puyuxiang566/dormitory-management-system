import { NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import { getFactoryOptions } from '@/lib/factory-config';

export async function GET() {
  try {
    const factories = await getFactoryOptions({ includeInactive: false });
    const templateData = [
      {
        '日期': '2024-01-15',
        '宿舍号': 'A101',
        '所属工厂': factories[0]?.name || 'IMCN',
        '所属部门': '生产部',
        '姓名': '张三',
        '不合格项': '地面有垃圾',
        '检查人员': '李四',
        '备注': '',
      },
    ];

    const ws = XLSX.utils.json_to_sheet(templateData);

    ws['!cols'] = [
      { wch: 12 },
      { wch: 10 },
      { wch: 12 },
      { wch: 15 },
      { wch: 12 },
      { wch: 20 },
      { wch: 12 },
      { wch: 20 },
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '7S检查记录模板');

    const buffer = XLSX.write(wb, { bookType: 'xlsx', type: 'buffer' });

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="7s-inspection-template.xlsx"',
      },
    });
  } catch (error) {
    console.error('Error generating template:', error);
    return NextResponse.json(
      { error: '生成模板失败' },
      { status: 500 }
    );
  }
}
