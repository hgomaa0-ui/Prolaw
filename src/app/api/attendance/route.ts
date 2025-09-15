import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';

type Decoded = { id:number; role:string; employeeId?:number };

function decode(req: NextRequest): Decoded | null {
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
  return role === 'ADMIN' || role === 'HR_MANAGER' || role === 'OWNER';
}

// GET /api/attendance?from=&to=&employeeId=
export async function GET(req: NextRequest) {
  const user = decode(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const from = searchParams.get('from');
  const to = searchParams.get('to');
  const empIdStr = searchParams.get('employeeId');
  const filters: any = { AND: [] as any[] };
  if (from) filters.AND.push({ clockIn: { gte: new Date(from) } });
  if (to) filters.AND.push({ clockIn: { lte: new Date(to) } });
  if (empIdStr) filters.AND.push({ employeeId: Number(empIdStr) });
  // employees can only see their own
  if (!isHR(user.role)) filters.AND.push({ employeeId: user.employeeId ?? 0 });

  const whereCond = filters.AND.length? filters : {};
  const records = await prisma.attendance.findMany({
    where: whereCond,
    include: { employee: { select: { name: true } } },
    orderBy: { clockIn: 'desc' },
  });
  return NextResponse.json(records);
}

// POST /api/attendance (clock-in)
export async function POST(req: NextRequest) {
  const user = decode(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await req.json();
  const { employeeId, clockIn, clockOut } = body;
  const targetEmpId = employeeId || user.employeeId;
  if (!targetEmpId) return NextResponse.json({ error: 'employeeId required' }, { status: 400 });

  // manual add if clockIn provided
  if (clockIn) {
    const rec = await prisma.attendance.create({ data: { employeeId: targetEmpId, clockIn: new Date(clockIn), ...(clockOut?{clockOut:new Date(clockOut)}:{}) } });
    return NextResponse.json(rec, { status: 201 });
  }

  // normal clock-in flow
  const open = await prisma.attendance.findFirst({ where: { employeeId: targetEmpId, clockOut: null } });
  if (open) return NextResponse.json({ error: 'Already clocked in' }, { status: 400 });
  const rec = await prisma.attendance.create({ data: { employeeId: targetEmpId } });
  // late if after 09:15 local
  const threshold = new Date();
  threshold.setHours(9,15,0,0);
  if(rec.clockIn > threshold){
    await prisma.notification.create({
      data:{
        userId: user.id,
        type: 'Late Clock-in',
        message:`You clocked in late at ${rec.clockIn.toLocaleTimeString()}`
      }
    });
  }
  return NextResponse.json(rec, { status: 201 });
}

// PUT /api/attendance (clock-out latest open)
export async function PUT(req: NextRequest) {
  const user = decode(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { employeeId } = await req.json();
  const targetEmpId = employeeId || user.employeeId;
  if (!targetEmpId) return NextResponse.json({ error: 'employeeId required' }, { status: 400 });
  const rec = await prisma.attendance.findFirst({ where: { employeeId: targetEmpId, clockOut: null }, orderBy: { clockIn: 'desc' } });
  if (!rec) return NextResponse.json({ error: 'No open attendance' }, { status: 400 });
  const updated = await prisma.attendance.update({ where: { id: rec.id }, data: { clockOut: new Date() } });
  return NextResponse.json(updated);
}
