import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';

function decode(req: NextRequest) {
  const auth = req.headers.get('authorization') || '';
  const tok = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!tok) return null;
  try {
    return jwt.verify(tok, JWT_SECRET) as { id: number; role: string };
  } catch {
    return null;
  }
}

function isAccountant(role: string) {
  return role === 'ADMIN' || role === 'OWNER' || role.startsWith('ACCOUNTANT');
}

// DELETE /api/payroll/batches/[id]/acc-reverse
// Reverses accountant approval: deletes created transaction and resets status back to HR_APPROVED
export async function DELETE(req: NextRequest, context: { params: { id: string } }) {
  const { params } = context;
  const auth = decode(req);
  if (!auth || !isAccountant(auth.role))
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const batchId = Number(params.id);
  const batch = await prisma.payrollBatch.findUnique({ where: { id: batchId } });
  if (!batch) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (batch.status !== 'ACC_APPROVED')
    return NextResponse.json({ error: 'Batch not accountant approved' }, { status: 400 });

  // try to find transaction by memo and date (safer if you later store txnId in batch)
  const memo = `Payroll ${batch.month}/${batch.year}`;

  try {
    await prisma.$transaction(async (tx) => {
      const txn = await tx.transaction.findFirst({ where: { memo } });
      if (txn) {
        await tx.transactionLine.deleteMany({ where: { transactionId: txn.id } });
        await tx.transaction.delete({ where: { id: txn.id } });
      }
      await tx.payrollBatch.update({ where: { id: batchId }, data: { status: 'HR_APPROVED', accApprovedAt: null } });
    });
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error('Acc reverse error', err);
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}
