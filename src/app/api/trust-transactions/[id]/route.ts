import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import jwt from 'jsonwebtoken';
import { Prisma } from '@prisma/client';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';

type Role = 'OWNER' | 'ADMIN' | 'ACCOUNTANT_MASTER' | 'ACCOUNTANT_ASSISTANT' | 'STAFF' | string;

function auth(request: NextRequest) {
  const auth = request.headers.get('authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) return { userId: null, role: null } as const;
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    return { userId: Number(decoded.sub), role: decoded.role as Role } as const;
  } catch {
    return { userId: null, role: null } as const;
  }
}

// DELETE /api/trust-transactions/[id]
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const { role } = auth(request);
  if (!role || role === 'STAFF') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const id = Number(params.id);
  const txn = await prisma.trustTransaction.findUnique({ where: { id } });
  if (!txn) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const account = await prisma.trustAccount.findUnique({ where: { id: txn.trustAccountId } });
  if (!account) return NextResponse.json({ error: 'Account not found' }, { status: 404 });

  let newBalance = account.balance;
  if (txn.txnType === 'CREDIT') {
    newBalance = newBalance.minus(txn.amount);
  } else {
    newBalance = newBalance.plus(txn.amount);
  }

  await prisma.$transaction(async (tx) => {
    await tx.trustTransaction.delete({ where: { id } });
    await tx.trustAccount.update({ where: { id: account.id }, data: { balance: newBalance } });
  });

  return NextResponse.json({ ok: true });
}
