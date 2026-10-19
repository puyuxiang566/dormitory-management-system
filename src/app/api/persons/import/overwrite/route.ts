import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

interface OverwriteItem {
  existingId: number;
  importData: {
    employeeId: string;
    name: string;
    department?: string;
    position?: string;
    phone?: string;
    idCard?: string;
    _gender?: string;
    factory?: string;
    isRoomLeader?: boolean;
    _status?: string;
    buildingId?: number | null;
    roomId?: number | null;
    bedNumber?: string;
    checkInDate?: Date | null;
    checkOutDate?: Date | null;
    emergencyName?: string;
    emergencyRelationship?: string;
    emergencyPhone?: string;
  };
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { overwriteList } = body as { overwriteList: OverwriteItem[] };

    if (!overwriteList || !Array.isArray(overwriteList)) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const results = {
      success: 0,
      failed: 0,
      errors: [] as string[],
    };

    for (const item of overwriteList) {
      try {
        await prisma.person.update({
          where: { id: item.existingId },
          data: {
            name: item.importData.name,
            department: item.importData.department || null,
            position: item.importData.position || null,
            phone: item.importData.phone || null,
            idCard: item.importData.idCard || null,
            gender: item.importData._gender || null,
            factory: item.importData.factory || 'imcn',
            isRoomLeader: item.importData.isRoomLeader || false,
            status: item.importData._status || 'ACTIVE',
            buildingId: item.importData.buildingId || null,
            roomId: item.importData.roomId || null,
            bedNumber: item.importData.bedNumber || null,
            checkInDate: item.importData.checkInDate,
            checkOutDate: item.importData.checkOutDate,
          },
        });

        await prisma.emergencyContact.deleteMany({ where: { personId: item.existingId } });
        if (item.importData.emergencyName || item.importData.emergencyPhone) {
          await prisma.emergencyContact.create({
            data: {
              personId: item.existingId,
              name: item.importData.emergencyName || '',
              relationship: item.importData.emergencyRelationship || '',
              phone: item.importData.emergencyPhone || '',
            },
          });
        }

        results.success++;
      } catch (error: any) {
        results.failed++;
        results.errors.push(`工号 ${item.importData.employeeId}: ${error.message}`);
      }
    }

    return NextResponse.json(results);
  } catch (error) {
    console.error('Error overwriting persons:', error);
    return NextResponse.json({ error: 'Failed to overwrite persons' }, { status: 500 });
  }
}
