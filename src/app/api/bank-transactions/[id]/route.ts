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

// DELETE /api/bank-transactions/:id
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const { userId, role } = auth(request);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (role === 'STAFF') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const id = Number(params.id);
  if (Number.isNaN(id)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });

  const txn = await prisma.bankTransaction.findUnique({ where: { id } });
  if (!txn) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // reverse amount on bank balance
  await prisma.$transaction([
    prisma.bankTransaction.delete({ where: { id } }),
    prisma.bankAccount.update({ where: { id: txn.bankId }, data: { balance: { decrement: txn.amount } } }),
  ]);

  return NextResponse.json({ success: true });
}
