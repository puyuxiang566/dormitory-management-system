import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import * as XLSX from 'xlsx';

export const dynamic = 'force-dynamic';

const AREA_RE = /^(东|西|南|中)/;

// GET /api/lockers?export=true 导出 | ?keyword=&status= 查询（含统计）
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    if (searchParams.get('export') === 'true') {
      const lockers = await prisma.locker.findMany({
        include: {
          assignments: {
            where: { status: 'ACTIVE' },
            take: 1,
            orderBy: { assignedAt: 'desc' },
          },
        },
        orderBy: [{ gender: 'desc' }, { rowName: 'asc' }, { subRow: 'asc' }, { lockerNo: 'asc' }],
      });

      const exportData = lockers.map((l) => {
        const a = l.assignments[0];
        return {
          性别: l.gender === 'MALE' ? '男' : '女',
          区域: l.area,
          排: l.rowName,
          层: l.subRow,
          柜号: l.lockerNo,
          状态: l.status === 'FREE' ? '空闲' : l.status === 'OCCUPIED' ? '占用' : '停用',
          使用人工号: a?.employeeId || '',
          使用人姓名: a?.employeeName || '',
          工厂: a?.factory || '',
          部门: a?.department || '',
          分配日期: a ? a.assignedAt.toISOString().split('T')[0] : '',
          备注: l.note || '',
        };
      });

      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, '更衣柜明细');
      const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
      const dateStr = new Date().toISOString().split('T')[0];
      return new NextResponse(excelBuffer, {
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(`更衣柜明细_${dateStr}.xlsx`)}`,
        },
      });
    }

    // 普通查询：支持关键字 + 状态筛选
    const keyword = (searchParams.get('keyword') || '').trim();
    const status = (searchParams.get('status') || '').trim();
    const where = {
      ...(status ? { status } : {}),
      ...(keyword
        ? {
            OR: [
              { lockerNo: { contains: keyword } },
              { rowName: { contains: keyword } },
              { assignments: { some: {
                OR: [
                  { employeeId: { contains: keyword } },
                  { employeeName: { contains: keyword } },
                  { factory: { contains: keyword } },
                  { department: { contains: keyword } },
                ],
              } } },
            ],
          }
        : {}),
    };

    const [lockers, stats, rowMax] = await Promise.all([
      prisma.locker.findMany({
        where,
        include: {
          assignments: {
            where: { status: 'ACTIVE' },
            take: 1,
            orderBy: { assignedAt: 'desc' },
          },
        },
        // 男柜在前（gender desc -> MALE first）；同性别内按 id 保持导入时的物理顺序（东→西→南…）
        orderBy: [{ gender: 'desc' }, { id: 'asc' }],
      }),
      prisma.locker.groupBy({
        by: ['gender', 'status'],
        _count: { _all: true },
      }),
      // 全量计算每排（性别+排名）的最大层号，用于「上排/下排/中排」标签（不受筛选影响）
      prisma.locker.groupBy({
        by: ['gender', 'rowName'],
        _max: { subRow: true },
      }),
    ]);

    const rowMaxSub: Record<string, number> = {};
    for (const r of rowMax) {
      rowMaxSub[`${r.gender}|${r.rowName}`] = r._max.subRow ?? 1;
    }

    const data = lockers.map((l) => ({
      id: l.id,
      gender: l.gender,
      area: l.area,
      rowName: l.rowName,
      subRow: l.subRow,
      lockerNo: l.lockerNo,
      status: l.status,
      note: l.note,
      current: l.assignments[0]
        ? {
            employeeId: l.assignments[0].employeeId,
            employeeName: l.assignments[0].employeeName,
            factory: l.assignments[0].factory,
            department: l.assignments[0].department,
            assignedAt: l.assignments[0].assignedAt,
          }
        : null,
    }));

    const statistics: Record<string, Record<string, number>> = { MALE: { FREE: 0, OCCUPIED: 0, DISABLED: 0 }, FEMALE: { FREE: 0, OCCUPIED: 0, DISABLED: 0 } };
    for (const g of stats) {
      statistics[g.gender]![g.status] = g._count._all;
    }

    return NextResponse.json({ data, statistics, rowMaxSub });
  } catch (error) {
    console.error('Error fetching lockers:', error);
    return NextResponse.json({ error: 'Failed to fetch lockers' }, { status: 500 });
  }
}

// POST /api/lockers 新增柜子 { gender, rowName, subRow, lockerNo, count?, note? }
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const gender = body.gender === 'FEMALE' ? 'FEMALE' : body.gender === 'MALE' ? 'MALE' : null;
    const rowName = typeof body.rowName === 'string' ? body.rowName.trim() : '';
    const lockerNo = typeof body.lockerNo === 'string' ? body.lockerNo.trim() : '';
    const subRow = Number(body.subRow) || 1;
    const note = typeof body.note === 'string' && body.note.trim() ? body.note.trim() : null;
    const count = Math.max(1, Math.min(200, Number(body.count) || 1));

    if (!gender) return NextResponse.json({ error: '请选择性别' }, { status: 400 });
    if (!rowName) return NextResponse.json({ error: '请填写排名称（如 东一排）' }, { status: 400 });
    if (!/^(东|西|南|中)/.test(rowName)) {
      return NextResponse.json({ error: '排名称需以 东/西/南/中 开头' }, { status: 400 });
    }
    if (!lockerNo) return NextResponse.json({ error: '请填写柜号' }, { status: 400 });

    const area = rowName.match(AREA_RE)![1];

    // 单个新增：查重
    if (count === 1) {
      const dup = await prisma.locker.findUnique({
        where: { gender_rowName_subRow_lockerNo: { gender, rowName, subRow, lockerNo } },
      });
      if (dup) {
        return NextResponse.json({ error: `${rowName} 第${subRow}排已存在柜号 ${lockerNo}` }, { status: 400 });
      }
    }

    // 批量新增（如 8101-8120）：取该排该层已有柜号，按数字递增
    let created = 0;
    if (count > 1) {
      const existing = await prisma.locker.findMany({
        where: { gender, rowName, subRow },
        select: { lockerNo: true },
      });
      const existingSet = new Set(existing.map((e) => e.lockerNo));
      let startNum = parseInt(lockerNo, 10);
      if (Number.isNaN(startNum)) return NextResponse.json({ error: '批量新增时起始柜号须为纯数字' }, { status: 400 });
      const width = lockerNo.length;
      const data: Array<{ gender: string; area: string; rowName: string; subRow: number; lockerNo: string; status: string; note: string | null }> = [];
      while (data.length < count) {
        const no = String(startNum).padStart(width, '0');
        if (!existingSet.has(no) && !data.some((d) => d.lockerNo === no)) {
          data.push({ gender, area, rowName, subRow, lockerNo: no, status: 'FREE', note });
        }
        startNum += 1;
      }
      const res = await prisma.locker.createMany({ data });
      created = res.count;
    } else {
      const res = await prisma.locker.create({
        data: { gender, area, rowName, subRow, lockerNo, status: 'FREE', note },
      });
      created = 1;
    }

    return NextResponse.json({ created }, { status: 201 });
  } catch (error) {
    console.error('Error creating locker:', error);
    return NextResponse.json({ error: 'Failed to create locker' }, { status: 500 });
  }
}
