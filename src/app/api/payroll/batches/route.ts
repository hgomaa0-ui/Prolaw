import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';

interface Auth {
  id: number;
  role: string;
}

function decode(req: NextRequest): Auth | null {
  const auth = req.headers.get('authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) return null;
  try {
    return jwt.verify(token, JWT_SECRET) as any;
  } catch {
    return null;
  }
}

function canCreateBatch(role: string) {
  return role === 'ADMIN' || role === 'OWNER' || role.startsWith('HR');
}

// GET list batches
export async function GET(req: NextRequest) {
  const auth = decode(req);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const user = await prisma.user.findUnique({ where: { id: auth.id }, select: { companyId: true } });
  const batches = await prisma.payrollBatch.findMany({
    where: { companyId: user?.companyId || undefined },
    include: { items: { select: { id: true, netSalary: true, employee: { select: { name: true } } } } },
    orderBy: { createdAt: 'desc' },
  });
  return NextResponse.json(batches);
}

// POST create batch body { year, month }
export async function POST(req: NextRequest) {
  const auth = decode(req);
  if (!auth || !canCreateBatch(auth.role))
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { year, month } = await req.json();
  if (!year || !month) return NextResponse.json({ error: 'year, month required' }, { status: 400 });

  // fetch companyId
  const userRec = await prisma.user.findUnique({ where: { id: auth.id }, select: { companyId: true } });
  if (!userRec?.companyId) return NextResponse.json({ error: 'User not in company' }, { status: 400 });

  const existing = await prisma.payrollBatch.findFirst({ where: { companyId: userRec.companyId, year, month } });
  if (existing) return NextResponse.json({ error: 'Batch exists' }, { status: 400 });

  // active employees in company
  const employees = await prisma.employee.findMany({
    where: { status: 'ACTIVE', user: { companyId: userRec.companyId } },
    include: {
      salaries: {
        orderBy: { effectiveFrom: 'desc' },
        take: 1,
      },
      salaryDeductions: {
        where: {
          issuedOn: {
            gte: new Date(year, month - 1, 1),
            lte: new Date(year, month, 0),
          },
        },
      },
    },
  });

  const itemsData = employees.map((emp) => {
    const gross = emp.salaries[0]?.amount || 0;
    const totalDed = emp.salaryDeductions.reduce((acc, d) => acc + Number(d.amount), 0);
    const net = Number(gross) - totalDed;
    return {
      employeeId: emp.id,
      grossSalary: gross,
      totalDeductions: totalDed,
      netSalary: net,
    };
  });

  const batch = await prisma.payrollBatch.create({
    data: {
      companyId: userRec.companyId,
      month,
      year,
      createdById: auth.id,
      items: { createMany: { data: itemsData } },
    },
    include: { items: true },
  });

  return NextResponse.json(batch, { status: 201 });
}

// DELETE /api/payroll/batches?id= - delete batch if still in DRAFT
export async function DELETE(req: NextRequest) {
  const auth = decode(req);
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const idParam = searchParams.get('id');
  const id = idParam ? Number(idParam) : NaN;
  if (!id || isNaN(id)) {
    return NextResponse.json({ error: 'id required' }, { status: 400 });
  }

  // نحاول حذف الباتش بشرط أن تظل في حالة DRAFT، حتى لو لم تُحذف أي سجلات نرجّع ok
  await prisma.payrollBatch.deleteMany({ where: { id, status: 'DRAFT' } });
  return NextResponse.json({ ok: true });
}
