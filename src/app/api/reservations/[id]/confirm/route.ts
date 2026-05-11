import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withIdempotency } from '@/lib/idempotency';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return withIdempotency(req, async () => {
    try {
    const { id } = await params;

    const result = await prisma.$transaction(async (tx) => {
      const reservation = await tx.reservation.findUnique({ where: { id } });

      if (!reservation) {
        throw new Error("NOT_FOUND");
      }

      if (reservation.status === 'RELEASED') {
        throw new Error("EXPIRED");
      }

      if (reservation.status === 'CONFIRMED') {
        throw new Error("ALREADY_CONFIRMED");
      }

      if (reservation.expiresAt < new Date()) {
        // Auto-release if expired during confirm attempt
        await tx.reservation.update({ where: { id }, data: { status: 'RELEASED' } });
        await tx.$executeRaw`
          UPDATE Inventory 
          SET reservedUnits = reservedUnits - ${reservation.quantity} 
          WHERE id = ${reservation.inventoryId}
        `;
        throw new Error("EXPIRED");
      }

      // Proceed to confirm
      const updatedReservation = await tx.reservation.update({
        where: { id },
        data: { status: 'CONFIRMED' }
      });

      // Commit the reservation (decrement total and reserved)
      await tx.$executeRaw`
        UPDATE Inventory
        SET totalUnits = totalUnits - ${reservation.quantity},
            reservedUnits = reservedUnits - ${reservation.quantity}
        WHERE id = ${reservation.inventoryId}
      `;

      return updatedReservation;
    });

    return NextResponse.json(result);
    } catch (error: any) {
      if (error.message === 'NOT_FOUND') {
        return NextResponse.json({ error: 'Reservation not found' }, { status: 404 });
      }
      if (error.message === 'EXPIRED') {
        return NextResponse.json({ error: 'Reservation has expired' }, { status: 410 });
      }
      if (error.message === 'ALREADY_CONFIRMED') {
        return NextResponse.json({ error: 'Reservation already confirmed' }, { status: 400 });
      }
      console.error('Confirm error:', error);
      return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
  });
}
