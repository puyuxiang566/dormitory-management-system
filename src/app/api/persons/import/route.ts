import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import * as XLSX from 'xlsx';

interface ImportRow {
  employeeId: string;
  name: string;
  department: string | null;
  position: string | null;
  phone: string | null;
  idCard: string | null;
  gender: string | null;
  factory: string | null;
  isRoomLeader: boolean | null;
  status: string | null;
  buildingName: string | null;
  roomNumber: string | null;
  bedNumber: string | null;
  checkInDate: Date | null;
  checkOutDate: Date | null;
  buildingId: number | null;
  roomId: number | null;
  historyRecords: { recordType: string; changeDate: string; toRoomStr: string; reason: string }[];
  emergencyName: string | null;
  emergencyRelationship: string | null;
  emergencyPhone: string | null;
  rowIndex: number;
  // 内部字段，用于导入时传递原始值
  _gender?: string | null;
  _status?: string | null;
}

interface DuplicateInfo {
  rowIndex: number;
  importData: ImportRow;
  existingPerson: {
    id: number;
    employeeId: string;
    name: string;
    gender?: string | null;
    factory?: string | null;
    department?: string | null;
    position?: string | null;
    phone?: string | null;
    idCard?: string | null;
    isRoomLeader?: boolean | null;
    status?: string | null;
    buildingName?: string | null;
    roomNumber?: string | null;
    bedNumber?: string | null;
    checkInDate?: Date | null;
    checkOutDate?: Date | null;
    emergencyName?: string | null;
    emergencyRelationship?: string | null;
    emergencyPhone?: string | null;
  };
}

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

async function parseRow(row: any, rowIndex: number): Promise<ImportRow | null> {
  const employeeId = String(row['工号'] || row['employeeId'] || '').trim();
  const name = String(row['姓名'] || row['name'] || '').trim();

  if (!employeeId || !name) {
    return null;
  }

  const buildingName = String(row['楼栋'] || row['building'] || '').trim();
  let buildingId: number | null = null;
  let roomId: number | null = null;

  if (buildingName) {
    const building = await prisma.building.findFirst({
      where: { name: buildingName },
    });
    if (building) {
      buildingId = building.id;
      const roomNumberForQuery = String(row['房间'] || row['room'] || '').trim();
      if (roomNumberForQuery) {
        const room = await prisma.room.findFirst({
          where: { buildingId: building.id, roomNumber: roomNumberForQuery },
        });
        if (room) {
          roomId = room.id;
        }
      }
    }
  }

  const genderMap: Record<string, string> = {
    '男': 'MALE', '女': 'FEMALE', 'MALE': 'MALE', 'FEMALE': 'FEMALE', 'm': 'MALE', 'f': 'FEMALE',
  };
  const genderRaw = row['性别'] || row['gender'];
  const gender = genderRaw ? (genderMap[String(genderRaw).toUpperCase()] || null) : null;

  const statusMap: Record<string, string> = {
    '在职住宿': 'ACTIVE', 'ACTIVE': 'ACTIVE', '已退宿': 'MOVED_OUT', 'MOVED_OUT': 'MOVED_OUT',
    '黑名单': 'BLACKLISTED', 'BLACKLISTED': 'BLACKLISTED', '正常': 'ACTIVE', '离职': 'MOVED_OUT',
  };
  const statusRaw = row['状态'] || row['status'];
  const status = statusRaw ? (statusMap[String(statusRaw).toUpperCase()] || 'ACTIVE') : 'ACTIVE';

  const factoryMap: Record<string, string> = {
    'IMCN': 'imcn', 'IMAW': 'imaw', 'IMFT': 'imft', '职能部门': '职能部门',
  };
  const factoryRaw = row['工厂'] || row['factory'];
  const factory = factoryRaw ? (factoryMap[String(factoryRaw).toUpperCase()] || 'imcn') : 'imcn';

  const isRoomLeaderRaw = row['是否舍长'] || row['isRoomLeader'];
  const isRoomLeader = isRoomLeaderRaw === '是' || isRoomLeaderRaw === 'true' || isRoomLeaderRaw === true;

  const checkInDate = parseDate(row['入住日期'] || row['checkInDate']);
  const checkOutDate = parseDate(row['退宿日期'] || row['checkOutDate']);

  const historyRecords: { recordType: string; changeDate: string; toRoomStr: string; reason: string }[] = [];
  const historyCell = row['住宿变动记录'] || row['historyRecords'] || '';
  if (historyCell && String(historyCell).trim()) {
    const lines = historyCell.split('\n').filter((line: string) => line.trim());
    for (const line of lines) {
      const parts = line.split('|').map((p: string) => p.trim());
      if (parts.length >= 2) {
        let toRoomStr = parts[2] || '';
        let reason = parts[3] || '';
        // 只有当 toRoomStr 是单纯的记录类型（不是房间信息）时才移动
        // 房间信息格式通常是"X号楼 XXX"，包含数字和"号楼"字样
        const isRoomInfo = toRoomStr.match(/^\d+号楼?\s+\d+/) || toRoomStr.match(/号楼/);
        if (toRoomStr && !isRoomInfo && (toRoomStr === '退宿' || toRoomStr === '入住' || toRoomStr === '换宿')) {
          reason = toRoomStr;
          toRoomStr = '';
        }
        if (reason === '重新分配') reason = '信息修改导致换宿';
        else if (reason === '入住') reason = '入住/重新分配';
        historyRecords.push({ recordType: parts[0] || '', changeDate: parts[1] || '', toRoomStr, reason });
      }
    }
  }

  return {
    employeeId,
    name,
    department: row['部门'] || row['department'] ? String(row['部门'] || row['department']) : null,
    position: row['职位'] || row['position'] ? String(row['职位'] || row['position']) : null,
    phone: row['联系电话'] || row['phone'] ? String(row['联系电话'] || row['phone']) : null,
    idCard: row['身份证号'] || row['idCard'] ? String(row['身份证号'] || row['idCard']) : null,
    gender,
    factory,
    isRoomLeader,
    status,
    buildingName,
    roomNumber: row['房间'] || row['room'] ? String(row['房间'] || row['room']) : null,
    bedNumber: row['床位号'] || row['bedNumber'] ? String(row['床位号'] || row['bedNumber']) : null,
    checkInDate,
    checkOutDate,
    buildingId,
    roomId,
    historyRecords,
    emergencyName: row['紧急联系人姓名'] || row['emergencyContactName'] ? String(row['紧急联系人姓名'] || row['emergencyContactName']) : null,
    emergencyRelationship: row['紧急联系人关系'] || row['emergencyContactRelationship'] ? String(row['紧急联系人关系'] || row['emergencyContactRelationship']) : null,
    emergencyPhone: row['紧急联系人电话'] || row['emergencyContactPhone'] ? String(row['紧急联系人电话'] || row['emergencyContactPhone']) : null,
    rowIndex,
  };
}

async function createPersonFromRow(data: ImportRow): Promise<number> {
  const person = await prisma.person.create({
    data: {
      employeeId: data.employeeId,
      name: data.name,
      department: data.department || null,
      position: data.position || null,
      phone: data.phone || null,
      idCard: data.idCard || null,
      gender: data.gender || null,
      factory: data.factory || 'imcn',
      isRoomLeader: data.isRoomLeader || false,
      status: data.status || 'ACTIVE',
      buildingId: data.buildingId || null,
      roomId: data.roomId || null,
      bedNumber: data.bedNumber || null,
      checkInDate: data.checkInDate,
      checkOutDate: data.checkOutDate,
    },
  });

  if (data.emergencyName || data.emergencyPhone) {
    await prisma.emergencyContact.create({
      data: {
        personId: person.id,
        name: data.emergencyName || '',
        relationship: data.emergencyRelationship || '',
        phone: data.emergencyPhone || '',
      },
    });
  }

  let finalCheckInDate = data.checkInDate;
  let lastRoomId: number | null = data.roomId ?? null;

  for (const record of data.historyRecords) {
    if (!record.recordType || !record.changeDate) continue;
    if (!finalCheckInDate && record.recordType === '入住') {
      finalCheckInDate = new Date(record.changeDate);
    }

    let fromRoomId: number | null = null;
    let toRoomId: number | null = null;

    if (record.toRoomStr) {
      const toParts = record.toRoomStr.trim().split(/[\s,]+/);
      if (toParts.length >= 2) {
        let toBuilding = await prisma.building.findFirst({ where: { name: toParts[0] } });
        if (!toBuilding && /^\d+$/.test(toParts[0])) {
          toBuilding = await prisma.building.findFirst({ where: { name: { contains: toParts[0] } } });
        }
        if (toBuilding) {
          const room = await prisma.room.findFirst({ where: { buildingId: toBuilding.id, roomNumber: toParts[1] } });
          if (room) toRoomId = room.id;
        }
      }
    }

    if (record.recordType === '入住') {
      fromRoomId = null;
      if (!toRoomId) toRoomId = data.roomId ?? null;
      lastRoomId = toRoomId;
    } else if (record.recordType === '退宿') {
      fromRoomId = lastRoomId;
      toRoomId = null;
    } else if (record.recordType === '换宿' || record.recordType === '信息修改导致换宿') {
      fromRoomId = lastRoomId;
      // 如果没有解析到目标房间，使用人员当前房间
      if (!toRoomId) toRoomId = data.roomId ?? null;
      if (toRoomId) lastRoomId = toRoomId;
    }

    await prisma.roomChangeHistory.create({
      data: {
        personId: person.id,
        fromRoomId,
        toRoomId,
        changeDate: new Date(record.changeDate),
        reason: record.recordType || null,
      },
    });
  }

  if (!data.checkInDate && finalCheckInDate) {
    await prisma.person.update({ where: { id: person.id }, data: { checkInDate: finalCheckInDate } });
  }

  if (data.status === 'ACTIVE' && data.checkInDate && data.historyRecords.length === 0) {
    await prisma.roomChangeHistory.create({
      data: {
        personId: person.id,
        fromRoomId: null,
        toRoomId: data.roomId ?? null,
        changeDate: data.checkInDate,
        reason: '入住',
      },
    });
  }

  return person.id;
}

async function updatePersonFromRow(personId: number, data: ImportRow): Promise<void> {
  await prisma.person.update({
    where: { id: personId },
    data: {
      name: data.name,
      department: data.department || null,
      position: data.position || null,
      phone: data.phone || null,
      idCard: data.idCard || null,
      gender: data.gender || null,
      factory: data.factory || 'imcn',
      isRoomLeader: data.isRoomLeader || false,
      status: data.status || 'ACTIVE',
      buildingId: data.buildingId || null,
      roomId: data.roomId || null,
      bedNumber: data.bedNumber || null,
      checkInDate: data.checkInDate,
      checkOutDate: data.checkOutDate,
    },
  });

  await prisma.emergencyContact.deleteMany({ where: { personId } });
  if (data.emergencyName || data.emergencyPhone) {
    await prisma.emergencyContact.create({
      data: {
        personId,
        name: data.emergencyName || '',
        relationship: data.emergencyRelationship || '',
        phone: data.emergencyPhone || '',
      },
    });
  }
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer);
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(worksheet);

    const results = {
      success: 0,
      failed: 0,
      errors: [] as string[],
      duplicates: [] as DuplicateInfo[],
      hasDuplicates: false,
    };

    const rows: ImportRow[] = [];
    for (let i = 0; i < data.length; i++) {
      const row = data[i] as any;
      const parsed = await parseRow(row, i + 2);
      if (parsed) {
        rows.push(parsed);
      } else {
        results.failed++;
        results.errors.push(`第 ${i + 2} 行: 缺少工号或姓名`);
      }
    }

    for (const row of rows) {
      const existingPerson = await prisma.person.findUnique({
        where: { employeeId: row.employeeId },
        include: { building: true, room: true, emergencycontact: true },
      });

      if (existingPerson) {
        const genderMap: Record<string, string> = { MALE: '男', FEMALE: '女' };
        const statusMap: Record<string, string> = { ACTIVE: '在住', MOVED_OUT: '已退宿', BLACKLISTED: '黑名单' };

        results.duplicates.push({
          rowIndex: row.rowIndex,
          importData: {
            employeeId: row.employeeId,
            name: row.name,
            gender: row.gender ? genderMap[row.gender] || row.gender : null,
            factory: row.factory ?? null,
            department: row.department ?? null,
            position: row.position ?? null,
            phone: row.phone ?? null,
            idCard: row.idCard ?? null,
            isRoomLeader: row.isRoomLeader ?? null,
            status: row.status ? statusMap[row.status] || row.status : null,
            buildingName: row.buildingName,
            roomNumber: row.roomNumber,
            bedNumber: row.bedNumber,
            checkInDate: row.checkInDate,
            checkOutDate: row.checkOutDate,
            emergencyName: row.emergencyName,
            emergencyRelationship: row.emergencyRelationship,
            emergencyPhone: row.emergencyPhone,
            // 内部字段用于覆盖
            buildingId: row.buildingId,
            roomId: row.roomId,
            _gender: row.gender,
            _status: row.status,
            // 必需字段
            historyRecords: row.historyRecords,
            rowIndex: row.rowIndex,
          },
          existingPerson: {
            id: existingPerson.id,
            employeeId: existingPerson.employeeId,
            name: existingPerson.name,
            gender: existingPerson.gender ? genderMap[existingPerson.gender] || existingPerson.gender : null,
            factory: existingPerson.factory,
            department: existingPerson.department,
            position: existingPerson.position,
            phone: existingPerson.phone,
            idCard: existingPerson.idCard,
            isRoomLeader: existingPerson.isRoomLeader,
            status: existingPerson.status ? statusMap[existingPerson.status] || existingPerson.status : null,
            buildingName: existingPerson.building?.name || null,
            roomNumber: existingPerson.room?.roomNumber || null,
            bedNumber: existingPerson.bedNumber,
            checkInDate: existingPerson.checkInDate,
            checkOutDate: existingPerson.checkOutDate,
            emergencyName: existingPerson.emergencycontact?.[0]?.name || null,
            emergencyRelationship: existingPerson.emergencycontact?.[0]?.relationship || null,
            emergencyPhone: existingPerson.emergencycontact?.[0]?.phone || null,
          },
        });
        results.hasDuplicates = true;
      } else {
        try {
          await createPersonFromRow(row);
          results.success++;
        } catch (error: any) {
          results.failed++;
          results.errors.push(`第 ${row.rowIndex} 行: ${error.message}`);
        }
      }
    }

    return NextResponse.json(results);
  } catch (error) {
    console.error('Error importing persons:', error);
    return NextResponse.json({ error: 'Failed to import persons' }, { status: 500 });
  }
}
