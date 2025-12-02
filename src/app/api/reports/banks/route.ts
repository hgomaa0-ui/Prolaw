import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withCompany } from '@/lib/with-company';

// GET /api/reports/banks?from=YYYY-MM-DD&to=YYYY-MM-DD
// Returns [{ bank:{id,name,currency}, balance, transactions:[...] }]
export const GET = withCompany(async (req: NextRequest, companyId?: number | null) => {
  const from = req.nextUrl.searchParams.get('from');
  const to = req.nextUrl.searchParams.get('to');

  // لو الشركة مش معروفة (null/undefined) رجّع تقرير فاضي لحماية البيانات
  if (companyId == null) {
    return NextResponse.json([]);
  }

  // اعرض فقط البنوك الخاصة بهذه الشركة
  const bankWhere = { companyId };

  const banks = await prisma.bankAccount.findMany({
    where: bankWhere,
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

  // Include advance payments as incoming bank movements as well
  const advWhere: any = { bankId: { in: bankIds } };
  if (from) advWhere.paidOn = { gte: new Date(from) };
  if (to) {
    advWhere.paidOn = advWhere.paidOn || {};
    (advWhere.paidOn as any).lte = new Date(to);
  }
  const advs = await prisma.advancePayment.findMany({ where: advWhere, orderBy: { paidOn: 'asc' } });

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

  // add advance payments as positive movements
  for (const a of advs) {
    if (!grouped[a.bankId]) continue;
    grouped[a.bankId].transactions.push({
      id: a.id,
      date: a.paidOn,
      amount: Number(a.amount),
      currency: a.currency,
      memo: 'Advance payment',
    });
  }

  return NextResponse.json(Object.values(grouped));
});
