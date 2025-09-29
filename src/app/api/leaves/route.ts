import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';

function getAuthPayload(req: NextRequest): { id?: number; role?: string } | null {
  const auth = req.headers.get('authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) return null;
  try {
    return jwt.verify(token, JWT_SECRET) as any;
  } catch {
    return null;
  }
}

function getUserRole(req: NextRequest): string | null {
  return getAuthPayload(req)?.role || null;
}

function getUserId(req: NextRequest): number | null {
  const payload = getAuthPayload(req);
  const raw = payload?.id ?? payload?.sub;
  if (raw === undefined || raw === null) return null;
  const num = typeof raw === 'number' ? raw : Number(raw);
  return isNaN(num) ? null : num;
}

function isHR(role: string | null) {
  // ADMIN_REPORTS is NOT HR; restrict to own leaves
  return role === 'ADMIN' || role === 'HR_MANAGER' || role==='OWNER';
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const fromParam = searchParams.get('from') || null;
  const toParam = searchParams.get('to') || null;
  const role = getUserRole(req);
  const userId = getUserId(req);

  // build where clause
  const whereClause: any = {
    AND: [
      fromParam ? { startDate: { gte: new Date(fromParam) } } : {},
      toParam ? { endDate: { lte: new Date(toParam) } } : {},
    ],
  };
  if (!isHR(role)) {
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const emp = await prisma.employee.findFirst({ where: { userId } });
    // if no employee record, return empty list to avoid breaking the page for new users
    if (!emp) return NextResponse.json([]);
    whereClause.employeeId = emp.id;
  }

  const leaves = await prisma.leaveRequest.findMany({
    where: whereClause,
    include: {
      employee: { select: { name: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
  return NextResponse.json(leaves);
}

export async function POST(req: NextRequest) {
  const role = getUserRole(req);
  const userId = getUserId(req);
  let { employeeId, startDate, endDate, type, reason } = await req.json();

  if (!isHR(role)) {
    // Override employeeId with current user's employee record
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const emp = await prisma.employee.findFirst({ where: { userId } });
    if (!emp) return NextResponse.json({ error: 'No employee record' }, { status: 404 });
    employeeId = emp.id;
  } else {
    employeeId = Number(employeeId);
  }
  employeeId = Number(employeeId);
  if (!employeeId || !startDate || !endDate || !type) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }
  // compute days diff inclusive
  const daysDiff = Math.floor((new Date(endDate).getTime() - new Date(startDate).getTime())/(24*60*60*1000))+1;
  if(daysDiff<=0) return NextResponse.json({error:'Invalid date range'},{status:400});
  if(type==='ANNUAL'){
    const emp = await prisma.employee.findUnique({where:{id:employeeId}});
    if(!emp) return NextResponse.json({error:'Employee not found'},{status:404});
    const bal = Number(emp.leaveBalanceDays||0);
    if(bal<daysDiff) return NextResponse.json({error:`Insufficient leave balance (${bal} days available)`},{status:400});
  }
  const leave = await prisma.leaveRequest.create({
    data: {
      employeeId,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      type,
      reason,
    },
    include: { employee: { select: { name: true } } },
  });
  await import('@/lib/notify').then(m=>m.notifyRole(['HR_MANAGER','ADMIN'],`طلب إجازة جديد من ${leave.startDate.toISOString().slice(0,10)} إلى ${leave.endDate.toISOString().slice(0,10)}`,'LEAVE_NEW'));
  return NextResponse.json(leave, { status: 201 });
}
