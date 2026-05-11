import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const expiredReservations = await prisma.reservation.findMany({
      where: {
        status: 'PENDING',
        expiresAt: { lt: new Date() }
      }
    });

    let releasedCount = 0;

    for (const reservation of expiredReservations) {
      try {
        await prisma.$transaction(async (tx) => {
          const res = await tx.reservation.findUnique({ where: { id: reservation.id } });
          if (res?.status === 'PENDING') {
            await tx.reservation.update({
              where: { id: reservation.id },
              data: { status: 'RELEASED' }
            });
            await tx.$executeRaw`
              UPDATE Inventory
              SET reservedUnits = reservedUnits - ${reservation.quantity}
              WHERE id = ${reservation.inventoryId}
            `;
            releasedCount++;
          }
        });
      } catch (e) {
        console.error(`Failed to release reservation ${reservation.id}:`, e);
      }
    }

    return NextResponse.json({ message: `Released ${releasedCount} expired reservations.` });
  } catch (error) {
    console.error('Cleanup cron error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
