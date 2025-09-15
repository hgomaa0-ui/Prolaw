import { NextRequest, NextResponse } from 'next/server';
import { withCompany } from '@/lib/with-company';
import { prisma } from '@/lib/prisma';

export const GET = withCompany(async (req: NextRequest, companyId?: number) => {
  const from = req.nextUrl.searchParams.get('from');
  const to = req.nextUrl.searchParams.get('to');

  const where: any = {};
  if (companyId) where.employee = { companyId };
  if (from) where.clockIn = { gte: new Date(from) };
  if (to) {
    where.clockIn = where.clockIn || {};
    (where.clockIn as any).lte = new Date(to);
  }

  const records = await prisma.attendance.findMany({
    where,
    include: { employee: { select: { name: true } } },
    orderBy: { clockIn: 'asc' },
  });

  const rows = [
    ['Employee', 'ClockIn', 'ClockOut'],
    ...records.map((r) => [r.employee.name, r.clockIn.toISOString(), r.clockOut ? r.clockOut.toISOString() : '']),
  ];
  const csv = rows.map((row) => row.map((field) => `"${field.replace(/"/g, '""')}` ).join(',')).join('\n');

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="attendance.csv"',
    },
  });
});
