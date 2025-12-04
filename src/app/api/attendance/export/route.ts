import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';

export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  let companyId: number | undefined;
  if (token) {
    try {
      const payload: any = jwt.verify(token, JWT_SECRET);
      const cid = payload?.companyId;
      if (cid !== undefined && cid !== null) {
        companyId = typeof cid === 'number' ? cid : Number(cid);
      }
    } catch {
      // ignore, treat as no company scope
    }
  }

  const from = req.nextUrl.searchParams.get('from');
  const to = req.nextUrl.searchParams.get('to');

  const where: any = {};
  if (from) where.clockIn = { gte: new Date(from) };
  if (to) {
    where.clockIn = where.clockIn || {};
    (where.clockIn as any).lte = new Date(to);
  }
  if (companyId) {
    where.employee = { user: { companyId } };
  }

  const records = await prisma.attendance.findMany({
    where,
    include: { employee: { select: { name: true } } },
    orderBy: { clockIn: 'asc' },
  });

  const rows = [
    ['EmployeeId','Employee', 'ClockIn', 'ClockOut'],
    ...records.map((r) => [r.employeeId?.toString()||'', r.employee.name, r.clockIn.toISOString(), r.clockOut ? r.clockOut.toISOString() : '']),
  ];
  const csv = rows
    .map((row) =>
      row
        .map((field) => {
          const str = String(field ?? '');
          return `"${str.replace(/"/g, '""')}"`;
        })
        .join(',')
    )
    .join('\n');

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="attendance.csv"',
    },
  });
}
