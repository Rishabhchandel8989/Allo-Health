import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const products = await prisma.product.findMany({
      include: {
        inventory: {
          include: {
            warehouse: true,
          },
        },
      },
    });

    const formattedProducts = products.map((p) => ({
      ...p,
      inventory: p.inventory.map((inv) => ({
        id: inv.id,
        warehouseId: inv.warehouseId,
        warehouseName: inv.warehouse.name,
        totalUnits: inv.totalUnits,
        reservedUnits: inv.reservedUnits,
        availableStock: inv.totalUnits - inv.reservedUnits,
      })),
    }));

    return NextResponse.json(formattedProducts);
  } catch (error) {
    console.error('Error fetching products:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
