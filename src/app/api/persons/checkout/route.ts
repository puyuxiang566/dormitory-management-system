import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { disablePersonFaceRecords } from '@/lib/services/faceSyncService'; // Assuming this exists based on imports

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { personIds } = body;

    if (!personIds || !Array.isArray(personIds) || personIds.length === 0) {
      return NextResponse.json(
        { error: 'personIds is required and must be a non-empty array' },
        { status: 400 }
      );
    }

    // Get original person data to record correct history
    const personsBefore = await prisma.person.findMany({
      where: { id: { in: personIds } }
    });

    // Prepare operations for transaction
    const operations = personsBefore.map(person => {
      return prisma.person.update({
        where: { id: person.id },
        data: {
          status: 'MOVED_OUT',
          building: { disconnect: true },
          room: { disconnect: true },
          bedNumber: null,
          isRoomLeader: false,
          checkInDate: null, // 清空入住日期
          checkOutDate: new Date(),
        }
      });
    });

    // Execute updates
    const updatedPersons = await prisma.$transaction(operations);

    // Disable face records and log history for each person
    const historyData = personsBefore.map(person => {
      // Disable face records async (don't block the transaction)
      disablePersonFaceRecords(person.id).catch(e => console.error(`Failed to disable face records for person ${person.id}`, e));

      return {
        personId: person.id,
        fromRoomId: person.roomId,
        toRoomId: null,
        changeDate: new Date(),
        reason: '一键退宿',
      };
    });

    if (historyData.length > 0) {
      await prisma.roomChangeHistory.createMany({
        data: historyData.map(h => ({
           personId: h.personId,
           fromRoomId: h.fromRoomId,
           toRoomId: h.toRoomId,
           changeDate: h.changeDate,
           reason: h.reason,
        }))
      });
    }

    return NextResponse.json({
      success: updatedPersons.length,
      message: `Successfully checked out ${updatedPersons.length} persons.`
    });
  } catch (error) {
    console.error('Error during batch checkout:', error);
    return NextResponse.json(
      { error: 'Failed to complete checkout' },
      { status: 500 }
    );
  }
}
