import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withCompany } from '@/lib/with-company';

// GET /api/reports/salaries?from=YYYY-MM-DD&to=YYYY-MM-DD
// تقرير مرتبات الشركة الحالية فقط (حسب companyId من التوكن)
export const GET = withCompany(async (req: NextRequest, companyId?: number) => {
  if (!companyId) {
    // لو مش عارفين الشركة نرجّع تقرير فاضي، عشان ما نخلطش بين مكاتب
    return NextResponse.json([]);
  }

  const from = req.nextUrl.searchParams.get('from');
  const to = req.nextUrl.searchParams.get('to');

  const where: any = { companyId };
  if (from) where.createdAt = { gte: new Date(from) };
  if (to) {
    where.createdAt = where.createdAt || {};
    (where.createdAt as any).lte = new Date(to);
  }

  const batches = await prisma.payrollBatch.findMany({
    where,
    orderBy: { createdAt: 'asc' },
    include: {
      items: {
        include: {
          employee: { select: { name: true } },
        },
      },
    },
  });

  const rows = batches.flatMap((b) =>
    b.items.map((it) => ({
      batchId: b.id,
      period: `${b.month}/${b.year}`,
      status: b.status,
      employeeId: it.employeeId,
      employeeName: it.employee?.name || 'Employee',
      grossSalary: Number(it.grossSalary),
      totalDeductions: Number(it.totalDeductions),
      netSalary: Number(it.netSalary),
      createdAt: b.createdAt,
    }))
  );

  return NextResponse.json(rows);
});
