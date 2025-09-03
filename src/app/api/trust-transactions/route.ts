import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import jwt from 'jsonwebtoken';
import { Prisma } from '@prisma/client';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';

type Role = 'OWNER' | 'ADMIN' | 'STAFF' | string;

function getRole(token?: string): Role | null {
  if (!token) return null;
  try {
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString('utf8'));
    return payload.role as Role;
  } catch {
    return null;
  }
}

function auth(request: NextRequest) {
  const auth = request.headers.get('authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) return { userId: null, role: null };
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    return { userId: Number(decoded.sub), role: getRole(token || undefined) };
  } catch {
    return { userId: null, role: null };
  }
}

// GET /api/trust-transactions?accountId=1
export async function GET(req: NextRequest) {
  const { role } = auth(req);
  if (!role) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const accountId = req.nextUrl.searchParams.get('accountId');
  const where = accountId ? { trustAccountId: Number(accountId) } : undefined;
  let txns = await prisma.trustTransaction.findMany({
    where,
    orderBy: { txnDate: 'desc' },
  });

  // attach receiptUrl when description references an Expense
  const expenseIds = Array.from(new Set(txns.map(t=>{
    const m = t.description?.match(/Expense #(\d+)/);
    return m ? Number(m[1]) : null; }).filter(Boolean) as number[]));
  let receiptMap: Record<number,string> = {};
  if(expenseIds.length){
    const exps = await prisma.expense.findMany({ where:{ id: { in: expenseIds } }, select:{ id:true, receiptUrl:true }});
    receiptMap = Object.fromEntries(exps.map(e=>[e.id, e.receiptUrl ?? '']));
  }
  txns = txns.map(t=>{
    const m = t.description?.match(/Expense #(\d+)/);
    const expId = m? Number(m[1]): undefined;
    return { ...t, receiptUrl: expId ? receiptMap[expId] : undefined } as any;
  });

  return NextResponse.json(txns);
}

// POST /api/trust-transactions  { trustAccountId, txnType, amount, description, invoiceId }
export async function POST(req: NextRequest) {
  const { role } = auth(req);
  if (!role || role === 'STAFF') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const body = await req.json();
  const { trustAccountId, txnType, amount, description = '', invoiceId } = body;
  if (!trustAccountId || !amount || !txnType) return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
  if (!Object.values(Prisma.TrustTxnType).includes(txnType)) return NextResponse.json({ error: 'Invalid txnType' }, { status: 400 });

  const account = await prisma.trustAccount.findUnique({ where: { id: trustAccountId } });
  if (!account) return NextResponse.json({ error: 'Account not found' }, { status: 404 });

  let newBalance = account.balance;
  if (txnType === 'CREDIT') newBalance = newBalance.plus(amount);
  else newBalance = newBalance.minus(amount);

  const txn = await prisma.$transaction(async (tx) => {
    const created = await tx.trustTransaction.create({
      data: {
        trustAccountId,
        txnType,
        amount,
        description,
        invoiceId,
      },
    });
    await tx.trustAccount.update({ where: { id: trustAccountId }, data: { balance: newBalance } });
    return created;
  });
  return NextResponse.json(txn, { status: 201 });
}
