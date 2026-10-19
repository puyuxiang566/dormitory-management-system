import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { ids } = body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { error: 'ids is required and must be a non-empty array' },
        { status: 400 }
      );
    }

    const personIds = ids.map((id: string | number) => Number(id));

    const deleteResults = await Promise.allSettled(
      personIds.map(async (personId) => {
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
      })
    );

    const success = deleteResults.filter(r => r.status === 'fulfilled').length;
    const failed = deleteResults.filter(r => r.status === 'rejected').length;

    return NextResponse.json({
      success,
      failed,
    });
  } catch (error) {
    console.error('Error during batch delete:', error);
    return NextResponse.json(
      { error: 'Failed to complete batch delete' },
      { status: 500 }
    );
  }
}
