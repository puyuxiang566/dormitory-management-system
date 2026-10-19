import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { updatePersonPermissionGroup, disablePersonFaceRecords, createFaceRecordForPerson } from '@/lib/services/faceSyncService';

interface RouteParams {
  params: { id: string };
}

export async function GET(request: Request, { params }: RouteParams) {
  try {
    const person = await prisma.person.findUnique({
      where: { id: parseInt(params.id) },
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
          orderBy: {
            changeDate: 'desc',
          },
          take: 10,
        },
        application: true,
        bill: true,
        facerecord: {
          where: { isActive: true },
          include: {
            permissiongroup: true,
          },
        },
      },
    });

    if (!person) {
      return NextResponse.json(
        { error: 'Person not found' },
        { status: 404 }
      );
    }

    const safePerson = {
      ...person,
      idCard: person.idCard || null,
      hasFaceRecord: person.facerecord.length > 0,
      emergencyContacts: person.emergencycontact.map(ec => ({
        id: ec.id,
        name: ec.name,
        relationship: ec.relationship,
        phone: ec.phone,
        note: ec.note,
      })),
    };

    return NextResponse.json(safePerson);
  } catch (error) {
    console.error('Error fetching person:', error);
    return NextResponse.json(
      { error: 'Failed to fetch person' },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request, { params }: RouteParams) {
  try {
    const body = await request.json();
    const personId = parseInt(params.id);

    // 获取原始人员信息
    const originalPerson = await prisma.person.findUnique({
      where: { id: personId },
    });

    if (!originalPerson) {
      return NextResponse.json(
        { error: 'Person not found' },
        { status: 404 }
      );
    }

    const {
      employeeId,
      name,
      department,
      position,
      phone,
      idCard,
      gender,
      status,
      buildingId,
      roomId,
      bedNumber,
      checkInDate,
      checkOutDate,
      emergencyContacts,
      faceData,
      captureMethod,
      factory,
    } = body;

    const updateData: any = {
      employeeId,
      name,
      department,
      position,
      phone: phone ? String(phone) : null,
      gender,
      status,
      bedNumber,
      factory,
    };

    if (buildingId !== undefined) {
      updateData.building = buildingId ? { connect: { id: buildingId } } : { disconnect: true };
    }
    
    if (roomId !== undefined) {
      updateData.room = roomId ? { connect: { id: roomId } } : { disconnect: true };
    }

    // 处理 checkInDate 和 checkOutDate
    if (status === 'MOVED_OUT' && originalPerson.status !== 'MOVED_OUT') {
      // 状态变更为退宿：清空住宿信息并设置退宿时间
      updateData.building = { disconnect: true };
      updateData.room = { disconnect: true };
      updateData.bedNumber = null;
      updateData.isRoomLeader = false;
      updateData.checkInDate = null; // 清空入住日期
      updateData.checkOutDate = checkOutDate ? new Date(checkOutDate) : new Date();
    } else if (status === 'MOVED_OUT' && originalPerson.status === 'MOVED_OUT') {
      // 已经是退宿状态：保持 checkInDate 为空
      updateData.checkInDate = null;
      if (checkOutDate !== undefined) {
        updateData.checkOutDate = checkOutDate ? new Date(checkOutDate) : null;
      }
    } else if (originalPerson.status === 'MOVED_OUT' && status === 'ACTIVE' && roomId) {
      // 从退宿变为入住状态：设置新的入住日期
      updateData.checkInDate = new Date();
      updateData.checkOutDate = null;
    } else {
      // 其他情况：只有当提供了 checkInDate 时才更新
      if (checkInDate !== undefined) {
        updateData.checkInDate = checkInDate ? new Date(checkInDate) : null;
      }
      if (checkOutDate !== undefined) {
        updateData.checkOutDate = checkOutDate ? new Date(checkOutDate) : null;
      }
    }

    if (idCard && idCard !== '***') {
      updateData.idCard = String(idCard);
    }

    const { isRoomLeader } = body;
    if (isRoomLeader !== undefined) {
        updateData.isRoomLeader = isRoomLeader;
    }

    // 如果房间或床位发生变化，记录换宿历史
    // 另外：入住时（从退宿即null变更为有room）也记录
    // 另外：退宿时（变更为 MOVED_OUT）也记录
    let historyReason = null;
    let fromRoomId = originalPerson.roomId || null;
    let toRoomId = roomId !== undefined ? roomId : originalPerson.roomId;

    if (status === 'MOVED_OUT' && originalPerson.status !== 'MOVED_OUT') {
       toRoomId = null;
       historyReason = '退宿';
    } else if (originalPerson.status === 'MOVED_OUT' && status === 'ACTIVE' && roomId) {
       historyReason = '入住/重新分配';
       toRoomId = roomId;
    } else if (
        (buildingId !== undefined && roomId !== undefined && bedNumber !== undefined) &&
        (buildingId !== originalPerson.buildingId || roomId !== originalPerson.roomId || bedNumber !== originalPerson.bedNumber) &&
        status !== 'MOVED_OUT' &&
        originalPerson.status !== 'MOVED_OUT'
    ) {
       historyReason = '信息修改导致换宿';
       toRoomId = roomId;
    }

    // 更新人员信息
    const person = await prisma.person.update({
      where: { id: personId },
      data: updateData,
      include: {
        building: true,
        room: true,
        emergencycontact: true,
      },
    });

    // 更新紧急联系人
    if (emergencyContacts !== undefined) {
      // 先删除现有紧急联系人
      await prisma.emergencyContact.deleteMany({ where: { personId } });

      // 创建新的紧急联系人（如果有）
      if (Array.isArray(emergencyContacts) && emergencyContacts.length > 0) {
        await prisma.emergencyContact.createMany({
          data: emergencyContacts.map((contact: any) => ({
            personId,
            name: contact.name || '',
            relationship: contact.relationship || '',
            phone: contact.phone ? String(contact.phone) : '',
            note: contact.note || '',
          })),
        });
      }
    }

    // 更新房间状态
    const updateRoomStatus = async (roomId: number | null) => {
      if (!roomId) return;
      const room = await prisma.room.findUnique({
        where: { id: roomId },
        include: { person: true },
      });
      if (!room) return;
      const occupiedCount = room.person.filter((p: any) => p.status === 'ACTIVE').length;
      let newStatus = 'VACANT';
      if (occupiedCount >= room.bedCount) {
        newStatus = 'OCCUPIED';
      } else if (occupiedCount > 0) {
        newStatus = 'OCCUPIED';
      }
      if (room.status !== newStatus) {
        await prisma.room.update({
          where: { id: roomId },
          data: { status: newStatus },
        });
      }
    };

    // 更新原房间和新房间状态
    await updateRoomStatus(originalPerson.roomId);
    await updateRoomStatus(person.roomId);

    if (historyReason) {
        await prisma.roomChangeHistory.create({
            data: {
                personId: person.id,
                fromRoomId: fromRoomId,
                toRoomId: toRoomId,
                changeDate: new Date(),
                reason: historyReason,
            }
        });
    }

    // 处理权限变更
    const permissionUpdates: string[] = [];

    // 1. 如果楼栋变更，更新权限组
    if (buildingId !== undefined && buildingId !== originalPerson.buildingId && buildingId) {
      const success = await updatePersonPermissionGroup(personId, buildingId);
      if (success) {
        permissionUpdates.push('权限组已更新');
      }
    }

    // 2. 如果状态变更，处理人脸权限
    if (status !== undefined && status !== originalPerson.status) {
      if (status === 'MOVED_OUT' || status === 'BLACKLISTED') {
        // 退宿或加入黑名单，禁用人脸权限
        await disablePersonFaceRecords(personId);
        permissionUpdates.push('人脸权限已禁用');
      }
    }

    // 3. 如果提供了新的人脸数据，创建或更新人脸记录
    let faceSyncResult = null;
    if (faceData) {
      faceSyncResult = await createFaceRecordForPerson({
        personId,
        faceData,
        captureMethod: captureMethod || 'MANUAL_INPUT',
        autoAssignPermission: true,
      });
    }

    // 重新查询人员数据以获取更新后的紧急联系人
    const updatedPerson = await prisma.person.findUnique({
      where: { id: personId },
      include: {
        building: true,
        room: true,
        emergencycontact: true,
      },
    });

    return NextResponse.json({
      ...updatedPerson,
      permissionUpdates,
      faceSync: faceSyncResult,
    });
  } catch (error) {
    console.error('Error updating person:', error);
    return NextResponse.json(
      { error: 'Failed to update person' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const personId = parseInt(params.id);

    await prisma.$transaction([
      prisma.emergencyContact.deleteMany({ where: { personId } }),
      prisma.roomChangeHistory.deleteMany({ where: { personId } }),
      prisma.faceRecord.deleteMany({ where: { personId } }),
      prisma.accessRecord.deleteMany({ where: { personId } }),
      prisma.application.deleteMany({ where: { personId } }),
      prisma.bill.deleteMany({ where: { personId } }),
      prisma.payment.deleteMany({ where: { personId } }),
      prisma.visitor.deleteMany({ where: { hostId: personId } }),
      prisma.maintenanceTicket.deleteMany({ where: { personId: personId } }),
      prisma.asset.updateMany({
        where: { responsiblePersonId: personId },
        data: { responsiblePersonId: null }
      }),
      prisma.person.delete({ where: { id: personId } }),
    ]);

    return NextResponse.json(
      { message: 'Person deleted successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error deleting person:', error);
    return NextResponse.json(
      { error: 'Failed to delete person' },
      { status: 500 }
    );
  }
}
