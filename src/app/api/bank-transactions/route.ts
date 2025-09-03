import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';

function auth(request: NextRequest) {
  const auth = request.headers.get('authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) return { userId: null, role: null } as const;
  try {
    const dec = jwt.verify(token, JWT_SECRET) as any;
    return { userId: Number(dec.sub ?? dec.id), role: dec.role as string } as const;
  } catch {
    return { userId: null, role: null } as const;
  }
}

// GET /api/bank-transactions?bankId=
export async function GET(request: NextRequest) {
  const { userId } = auth(request);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { searchParams } = new URL(request.url);
  const bankId = searchParams.get('bankId');
  if (!bankId) return NextResponse.json({ error: 'bankId required' }, { status: 400 });
  const txns = await prisma.bankTransaction.findMany({
    where: { bankId: Number(bankId) },
    orderBy: { createdAt: 'desc' },
  });
  return NextResponse.json(txns);
}

// POST /api/bank-transactions { bankId, amount, currency, memo }
export async function POST(request: NextRequest) {
  const { userId, role } = auth(request);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (role === 'STAFF') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const { bankId, amount, currency, memo } = await request.json();
  if (!bankId || !amount || !currency) {
    return NextResponse.json({ error: 'bankId, amount, currency required' }, { status: 400 });
  }
  const bank = await prisma.bankAccount.findUnique({ where: { id: bankId } });
  if (!bank) return NextResponse.json({ error: 'Bank not found' }, { status: 404 });
  if (bank.currency !== currency) {
    return NextResponse.json({ error: 'Currency mismatch' }, { status: 400 });
  }
  const txn = await prisma.bankTransaction.create({ data: { bankId, amount, currency, memo } });
  await prisma.bankAccount.update({ where: { id: bankId }, data: { balance: { increment: amount } } });
  return NextResponse.json(txn, { status: 201 });
}
