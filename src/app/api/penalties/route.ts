import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';

function getUser(req: NextRequest) {
  const auth = req.headers.get('authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) return null;
  try {
    return jwt.verify(token, JWT_SECRET) as any;
  } catch {
    return null;
  }
}

function isHR(role: string | null) {
  if(!role) return false;
  const r = role.toUpperCase();
  if(r === 'ADMIN') return true;
  return r === 'HR' || r.startsWith('HR_') || r === 'HRMANAGER' || r.startsWith('HR') || r==='OWNER';
}

// ---------------------------------------------------------------------------
// GET /api/penalties?employeeId=
// HR: sees all / filter by employee
// Employee: sees own only
// ---------------------------------------------------------------------------
export async function GET(req: NextRequest) {
  const user = getUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const empIdParam = req.nextUrl.searchParams.get('employeeId');
  const where: any = {};
  if (empIdParam) where.employeeId = Number(empIdParam);
  if (!isHR(user.role)) {
    // not HR: limit to their own employeeId
    if (!user.employeeId) return NextResponse.json([], { status: 200 });
    where.employeeId = user.employeeId;
  }
  const penalties = await prisma.penalty.findMany({
    where,
    include: { employee: { select: { name: true } }, createdBy: { select: { name: true } } },
    orderBy: { date: 'desc' },
  });
  return NextResponse.json(penalties);
}

// ---------------------------------------------------------------------------
// POST /api/penalties  (HR only)
// body: { employeeId, amount, currency, reason, date? }
// ---------------------------------------------------------------------------
export async function POST(req: NextRequest) {
  const user = getUser(req);
  if (!user || !isHR(user.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const { employeeId, amount, currency = 'USD', reason, date } = await req.json();
  if (!employeeId || !amount) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }
  const penalty = await prisma.penalty.create({
    data: {
      employeeId: Number(employeeId),
      amount,
      currency,
      reason,
      date: date ? new Date(date) : new Date(),
      createdById: user.id ? Number(user.id) : user.sub ? Number(user.sub) : undefined,
    },
  });
  return NextResponse.json(penalty, { status: 201 });
}
