import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthServer } from '@/lib/auth';

export async function GET(req: NextRequest) {
  // optional auth check
  const token = getAuthServer(req);
  const user = token ? true : null;
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  // Return last 300 cash related transaction lines (accounts 1000-1099)
  const lines = await prisma.transactionLine.findMany({
    where: {
      account: {
        code: {
          startsWith: '10',
        },
      },
    },
    include: {
      transaction: true,
      account: true,
    },
    orderBy: {
      transaction: { date: 'desc' },
    },
    take: 300,
  });

  return NextResponse.json(lines);
}
