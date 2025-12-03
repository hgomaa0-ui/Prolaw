import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withCompany } from '@/lib/with-company';

// GET /api/reports/office-expenses?from=YYYY-MM-DD&to=YYYY-MM-DD
// نسمح للتقرير بالعمل حتى لو لم يتم تحديد companyId، بالاعتماد فقط على التاريخ
export const GET = withCompany(async (req: NextRequest, _companyId?: number) => {

  const from = req.nextUrl.searchParams.get('from');
  const to = req.nextUrl.searchParams.get('to');

  // فلترة بالتاريخ فقط لضمان ظهور كل الحركات حتى لو كان ال companyId قديم أو غير مضبوط
  const expenseWhere: any = {};
  if (from) expenseWhere.createdAt = { gte: new Date(from) };
  if (to) {
    expenseWhere.createdAt = expenseWhere.createdAt || {};
    (expenseWhere.createdAt as any).lte = new Date(to);
  }

  const expenses = await prisma.officeExpense.findMany({
    where: expenseWhere,
    orderBy: { createdAt: 'asc' },
    include: { bank: true, project: { select: { name: true } } },
  });

  // جلب المرتبات من ال PayrollBatch/PayrollItem لنفس فترة التاريخ
  const payrollWhere: any = {};
  if (from) payrollWhere.createdAt = { gte: new Date(from) };
  if (to) {
    payrollWhere.createdAt = payrollWhere.createdAt || {};
    (payrollWhere.createdAt as any).lte = new Date(to);
  }

  const batches = await prisma.payrollBatch.findMany({
    where: payrollWhere,
    orderBy: { createdAt: 'asc' },
    include: {
      items: {
        include: {
          employee: { select: { name: true } },
        },
      },
    },
  });

  const officeItems = expenses.map((e) => ({
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

  const salaryItems = batches.flatMap((b) =>
    b.items.map((it) => ({
      id: it.id,
      date: b.createdAt,
      memo: it.employee?.name || 'Salary',
      amount: Number(it.netSalary),
      currency: 'USD',
      expenseAccount: 'Salary',
      cashAccount: '—',
      cashAmount: Number(it.netSalary),
      cashCurrency: 'USD',
    }))
  );

  const items = [...officeItems, ...salaryItems].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  return NextResponse.json(items);
});
