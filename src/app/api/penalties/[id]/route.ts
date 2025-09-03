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
  return role === 'ADMIN' || role === 'HR_MANAGER';
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const user = getUser(req);
  if (!user || !isHR(user.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const { amount, currency, reason, date } = await req.json();
  const id = Number(params.id);
  const penalty = await prisma.penalty.update({
    where: { id },
    data: {
      amount: amount !== undefined ? amount : undefined,
      currency,
      reason,
      date: date ? new Date(date) : undefined,
    },
  });
  return NextResponse.json(penalty);
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const user = getUser(req);
  if (!user || !isHR(user.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const id = Number(params.id);
  await prisma.penalty.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
