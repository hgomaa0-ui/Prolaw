import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withCompany } from '@/lib/with-company';
import { ensureStandardChart } from '@/lib/coa';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';

function isAdmin(token: string | null): boolean {
  if (!token) return false;
  try {
    const payload = jwt.verify(token, JWT_SECRET) as any;
    return ['ADMIN','ACCOUNTANT_MASTER','OWNER'].includes(payload?.role as string);
  } catch {
    return false;
  }
}

export const GET = withCompany(async (request: NextRequest, companyId?: number) => {
  // if the request lacks a company context, return an empty list instead of leaking
  // accounts that belong to other tenants.
  if (!companyId) {
    return NextResponse.json([]);
  }

  // Seed standard chart of accounts (law-firm specific)
  await ensureStandardChart(companyId);


  // ---------------------------------------------------------------------------
  // Return accounts (optionally with balances)
  // ---------------------------------------------------------------------------
  const withBalances = request.nextUrl.searchParams.get('withBalances') === '1';
  if (!withBalances) {
    const accounts = await prisma.account.findMany({ where: { companyId }, orderBy: { code: 'asc' } });
    return NextResponse.json(accounts);
  }
  // fetch balances per account & currency
  const balancesRaw = await prisma.transactionLine.groupBy({
    // @ts-ignore
    where: { account: { companyId } },

    by: ['accountId', 'currency'],
    _sum: { debit: true, credit: true },
  });
  const balanceMap: Record<string, { currency: string; balance: number }[]> = {};
  balancesRaw.forEach((b) => {
    const net = Number(b._sum.debit ?? 0) - Number(b._sum.credit ?? 0);
    const list = balanceMap[b.accountId] ?? (balanceMap[b.accountId] = []);
    list.push({ currency: b.currency, balance: net });
  });
  const accounts = await prisma.account.findMany({ where: { companyId }, orderBy: { code: 'asc' } });
  const result = accounts.map((a) => ({ ...a, balances: balanceMap[a.id] ?? [] }));
  return NextResponse.json(result);
});

export const POST = withCompany(async (req: NextRequest, companyId?: number) => {
  const auth = req.headers.get('authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!isAdmin(token)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { code, name, type } = await req.json();
  if (!code || !name || !type) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
  }
  try {
    // @ts-ignore
    const account = await prisma.account.create({ data: { code, name, type, companyId } });
    return NextResponse.json(account, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
});
