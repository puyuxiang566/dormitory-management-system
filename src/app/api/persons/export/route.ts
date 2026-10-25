import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import * as XLSX from 'xlsx';
import { decrypt } from '@/lib/crypto';
import { getFactoryOptions } from '@/lib/factory-config';
import { buildFactoryNameMap } from '@/lib/factory-utils';

export async function GET(request: Request) {
  try {
    console.log('Export request received');
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || '';
    const idsParam = searchParams.get('ids') || '';

    console.log('Search params:', { search, status, idsParam });

    const where: any = {};

    // 如果指定了 IDs，优先导出选中的人员
    if (idsParam) {
      const ids = idsParam.split(',').map(id => parseInt(id)).filter(id => !isNaN(id));
      if (ids.length > 0) {
        where.id = { in: ids };
      }
    } else {
      // 否则根据搜索和筛选条件导出
      if (status) {
        where.status = status;
      }

      if (search) {
        where.OR = [
          { name: { contains: search } },
          { employeeId: { contains: search } },
          { phone: { contains: search } },
        ];
      }
    }

    console.log('Where clause:', where);

    const persons = await prisma.person.findMany({
      where,
      include: {
        building: true,
        room: true,
        emergencycontact: true,
        roomchangehistory: {
          include: {
            room_roomchangehistory_fromRoomIdToroom: {
              include: { building: true },
            },
            room_roomchangehistory_toRoomIdToroom: {
              include: { building: true },
            },
          },
        },
      },
      orderBy: {
        employeeId: 'asc',
      },
    });

    console.log('Found persons:', persons.length);

    const genderMap: Record<string, string> = {
      MALE: '男',
      FEMALE: '女',
    };

    const statusMap: Record<string, string> = {
      ACTIVE: '在住',
      MOVED_OUT: '已退宿',
      BLACKLISTED: '黑名单',
    };

    const factories = await getFactoryOptions();
    const factoryMap = buildFactoryNameMap(factories);

    const data: any[] = [];
    
    // 安全解密函数，处理非加密格式或解密失败的情况
    const safeDecrypt = (text: string | null): string => {
      if (!text) return '';
      try {
        // 检查是否包含加密标志（冒号）
        if (text.includes(':')) {
          return decrypt(text);
        }
        // 如果不包含冒号，可能是未加密的明文，直接返回
        return text;
      } catch (error) {
        console.error('Decrypt error:', error);
        // 解密失败，返回原始值
        return text;
      }
    };
    
    for (const person of persons) {
      const firstContact = person.emergencycontact && person.emergencycontact.length > 0
        ? person.emergencycontact[0]
        : null;

      const histories = (person.roomchangehistory || []).slice(0, 10);
      
      const historyLines: string[] = [];
      for (const history of histories) {
        if (history) {
          const toRoomId = history.room_roomchangehistory_toRoomIdToroom?.id || history.toRoomId;
          const fromRoomId = history.room_roomchangehistory_fromRoomIdToroom?.id || history.fromRoomId;
          let recordType = '';
          let displayReason = history.reason || '';

          // 优先根据 reason 字段判断记录类型
          if (history.reason === '退宿') {
            recordType = '退宿';
          } else if (history.reason === '入住' || history.reason === '入住/重新分配') {
            recordType = '入住';
            if (displayReason === '入住/重新分配') {
              displayReason = '入住';
            }
          } else if (history.reason === '换宿' || history.reason === '信息修改导致换宿') {
            recordType = '换宿';
            if (displayReason === '信息修改导致换宿') {
              displayReason = '重新分配';
            }
          } else {
            // 根据 toRoomId/fromRoomId 推断
            if (!toRoomId) {
              recordType = '退宿';
            } else if (!fromRoomId) {
              recordType = '入住';
            } else {
              recordType = '换宿';
            }
          }
          const changeDate = history.changeDate ? history.changeDate.toISOString().split('T')[0] : '';
          
          // 入住和换宿显示目标房间，退宿显示原房间
          let roomInfo = '';
          if (recordType === '退宿') {
            roomInfo = history.room_roomchangehistory_fromRoomIdToroom
              ? `${history.room_roomchangehistory_fromRoomIdToroom.building?.name || ''} ${history.room_roomchangehistory_fromRoomIdToroom.roomNumber || ''}`
              : '';
          } else {
            roomInfo = history.room_roomchangehistory_toRoomIdToroom
              ? `${history.room_roomchangehistory_toRoomIdToroom.building?.name || ''} ${history.room_roomchangehistory_toRoomIdToroom.roomNumber || ''}`
              : '';
          }
          
          const line = [recordType, changeDate, roomInfo, displayReason].filter(Boolean).join(' | ');
          if (line) historyLines.push(line);
        }
      }
      
      data.push({
        '工号': person.employeeId,
        '姓名': person.name,
        '性别': genderMap[person.gender || ''] || person.gender || '',
        '工厂': factoryMap[person.factory || ''] || person.factory || '',
        '部门': person.department || '',
        '职位': person.position || '',
        '联系电话': person.phone || '',
        '身份证号': person.idCard ? safeDecrypt(person.idCard) : '',
        '是否舍长': person.isRoomLeader ? '是' : '否',
        '紧急联系人姓名': firstContact?.name || '',
        '紧急联系人关系': firstContact?.relationship || '',
        '紧急联系人电话': firstContact?.phone || '',
        '状态': statusMap[person.status] || person.status,
        '楼栋': person.building?.name || '',
        '房间': person.room?.roomNumber || '',
        '床位号': person.bedNumber || '',
        '入住日期': person.checkInDate ? person.checkInDate.toISOString().split('T')[0] : '',
        '退宿日期': person.checkOutDate ? person.checkOutDate.toISOString().split('T')[0] : '',
        '住宿变动记录': historyLines.join('\n'),
      });
    }

    console.log('Export data prepared');

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, '人员信息');

    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    console.log('Excel file generated');

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(`人员信息_${new Date().toISOString().split('T')[0]}.xlsx`)}`,
      },
    });
  } catch (error) {
    console.error('Error exporting persons:', error);
    console.error('Error stack:', (error as Error).stack);
    return NextResponse.json(
      { error: 'Failed to export persons' },
      { status: 500 }
    );
  }
}
