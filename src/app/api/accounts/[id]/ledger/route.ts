import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const accountId = parseInt(params.id, 10);
  if (Number.isNaN(accountId)) {
    return NextResponse.json({ error: 'Invalid account id' }, { status: 400 });
  }

  // date filters (optional)
  const startStr = request.nextUrl.searchParams.get('start');
  const endStr = request.nextUrl.searchParams.get('end');
  const start = startStr ? new Date(startStr) : undefined;
  const end = endStr ? new Date(endStr) : undefined;

  // Opening balance: sum of all lines before start
  let opening: Record<string, number> = {};
  if (start) {
    const openingRaw = await prisma.transactionLine.groupBy({
      by: ['currency'],
      where: {
        accountId,
        transaction: { date: { lt: start } },
      },
      _sum: { debit: true, credit: true },
    });
    openingRaw.forEach((o) => {
      opening[o.currency] = Number(o._sum.debit ?? 0) - Number(o._sum.credit ?? 0);
    });
  }

  // Fetch lines within period (or all if no filter)
  const whereLines: any = { accountId };
  if (start || end) {
    whereLines.transaction = {};
    if (start) whereLines.transaction.date = { ...(whereLines.transaction.date || {}), gte: start };
    if (end) whereLines.transaction.date = { ...(whereLines.transaction.date || {}), lte: end };
  }

  const lines = await prisma.transactionLine.findMany({
    where: whereLines,
    include: {
      transaction: { select: { id: true, date: true, memo: true } },
    },
    orderBy: { transaction: { date: 'asc' } },
  });

  return NextResponse.json({ opening, lines });
}
