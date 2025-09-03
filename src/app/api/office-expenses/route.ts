import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';

type Auth = { userId: number | null; companyId: number | null };

function getAuth(req: NextRequest): Auth {
  const hdr = req.headers.get('authorization') || '';
  const token = hdr.startsWith('Bearer ') ? hdr.slice(7) : null;
  if (!token) return { userId: null, companyId: null };
  try {
    const dec: any = jwt.verify(token, JWT_SECRET);
    return {
      userId: Number(dec.sub ?? dec.id),
      companyId: dec.companyId ? Number(dec.companyId) : null,
    };
  } catch {
    return { userId: null, companyId: null };
  }
}

// GET /api/office-expenses?limit=50
export async function GET(req: NextRequest) {
  const { userId, companyId } = getAuth(req);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const limit = Number(req.nextUrl.searchParams.get('limit') || '50');
  const data = await prisma.officeExpense.findMany({
    where: { companyId },
    orderBy: { createdAt: 'desc' },
    take: limit,
    include: {
      bank: true,
      project: { select: { name: true } },
    },
  });
  return NextResponse.json(data);
}

// POST /api/office-expenses
// body: { bankId, amount, currency?, notes?, projectId? }
export async function POST(req: NextRequest) {
  const { userId, companyId } = getAuth(req);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { bankId, amount, currency, notes, projectId } = await req.json();
  if (!bankId || !amount)
    return NextResponse.json({ error: 'bankId and amount required' }, { status: 400 });

  const bank = await prisma.bankAccount.findUnique({ where: { id: bankId } });
  if (!bank) return NextResponse.json({ error: 'Bank not found' }, { status: 404 });

  const amt = Number(amount);
  if (amt <= 0) return NextResponse.json({ error: 'Amount must be positive' }, { status: 400 });

  const cur = currency || bank.currency;

  await prisma.$transaction([
    prisma.bankAccount.update({
      where: { id: bankId },
      data: { balance: { decrement: amt } },
    }),
    prisma.officeExpense.create({
      data: {
        companyId,
        bankId,
        projectId,
        amount: amt,
        currency: cur,
        notes,
      },
    }),
    prisma.bankTransaction.create({
      data: {
        bankId,
        amount: -amt,
        currency: cur,
        memo: notes ?? 'Office expense',
      },
    }),
    prisma.incomeCashLedger.create({
      data: {
        companyId,
        bankId,
        projectId,
        source: 'OFFICE_EXPENSE',
        amount: -amt,
        currency: cur,
        notes,
      },
    }),
  ]);

  return NextResponse.json({ status: 'ok' });
}
