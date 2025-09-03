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

// GET leave balance
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const role = getUserRole(req);
  if (!isHR(role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const emp = await prisma.employee.findUnique({ where: { id: Number(params.id) }, select: { leaveBalanceDays: true } });
  if (!emp) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ leaveBalanceDays: emp.leaveBalanceDays ?? 0 });
}

// PUT update leave balance
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const role = getUserRole(req);
  if (!isHR(role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const { leaveBalanceDays } = await req.json();
  if (leaveBalanceDays === undefined || isNaN(Number(leaveBalanceDays))) {
    return NextResponse.json({ error: 'Invalid value' }, { status: 400 });
  }
  const emp = await prisma.employee.update({ where: { id: Number(params.id) }, data: { leaveBalanceDays: Number(leaveBalanceDays) } });
  return NextResponse.json({ leaveBalanceDays: emp.leaveBalanceDays });
}
