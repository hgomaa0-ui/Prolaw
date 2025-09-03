import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import jwt from 'jsonwebtoken';
import { withCompany } from '@/lib/with-company';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';

function isAccountant(token: string | null): boolean {
  if (!token) return false;
  try {
    const payload = jwt.verify(token, JWT_SECRET) as any;
    return ['ADMIN', 'ACCOUNTANT_MASTER', 'ACCOUNTANT_ASSISTANT', 'OWNER'].includes(
      payload?.role as string,
    );
  } catch {
    return false;
  }
}

// DELETE /api/transactions/[id]
// Removes the transaction and all its lines (ON DELETE CASCADE in Prisma).
export const DELETE = withCompany(async (req: NextRequest, companyId?: number) => {
  // extract id from the request URL (last segment)
  const idStr = req.nextUrl.pathname.split('/').pop() || '';
  const txId = Number(idStr);
  const auth = req.headers.get('authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!isAccountant(token)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!companyId) {
    return NextResponse.json({ error: 'No company' }, { status: 400 });
  }

  if (isNaN(txId)) {
    return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
  }

  // Ensure at least one line account belongs to this company
  const tx = await prisma.transaction.findUnique({
    where: { id: txId },
    include: {
      lines: { include: { account: { select: { companyId: true } } } },
    },
  });
  const belongs = tx?.lines.some((l)=> l.account.companyId === companyId);
  if (!belongs) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  try {
    await prisma.transaction.delete({ where: { id: txId } });
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('DELETE /api/transactions/[id]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
});
