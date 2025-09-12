import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { withCompany } from '@/lib/with-company';

// GET /api/reports/banks?from=YYYY-MM-DD&to=YYYY-MM-DD
// Returns [{ bank:{id,name,currency}, balance, transactions:[...] }]
export const GET = withCompany(async (req: NextRequest, companyId?: number) => {
  if (!companyId) return NextResponse.json([]);

  const from = req.nextUrl.searchParams.get('from');
  const to = req.nextUrl.searchParams.get('to');

  const banks = await prisma.bankAccount.findMany({
    where: { OR: [ { companyId }, { companyId: null } ] },
    orderBy: { name: 'asc' },
  });

  const bankIds = banks.map(b => b.id);
  const txnWhere: any = { bankId: { in: bankIds } };
  if (from) txnWhere.createdAt = { gte: new Date(from) };
  if (to) {
    txnWhere.createdAt = txnWhere.createdAt || {};
    (txnWhere.createdAt as any).lte = new Date(to);
  }

  const txns = await prisma.bankTransaction.findMany({
    where: txnWhere,
    orderBy: { createdAt: 'asc' },
  });

  // group by bank
  const grouped: Record<number, any> = {};
  for (const b of banks) {
    grouped[b.id] = {
      bank: { id: b.id, name: b.name, currency: b.currency },
      balance: Number(b.balance),
      transactions: [],
    };
  }
  for (const t of txns) {
    if (!grouped[t.bankId]) continue;
    grouped[t.bankId].transactions.push({
      id: t.id,
      date: t.createdAt,
      amount: Number(t.amount),
      currency: t.currency,
      memo: t.memo,
    });
  }

  return NextResponse.json(Object.values(grouped));
});
