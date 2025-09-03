import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';

type Auth = { userId: number | null; companyId: number | null };

function getAuth(req: NextRequest): Auth {
  const auth = req.headers.get('authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
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
  const expenses = await prisma.officeExpense.findMany({
    where: { companyId },
    orderBy: { createdAt: 'desc' },
    take: limit,
    include: {
      bank: true,
      project: { select: { name: true } },
    },
  });
  return NextResponse.json(expenses);
}

// POST /api/office-expenses { bankId, amount, currency?, notes?, projectId? }
export async function POST(req: NextRequest) {
  const { userId, companyId } = getAuth(req);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { bankId, amount, currency, notes, projectId } = await req.json();
  if (!bankId || !amount)
    return NextResponse.json({ error: 'bankId and amount required' }, { status: 400 });

  const bank = await prisma.bankAccount.findUnique({ where: { id: bankId } });
  if (!bank) return NextResponse.json({ error: 'Bank not found' }, { status: 404 });

  const amtNum = Number(amount);
  if (amtNum <= 0)
    return NextResponse.json({ error: 'Amount must be positive' }, { status: 400 });

  const cur = currency || bank.currency;

  await prisma.$transaction([
    prisma.bankAccount.update({
      where: { id: bankId },
      data: { balance: { decrement: amtNum } },
    }),
    prisma.officeExpense.create({
      data: {
        companyId,
        bankId,
        projectId,
        amount: amtNum,
        currency: cur,
        notes,
      },
    }),
    prisma.incomeCashLedger.create({
      data: {
        companyId,
        bankId,
        projectId,
        source: 'OFFICE_EXPENSE',
        amount: -amtNum,
        currency: cur,
        notes,
      },
    }),
  ]);

  return NextResponse.json({ status: 'ok' });
    return { userId: null, companyId: null } as const;
  }
}

/**
 * GET /api/office-expenses?limit=50
 * List office expenses ordered by newest first.
 */
export async function GET(req: NextRequest) {
  const { userId, companyId } = getAuth(req);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const limit = Number(req.nextUrl.searchParams.get('limit') || '50');
  const expenses = await prisma.officeExpense.findMany({
    where: { companyId },
    orderBy: { createdAt: 'desc' },
    take: limit,
    include: { bank: true, project: { select: { name: true } } }
  });
  return NextResponse.json(expenses);
}

/**
 * POST /api/office-expenses { bankId, amount, currency?, notes?, projectId? }
 * Deducts amount from bank balance, logs OfficeExpense and IncomeCashLedger
 */
export async function POST(req: NextRequest) {
  const { userId, companyId } = getAuth(req);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { bankId, amount, currency, notes, projectId } = await req.json();
  if (!bankId || !amount) return NextResponse.json({ error: 'bankId and amount required' }, { status: 400 });

  const bank = await prisma.bankAccount.findUnique({ where: { id: bankId } });
  if (!bank) return NextResponse.json({ error: 'Bank not found' }, { status: 404 });

  const amtNum = Number(amount);
  if (amtNum <= 0) return NextResponse.json({ error: 'Amount must be positive' }, { status: 400 });

  await prisma.$transaction([
    prisma.bankAccount.update({ where: { id: bankId }, data: { balance: { decrement: amtNum } } }),
    prisma.officeExpense.create({ data: { companyId, bankId, projectId, amount: amtNum, currency: currency || bank.currency, notes } }),
    prisma.incomeCashLedger.create({ data: { companyId, bankId, projectId, source: 'OFFICE_EXPENSE', amount: -amtNum, currency: currency || bank.currency, notes } })
  ]);

  return NextResponse.json({ status: 'ok' });
}
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) return { userId: null, companyId: null } as const;
  try {
    const dec: any = jwt.verify(token, JWT_SECRET);
    return { userId: Number(dec.sub ?? dec.id), companyId: dec.companyId ? Number(dec.companyId) : null } as const;
  } catch {
    return { userId: null, companyId: null } as const;
  }
}

/**
 * GET /api/office-expenses?limit=50
 * List office expenses ordered by newest first.
 */
export async function GET(req: NextRequest) {
  const { userId, companyId } = getAuth(req);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const limit = Number(req.nextUrl.searchParams.get('limit') || '50');
  const data = await prisma.officeExpense.findMany({ where: { companyId }, orderBy: { createdAt: 'desc' }, take: limit, include: { bank: true } });
  return NextResponse.json(data);
}

/**
 * POST /api/office-expenses { bankId, amount, currency?, notes }
 * Deducts amount from bank balance, logs OfficeExpense and IncomeCashLedger
 */
export async function POST(req: NextRequest) {
  const { userId, companyId } = getAuth(req);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { bankId, amount, currency, notes } = await req.json();
  if (!bankId || !amount) return NextResponse.json({ error: 'bankId and amount required' }, { status: 400 });

  const bank = await prisma.bankAccount.findUnique({ where: { id: bankId } });
  if (!bank) return NextResponse.json({ error: 'Bank not found' }, { status: 404 });

  const amtNum = Number(amount);
  if (amtNum <= 0) return NextResponse.json({ error: 'Amount must be > 0' }, { status: 400 });

  // TODO: handle currency conversion if needed
  const finalAmount = amtNum;
  const ledgerAmount = -amtNum;

  await prisma.$transaction([
    prisma.bankAccount.update({ where: { id: bankId }, data: { balance: { decrement: finalAmount } } }),
    prisma.officeExpense.create({ data: { companyId, bankId, amount: finalAmount, currency: (currency || bank.currency), notes } }),
    prisma.incomeCashLedger.create({ data: { companyId, bankId, source: 'OFFICE_EXPENSE', amount: ledgerAmount, currency: (currency || bank.currency), notes } })
  ]);

  return NextResponse.json({ status: 'ok' });
}
  try {
    const userId = getUserId(req);
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { companyId, date, memo, amount, currency, expenseAccountId, cashAccountId } = await req.next().json();

    const officeExpense = await prisma.officeExpense.create({
      data: {
        companyId,
        date,
        memo,
        amount,
        currency,
        expenseAccount: { connect: { id: expenseAccountId } },
        cashAccount: { connect: { id: cashAccountId } },
      orderBy: { date: 'desc' },
      take: limit * 2, // grab more then filter
      include: {
        lines: { include: { account: true } },
      return {
        id: t.id,
        date: t.date,
        memo: t.memo,
        amount: debitLine ? Number(debitLine.debit) : 0,
        currency: debitLine?.currency,
        expenseAccount: debitLine?.account,
        cashAccount: creditLine?.account,
      };
    });
    return NextResponse.json(result);
  } catch (e) {
    console.error('GET /api/office-expenses', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
