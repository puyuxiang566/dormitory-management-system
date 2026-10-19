import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import * as XLSX from 'xlsx';

export const dynamic = 'force-dynamic';

// 报修工单报表导出（Excel）
// 支持按年月日时间范围选择导出：startDate / endDate（YYYY-MM-DD）
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const status = searchParams.get('status');
    const buildingId = searchParams.get('buildingId');
    const search = searchParams.get('search');

    const andParts: Record<string, unknown>[] = [];

    // 报修时间范围过滤（按年月日选择）
    if (startDate && /^\d{4}-\d{2}-\d{2}$/.test(startDate)) {
      andParts.push({ createdAt: { gte: new Date(`${startDate}T00:00:00`) } });
    }
    if (endDate && /^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
      andParts.push({ createdAt: { lte: new Date(`${endDate}T23:59:59.999`) } });
    }

    if (status && status !== 'all') {
      andParts.push({ status: status.toUpperCase() });
    }

    if (buildingId && buildingId !== 'all') {
      andParts.push({ room: { buildingId: parseInt(buildingId, 10) } });
    }

    if (search && search.trim()) {
      const q = search.trim();
      andParts.push({
        OR: [
          { title: { contains: q } },
          { description: { contains: q } },
          { person: { name: { contains: q } } },
          { room: { roomNumber: { contains: q } } },
        ],
      });
    }

    const where =
      andParts.length === 0
        ? {}
        : andParts.length === 1
          ? andParts[0]
          : { AND: andParts };

    const tickets = await prisma.maintenanceTicket.findMany({
      where,
      include: {
        person: {
          select: { id: true, name: true, employeeId: true, phone: true },
        },
        room: {
          select: {
            id: true,
            roomNumber: true,
            building: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const statusMap: Record<string, string> = {
      OPEN: '待维修',
      ASSIGNED: '已分配',
      IN_PROGRESS: '处理中',
      COMPLETED: '已完成',
      CANCELLED: '已取消',
    };

    const fmtDateTime = (d: Date | null | undefined) =>
      d ? new Date(d).toLocaleString('zh-CN', { hour12: false }) : '';

    const data = tickets.map((t) => ({
      工单号: `WX${new Date(t.createdAt).toISOString().slice(0, 10).replace(/-/g, '')}${String(t.id).padStart(3, '0')}`,
      报修房间: `${t.room?.building?.name || '—'} ${t.room?.roomNumber || '—'}`,
      问题描述: t.description || t.title || '',
      报修人: t.reportedBy || t.person?.name || '未指定',
      状态: statusMap[t.status] || t.status,
      报修时间: fmtDateTime(t.createdAt),
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    // 设置列宽
    worksheet['!cols'] = [
      { wch: 18 },
      { wch: 18 },
      { wch: 40 },
      { wch: 12 },
      { wch: 10 },
      { wch: 20 },
    ];
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, '报修工单');

    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    const rangeLabel =
      startDate || endDate
        ? `${startDate || '开始'}_至_${endDate || '现在'}`
        : new Date().toISOString().slice(0, 10);
    const filename = `报修工单报表_${rangeLabel}.xlsx`;

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type':
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
      },
    });
  } catch (error) {
    console.error('Error exporting maintenance tickets:', error);
    return NextResponse.json(
      { error: '导出报修工单报表失败' },
      { status: 500 }
    );
  }
}
