import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withCompany } from '@/lib/with-company';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';

type Role = 'OWNER' | 'ADMIN' | 'ACCOUNTANT_MASTER' | 'ACCOUNTANT_ASSISTANT' | 'STAFF' | string;

function auth(request: NextRequest) {
  const auth = request.headers.get('authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) return { userId: null, role: null } as const;
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    return { userId: Number(decoded.sub ?? decoded.id), role: decoded.role as Role } as const;
  } catch {
    return { userId: null, role: null } as const;
  }
}

// GET /api/banks
export const GET = withCompany(async (request: NextRequest, companyId?: number) => {
  if (!companyId) return NextResponse.json([]);
  const rawBanks = await prisma.bankAccount.findMany({
    where: { companyId },
    orderBy: { name: 'asc' },
    include: {
      bankTransactions: { select: { amount: true } },
      advancePayments: { select: { amount: true } },
    },
  });
  const banks = rawBanks.map((b) => {
    const sumTxns = b.bankTransactions.reduce((acc, t) => acc + Number(t.amount), 0);
    const sumAdv = b.advancePayments.reduce((acc, a) => acc + Number(a.amount), 0);
    const derived = sumTxns + sumAdv;
    return {
      id: b.id,
      name: b.name,
      currency: b.currency,
      balance: Number(b.balance),
      derived,
    };
  });
  return NextResponse.json(banks);
});

// POST /api/banks { companyId, name, currency }
export async function POST(request: NextRequest) {
  const { userId, role } = auth(request);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (role === 'STAFF') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const { name, currency } = await request.json();
  const userRecord = await prisma.user.findUnique({ where: { id: userId }, select: { companyId: true } });
  const companyId = userRecord?.companyId;
  if (!name || !currency || !companyId) {
    return NextResponse.json({ error: 'name, currency required' }, { status: 400 });
  }
  const bank = await prisma.bankAccount.create({ data: { name, currency, companyId } });
  return NextResponse.json(bank, { status: 201 });
}
