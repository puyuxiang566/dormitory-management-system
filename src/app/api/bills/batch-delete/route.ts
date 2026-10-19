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

    const billIds = ids.map((id: string | number) => Number(id));

    const deleteResults = await Promise.allSettled(
      billIds.map(async (billId) => {
        await prisma.bill.delete({
          where: { id: billId },
        });
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
