import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';

function isAdmin(token: string | null): boolean {
  if (!token) return false;
  try {
    const payload = jwt.verify(token, JWT_SECRET) as any;
    return payload?.role === 'ADMIN' || payload?.role === 'ACCOUNTANT_MASTER';
  } catch {
    return false;
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = request.headers.get('authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!isAdmin(token)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const id = Number(params.id);
  try {
    // Ensure account exists
    const account = await prisma.account.findUnique({ where: { id } });
    if (!account) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    // Prevent deletion if the account has any transaction lines
    const txCount = await prisma.transactionLine.count({ where: { accountId: id } });
    if (txCount > 0) {
      return NextResponse.json({ error: 'Cannot delete account with transactions' }, { status: 400 });
    }

    await prisma.account.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Delete account error', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
