import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withIdempotency } from '@/lib/idempotency';

export async function POST(req: Request) {
  return withIdempotency(req, async () => {
    try {
    const { inventoryId, quantity } = await req.json();

    if (!inventoryId || !quantity || quantity <= 0) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
    }

    // 10 minutes expiry
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    // Atomically increment reservedUnits only if enough stock is available.
    // Using raw SQL to avoid race conditions.
    const updatedRows = await prisma.$executeRaw`
      UPDATE "Inventory"
      SET "reservedUnits" = "reservedUnits" + ${quantity}
      WHERE "id" = ${inventoryId} AND ("totalUnits" - "reservedUnits") >= ${quantity}
    `;

    if (updatedRows === 0) {
      return NextResponse.json({ error: 'Not enough available stock' }, { status: 409 });
    }

    // Since we secured the inventory, we can now safely create the reservation.
    const reservation = await prisma.reservation.create({
      data: {
        inventoryId,
        quantity,
        status: 'PENDING',
        expiresAt,
      },
    });

    return NextResponse.json(reservation, { status: 201 });
    } catch (error) {
      console.error('Reservation error:', error);
      return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
  });
}
