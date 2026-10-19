import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const contact = await prisma.emergencyContact.findUnique({
      where: { id: parseInt(params.id) },
      include: {
        person: true,
      },
    });

    if (!contact) {
      return NextResponse.json(
        { error: 'Contact not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(contact);
  } catch (error) {
    console.error('Error fetching emergency contact:', error);
    return NextResponse.json(
      { error: 'Failed to fetch emergency contact' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { name, relationship, phone, note } = body;

    const contact = await prisma.emergencyContact.update({
      where: { id: parseInt(params.id) },
      data: {
        name,
        relationship,
        phone,
        note,
      },
    });

    return NextResponse.json(contact);
  } catch (error) {
    console.error('Error updating emergency contact:', error);
    return NextResponse.json(
      { error: 'Failed to update emergency contact' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await prisma.emergencyContact.delete({
      where: { id: parseInt(params.id) },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting emergency contact:', error);
    return NextResponse.json(
      { error: 'Failed to delete emergency contact' },
      { status: 500 }
    );
  }
}
