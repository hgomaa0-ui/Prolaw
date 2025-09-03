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

// GET /api/income-ledger?bankId=&projectId=&start=&end=
export async function GET(request: NextRequest) {
  const { userId } = auth(request);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  const companyId = user.companyId;
  const { searchParams } = new URL(request.url);
  const bankId = searchParams.get('bankId');
  const projectId = searchParams.get('projectId');
  const start = searchParams.get('start');
  const end = searchParams.get('end');

  const where: any = { companyId };
  if (bankId) where.bankId = Number(bankId);
  if (projectId) where.projectId = Number(projectId);
  if (start || end) where.createdAt = {};
  if (start) where.createdAt.gte = new Date(start!);
  if (end) where.createdAt.lte = new Date(end!);

  const entries = await prisma.incomeCashLedger.findMany({
    where,
    include: {
      bank: { select: { id: true, name: true, currency: true } },
      project: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json(entries);
}
