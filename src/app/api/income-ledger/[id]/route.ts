import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';

function auth(request: NextRequest) {
  const hdr = request.headers.get('authorization') || '';
  const token = hdr.startsWith('Bearer ') ? hdr.slice(7) : null;
  if (!token) return { userId: null } as const;
  try {
    const dec: any = jwt.verify(token, JWT_SECRET);
    return { userId: Number(dec.sub ?? dec.id) } as const;
  } catch {
    return { userId: null } as const;
  }
}

// DELETE /api/income-ledger/[id]  (reverse ledger entry)
export async function DELETE(request: NextRequest, ctx: { params: { id: string } }) {
  const { userId } = auth(request);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const id = Number(ctx.params.id);
  if (isNaN(id)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });

  const entry = await prisma.incomeCashLedger.findUnique({ where: { id } });
  if (!entry) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // basic reversal of bank balance if bankId present
  if (entry.bankId) {
    await prisma.bankAccount.update({ where: { id: entry.bankId }, data: { balance: { decrement: entry.amount } } });
  }

  await prisma.incomeCashLedger.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
