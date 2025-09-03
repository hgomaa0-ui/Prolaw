import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withCompany } from '@/lib/with-company';

// GET /api/reports/office-expenses?from=YYYY-MM-DD&to=YYYY-MM-DD
export const GET = withCompany(async (req: NextRequest, companyId?: number) => {
  if (!companyId) return NextResponse.json([]);

  const from = req.nextUrl.searchParams.get('from');
  const to = req.nextUrl.searchParams.get('to');

  const where: any = {
    lines: {
      some: {
        debit: { gt: 0 },
        account: { type: 'EXPENSE', companyId },
      },
    },
  };
  if (from || to) {
    where.date = {};
    if (from) (where.date as any).gte = new Date(from);
    if (to) (where.date as any).lte = new Date(to);
  }

  const txns = await prisma.transaction.findMany({
    where,
    orderBy: { date: 'asc' },
    include: { lines: { include: { account: true } } },
  });

  const items = txns.map((t) => {
    const exp = t.lines.find((l) => Number(l.debit) > 0 && l.account.type === 'EXPENSE');
    const cash = t.lines.find((l) => Number(l.credit) > 0 && ['ASSET', 'TRUST'].includes(l.account.type));
    return {
      id: t.id,
      date: t.date,
      memo: t.memo,
      amount: Number(exp?.debit || 0),
      currency: exp?.currency,
      expenseAccount: exp?.account.name,
      cashAccount: cash?.account.name,
      cashAmount: Number(cash?.credit || 0),
      cashCurrency: cash?.currency,
    };
  });

  return NextResponse.json(items);
});
