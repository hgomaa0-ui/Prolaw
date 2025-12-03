import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withCompany } from '@/lib/with-company';

// GET /api/reports/office-expenses?from=YYYY-MM-DD&to=YYYY-MM-DD
export const GET = withCompany(async (req: NextRequest, companyId?: number) => {
  if (!companyId) return NextResponse.json([]);

  const from = req.nextUrl.searchParams.get('from');
  const to = req.nextUrl.searchParams.get('to');

  // بعض السجلات القديمة ممكن يكون companyId فيها null لكن مربوطة بحساب بنك تابع للشركة
  // لذلك نفلتر إما على companyId مباشرة أو على شركة البنك
  const where: any = {
    OR: [
      { companyId },
      { companyId: null, bank: { companyId } },
    ],
  };
  if (from) where.createdAt = { gte: new Date(from) };
  if (to) {
    where.createdAt = where.createdAt || {};
    (where.createdAt as any).lte = new Date(to);
  }

  const expenses = await prisma.officeExpense.findMany({
    where,
    orderBy: { createdAt: 'asc' },
    include: { bank: true, project: { select: { name: true } } },
  });

  const items = expenses.map((e) => ({
    id: e.id,
    date: e.createdAt,
    memo: e.notes,
    amount: Number(e.amount),
    currency: e.currency,
    expenseAccount: e.project ? e.project.name : 'Office',
    cashAccount: e.bank?.name || '—',
    cashAmount: Number(e.amount),
    cashCurrency: e.currency,
  }));

  return NextResponse.json(items);
});
