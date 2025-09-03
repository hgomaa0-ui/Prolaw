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

function isHR(role: string) {
  return role === 'ADMIN' || role === 'OWNER' || role.startsWith('HR');
}

// PUT /api/payroll/batches/[id]/hr-approve
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = decode(req);
  if (!auth || !isHR(auth.role))
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const batchId = Number(params.id);
  const batch = await prisma.payrollBatch.findUnique({ where: { id: batchId } });
  if (!batch) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (batch.status !== 'DRAFT')
    return NextResponse.json({ error: 'Batch not in DRAFT' }, { status: 400 });

  // confirm same company
  const user = await prisma.user.findUnique({ where: { id: auth.id }, select: { companyId: true } });
  if (batch.companyId !== user?.companyId)
    return NextResponse.json({ error: 'Cross-company access' }, { status: 403 });

  const updated = await prisma.payrollBatch.update({
    where: { id: batchId },
    data: { status: 'HR_APPROVED', hrApprovedAt: new Date() },
  });
  return NextResponse.json(updated);
}
