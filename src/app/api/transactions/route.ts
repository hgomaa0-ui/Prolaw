import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import jwt from 'jsonwebtoken';
import { withCompany } from '@/lib/with-company';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';

type LineInput = { accountId: number; debit?: number; credit?: number; currency?: string };

function isAccountant(token: string | null): boolean {
  if (!token) return false;
  try {
    const payload = jwt.verify(token, JWT_SECRET) as any;
    return ['ADMIN','ACCOUNTANT_MASTER','ACCOUNTANT_ASSISTANT','OWNER'].includes(payload?.role as string);
  } catch {
    return false;
  }
}

export const GET = withCompany(async (_req: NextRequest, companyId?: number) => {
  if (!companyId) return NextResponse.json([]);

  const tx = await prisma.transaction.findMany({
    orderBy: { date: 'desc' },
    take: 100,
    include: {
      lines: true,
      creator: { select: { id: true, name: true } },
    },
    where: {
      // at least one line belongs to an account under this company
      lines: {
        some: {
          account: {
            companyId: companyId,
          },
        },
      },
    },
  });
  return NextResponse.json(tx);
});

export const POST = withCompany(async (req: NextRequest, companyId?: number) => {
  const auth = req.headers.get('authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!isAccountant(token)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!companyId) return NextResponse.json({ error: 'No company' }, { status: 400 });

  const { date, memo, lines } = await req.json() as { date?: string; memo?: string; lines: LineInput[] };
  if (!lines || !Array.isArray(lines) || lines.length < 2) {
    return NextResponse.json({ error: 'At least 2 lines required' }, { status: 400 });
  }

  // ensure all accounts belong to the same company
  const accountIds = lines.map((l) => l.accountId);
  const accounts = await prisma.account.findMany({ where: { id: { in: accountIds }, companyId } });
  if (accounts.length !== accountIds.length) {
    const validSet = new Set(accounts.map(a => a.id));
    const invalidIds = accountIds.filter(id => !validSet.has(id));
    return NextResponse.json({ error: 'Invalid accountId for company', invalid: invalidIds }, { status: 400 });
  }

  // balance check
  const totalDebit = lines.reduce((s, l) => s + (Number(l.debit) || 0), 0);
  const totalCredit = lines.reduce((s, l) => s + (Number(l.credit) || 0), 0);
  if (totalDebit !== totalCredit) {
    return NextResponse.json({ error: 'Debits and credits not equal' }, { status: 400 });
  }

  try {
    const payload: any = token ? jwt.verify(token, JWT_SECRET) : null;
    const tx = await prisma.transaction.create({
      data: {
        date: date ? new Date(date) : new Date(),
        memo,
        createdBy: payload?.sub ? Number(payload.sub) : undefined,
        lines: {
          create: lines.map((l) => ({
            accountId: l.accountId,
            debit: l.debit || 0,
            credit: l.credit || 0,
            currency: l.currency || 'USD',
          })),
        },
      },
      include: { lines: true },
    });
    return NextResponse.json(tx, { status: 201 });
  } catch (err: any) {
    console.error('POST /api/transactions', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
});
