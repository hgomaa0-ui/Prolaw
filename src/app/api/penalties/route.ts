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
  const { employeeId, amount, days, currency: curInput='USD', reason, date } = await req.json();
  if (!employeeId) return NextResponse.json({ error:'employeeId required'},{status:400});

  let amt:number|undefined = amount;
  let curr = curInput;
  if(amt===undefined && days!==undefined){
    const latest = await prisma.salary.findFirst({ where:{ employeeId:Number(employeeId) }, orderBy:{ effectiveFrom:'desc' } });
    if(!latest) return NextResponse.json({ error:'No salary found to derive amount'},{status:400});
    curr = latest.currency;
    amt = (Number(latest.amount)/30*Number(days));
  }
  if(amt===undefined) return NextResponse.json({ error:'amount or days required'},{status:400});
  const penalty = await prisma.penalty.create({
    data:{
      employeeId:Number(employeeId),
      amount: Number(amt.toFixed(2)),
      currency: curr,
      reason: reason ?? (days?`UNPAID_LEAVE ${days} days`:null),
      date: date? new Date(date): new Date(),
      createdById: user.id? Number(user.id): user.sub? Number(user.sub): undefined,
    }
  });
  return NextResponse.json(penalty, { status: 201 });
}
