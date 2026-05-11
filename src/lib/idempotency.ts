import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function withIdempotency(
  req: Request,
  handler: () => Promise<NextResponse>
): Promise<NextResponse> {
  const idempotencyKey = req.headers.get('Idempotency-Key');

  if (!idempotencyKey) {
    return handler();
  }

  try {
    // Check if key already exists
    const existing = await prisma.idempotencyRecord.findUnique({
      where: { key: idempotencyKey }
    });

    if (existing) {
      if (existing.status === 'COMPLETED' && existing.responseBody && existing.statusCode) {
        return NextResponse.json(JSON.parse(existing.responseBody), { status: existing.statusCode });
      }
      if (existing.status === 'IN_PROGRESS') {
        return NextResponse.json({ error: 'Request is already in progress' }, { status: 409 });
      }
    }

    // Try to create an IN_PROGRESS record
    await prisma.idempotencyRecord.create({
      data: {
        key: idempotencyKey,
        status: 'IN_PROGRESS'
      }
    });

    // Run handler
    const response = await handler();
    
    // We need to extract the response body and status
    const clone = response.clone();
    let bodyText = null;
    try {
      bodyText = await clone.text();
    } catch(e) {}

    await prisma.idempotencyRecord.update({
      where: { key: idempotencyKey },
      data: {
        status: 'COMPLETED',
        responseBody: bodyText,
        statusCode: response.status
      }
    });

    return response;

  } catch (error: any) {
    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'Request is already in progress' }, { status: 409 });
    }

    try {
      await prisma.idempotencyRecord.delete({ where: { key: idempotencyKey } });
    } catch(e) {}

    throw error;
  }
}
