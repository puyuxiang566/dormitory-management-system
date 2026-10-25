import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createFaceRecordForPerson, updatePersonPermissionGroup, disablePersonFaceRecords } from '@/lib/services/faceSyncService';
import { getFactoryOptions } from '@/lib/factory-config';
import { normalizeFactoryCode } from '@/lib/factory-utils';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    // 分页参数
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '10');

    // 搜索和筛选
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || '';

    // 构建查询条件
    const where: any = {};

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

    // 获取总数
    const total = await prisma.person.count({ where });

    // 获取数据
    const persons = await prisma.person.findMany({
      where,
      include: {
        building: true,
        room: true,
        facerecord: {
          where: { isActive: true },
          take: 1,
        },
        emergencycontact: true,
        roomchangehistory: {
          where: {
            reason: { not: '信息修改导致换宿' },
          },
          orderBy: { changeDate: 'asc' },
          take: 1,
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    const safePersons = persons.map(person => {
      // 如果没有 checkInDate，尝试从入住记录中获取（仅对在住人员）
      let finalCheckInDate = person.checkInDate ? person.checkInDate.toISOString() : null;
      if (!finalCheckInDate && person.status === 'ACTIVE' && person.roomchangehistory && person.roomchangehistory.length > 0) {
        const checkInRecord = person.roomchangehistory.find((h: any) => h.toRoomId !== null);
        if (checkInRecord) {
          finalCheckInDate = checkInRecord.changeDate.toISOString();
        }
      }
      
      return {
        ...person,
        idCard: person.idCard || null,
        checkInDate: finalCheckInDate,
        checkOutDate: person.checkOutDate ? person.checkOutDate.toISOString() : null,
        hasFaceRecord: person.facerecord.length > 0,
        facerecord: undefined,
        roomchangehistory: undefined,
        emergencyContacts: person.emergencycontact.map(ec => ({
          name: ec.name,
          relationship: ec.relationship,
          phone: ec.phone,
        })),
        factory: person.factory,
      };
    });

    return NextResponse.json({
      data: safePersons,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (error) {
    console.error('Error fetching persons:', error);
    return NextResponse.json(
      { error: 'Failed to fetch persons' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      employeeId,
      name,
      department,
      position,
      phone,
      idCard,
      gender,
      buildingId,
      roomId,
      bedNumber,
      checkInDate,
      emergencyContacts,
      faceData, // 人脸数据（可选）
      captureMethod, // 采集方式（可选）
      factory, // 工厂归属（二选一）
    } = body;

    const factories = await getFactoryOptions({ includeInactive: false });
    const defaultFactory = factories[0]?.code || 'imcn';

    // 创建人员档案
    const person = await prisma.person.create({
      data: {
        employeeId,
        name,
        department,
        position,
        phone: phone ? String(phone) : null,
        idCard: idCard || null,
        gender,
        buildingId,
        roomId,
        bedNumber,
        factory: normalizeFactoryCode(factory) || defaultFactory,
        status: 'ACTIVE',
        checkInDate: checkInDate ? new Date(checkInDate) : new Date(),
        ...(emergencyContacts && emergencyContacts.length > 0 && {
          emergencycontact: {
            create: emergencyContacts.map((contact: any) => ({
              name: contact.name,
              relationship: contact.relationship,
              phone: contact.phone,
              note: contact.note,
            })),
          },
        }),
      },
      include: {
        emergencycontact: true,
        building: true,
      },
    });

    // 如果提供了人脸数据，自动创建人脸记录
    let faceSyncResult = null;
    if (faceData) {
      faceSyncResult = await createFaceRecordForPerson({
        personId: person.id,
        faceData,
        captureMethod: captureMethod || 'MANUAL_INPUT',
        autoAssignPermission: true,
      });
    }

    // 创建入住记录
    if (roomId && checkInDate) {
      await prisma.roomChangeHistory.create({
        data: {
          personId: person.id,
          fromRoomId: null,
          toRoomId: roomId,
          changeDate: checkInDate ? new Date(checkInDate) : new Date(),
          reason: '入住',
        },
      });
    } else if (roomId) {
      await prisma.roomChangeHistory.create({
        data: {
          personId: person.id,
          fromRoomId: null,
          toRoomId: roomId,
          changeDate: new Date(),
          reason: '入住',
        },
      });
    }

    // 转换紧急联系人字段名为驼峰式
    const responsePerson = {
      ...person,
      emergencyContacts: person.emergencycontact || [],
      emergencycontact: undefined,
    };

    return NextResponse.json(
      {
        ...responsePerson,
        faceSync: faceSyncResult,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating person:', error);
    return NextResponse.json(
      { error: 'Failed to create person' },
      { status: 500 }
    );
  }
}
