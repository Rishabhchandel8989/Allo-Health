import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    const result = await prisma.$transaction(async (tx) => {
      const reservation = await tx.reservation.findUnique({ where: { id } });

      if (!reservation) {
        throw new Error("NOT_FOUND");
      }

      if (reservation.status !== 'PENDING') {
        throw new Error("NOT_PENDING");
      }

      // Proceed to release
      const updatedReservation = await tx.reservation.update({
        where: { id },
        data: { status: 'RELEASED' }
      });

      // Free up the reserved stock
        await tx.$executeRaw`
          UPDATE "Inventory"
          SET "reservedUnits" = "reservedUnits" - ${reservation.quantity}
          WHERE "id" = ${reservation.inventoryId}
        `;

      return updatedReservation;
    });

    return NextResponse.json(result);
  } catch (error: any) {
    if (error.message === 'NOT_FOUND') {
      return NextResponse.json({ error: 'Reservation not found' }, { status: 404 });
    }
    if (error.message === 'NOT_PENDING') {
      return NextResponse.json({ error: 'Reservation is not in pending state' }, { status: 400 });
    }
    console.error('Release error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
