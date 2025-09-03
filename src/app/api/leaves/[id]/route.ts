import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';

function getUserRole(req: NextRequest): string | null {
  const auth = req.headers.get('authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) return null;
  try {
    const d = jwt.verify(token, JWT_SECRET) as any;
    return d?.role || null;
  } catch {
    return null;
  }
}

function isHR(role: string | null) {
  return role === 'ADMIN' || role === 'HR_MANAGER';
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const role = getUserRole(req);
  if (!isHR(role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const id = Number(params.id);
  const leave = await prisma.leaveRequest.findUnique({
    where: { id },
    include: { employee: { select: { name: true } } },
  });
  if (!leave) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(leave);
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const role = getUserRole(req);
  const auth = req.headers.get('authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  let userId: number | undefined;
  if (token) {
    try {
      const p: any = jwt.verify(token, JWT_SECRET);
      userId = p?.id ?? p?.sub;
    } catch {}
  }
  const id = Number(params.id);
  const body = await req.json() as any;
  const { status, startDate, endDate, type, reason } = body;

  const leave = await prisma.leaveRequest.findUnique({ where: { id }, include:{ employee:true } });
  if (!leave) return NextResponse.json({ error:'Not found'},{status:404});

  if (!isHR(role)) {
    // only owner can update reason/dates or delete while pending; cannot change status
    if (leave.employee.userId !== userId) return NextResponse.json({ error:'Forbidden'},{status:403});
    return NextResponse.json({ error:'Only HR can change status'},{status:403});
  }
  if (!['PENDING', 'APPROVED', 'REJECTED'].includes(status)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
  }
  const wasPending = leave.status === 'PENDING';
  const updatedLeave = await prisma.leaveRequest.update({ where: { id }, data: { status }, include:{ employee:true} });

  // deduct leave balance once when approved
  if(wasPending && status === 'APPROVED'){
    const days = Math.ceil((updatedLeave.endDate.getTime()-updatedLeave.startDate.getTime())/86400000)+1;
    await prisma.employee.update({ where:{ id: updatedLeave.employeeId}, data:{ leaveBalanceDays:{ decrement: days }}});
  }

  // create notification for employee
  await prisma.notification.create({
    data:{
      userId: leave.employee.userId,
      type: `LEAVE_${status}`,
      message: `Your leave request from ${leave.startDate.toISOString().slice(0,10)} to ${leave.endDate.toISOString().slice(0,10)} has been ${status.toLowerCase()}.`,
    }
  });

  return NextResponse.json(leave);
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const role = getUserRole(req);
  const auth = req.headers.get('authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  let userId: number | null = null;
  if (token) {
    try {
      const payload: any = jwt.verify(token, JWT_SECRET);
      userId = payload?.id ?? payload?.sub ?? null;
    } catch {}
  }

  const id = Number(params.id);
  const leave = await prisma.leaveRequest.findUnique({ where: { id }, include:{ employee:true } });
  if (!leave) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  if (!isHR(role)) {
    // only owner can delete if pending
    if (leave.employee.userId !== userId) return NextResponse.json({ error:'Forbidden'},{status:403});
    if (leave.status !== 'PENDING') return NextResponse.json({ error:'Cannot delete after approval'},{status:400});
  }

  await prisma.leaveRequest.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
