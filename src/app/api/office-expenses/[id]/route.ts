import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';
function getUserId(request: NextRequest): number | null {
  let token: string | null = null;
  const auth = request.headers.get('authorization') || '';
  if (auth.startsWith('Bearer ')) token = auth.slice(7);
  if (!token) {
    token = request.cookies.get('token')?.value || null;
  }
  if (!token) return null;
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    const uid = decoded?.sub ?? decoded?.id;
    return uid ? Number(uid) : null;
  } catch {
    return null;
  }
}

/**
 * PUT /api/office-expenses/[id]
 * Body: { amount?, currency?, memo? }
 */
// UPDATE office expense
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = Number(params.id);
    const body = await req.json();
    const { amount, currency, memo } = body;
    if (!amount && !currency && !memo) return NextResponse.json({ error: 'No changes' }, { status: 400 });

    const txn = await prisma.transaction.findUnique({
      where: { id },
      include: { lines: true },
    });
    if (!txn) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    // find debit (expense) and credit (cash) lines
    const debitLine = txn.lines.find((l) => Number(l.debit) > 0);
    const creditLine = txn.lines.find((l) => Number(l.credit) > 0);
    if (!debitLine || !creditLine)
      return NextResponse.json({ error: 'Invalid office expense txn' }, { status: 400 });

    const newAmount = amount !== undefined ? amount : Number(debitLine.debit);
    const newCurrency = currency || debitLine.currency;

    await prisma.$transaction([
      prisma.transaction.update({ where: { id }, data: { memo: memo ?? txn.memo } }),
      prisma.transactionLine.update({
        where: { id: debitLine.id },
        data: { debit: newAmount, currency: newCurrency },
      }),
      prisma.transactionLine.update({
        where: { id: creditLine.id },
        data: { credit: newAmount, currency: newCurrency },
      }),
    ]);

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('PUT /api/office-expenses/[id]', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

/**
 * DELETE /api/office-expenses/[id]
 * Deletes entire transaction
 */
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = Number(params.id);
    await prisma.transaction.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('DELETE /api/office-expenses/[id]', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
