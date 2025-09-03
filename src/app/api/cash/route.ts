import { NextRequest, NextResponse } from 'next/server';
import { withCompany } from '@/lib/with-company';
import { prisma } from '@/lib/prisma';

interface LineItem {
  id: number;
  createdAt: Date;
  memo: string | null;
  debit: number;
  credit: number;
  currency: string;
  projectName?: string | null;
  clientName?: string | null;
  balance: number; // running balance after this line (same currency)
}

export const GET = withCompany(async (_req: NextRequest, companyId?: number) => {
  try {
  if (!companyId) return NextResponse.json([], { status: 200 });

  // ensure cash account exists
  let cash = await prisma.account.findFirst({ where:{ companyId, code:'CASH-MAIN' }});
  if(!cash){
    cash = await prisma.account.create({ data:{ code:'CASH-MAIN', name:'Main Cash', type:'ASSET', companyId } });
  }

  const lines = await prisma.transactionLine.findMany({
    where: { accountId: cash.id },
    include: { transaction: true },
    orderBy: { id: 'asc' },
  });

  // compute running balance per currency
  const balMap: Record<string, number> = {};
  let result: LineItem[] = lines.map((l) => {
    const curr = l.currency;
    const prev = balMap[curr] ?? 0;
    const net = prev + Number(l.debit ?? 0) - Number(l.credit ?? 0);
    balMap[curr] = net;
    return {
      id: l.id,
      createdAt: l.transaction?.date ?? new Date(),
      memo: l.memo,
      debit: Number(l.debit ?? 0),
      credit: Number(l.credit ?? 0),
      currency: l.currency,
      projectName: null,
      clientName: null,
      balance: net,
    };
  });

  // include EXPENSES (approved) as cash out
  const expenses = await prisma.expense.findMany({
    where: {
      approved: true,
      project: { companyId },
    },
    include: { project: { include: { client: true } } },
  });
  console.log('expenses found', expenses.length);
  for (const e of expenses) {
    const amt = (e.amount as any)?.toNumber ? (e.amount as any).toNumber() : Number(e.amount);
    if (!amt) continue;
    const curr = e.currency || 'USD';
    const prev = balMap[curr] ?? 0;
    const net = prev - amt; // expense is cash out
    balMap[curr] = net;
    result.push({
      id: 2000000 + e.id,
      type: 'EXPENSE', // synthetic id range for expenses
      createdAt: e.incurredOn,
      memo: e.description || 'Expense',
      debit: 0,
      credit: amt,
      currency: curr,
      projectName: e.project?.name ?? null,
      clientName: e.project?.client?.name ?? null,
      balance: net,
    });
  }

  // include ADVANCE PAYMENTS (cash in)
  const advPays = await prisma.advancePayment.findMany({
    where: { project: { companyId } },
    include: { project: { include: { client: true } } },
  });
  console.log('advPayments found', advPays.length);
  for (const ap of advPays) {
    const amt = (ap.amount as any)?.toNumber ? (ap.amount as any).toNumber() : Number(ap.amount);
    if (!amt) continue;
    const curr = ap.currency || 'USD';
    const prev = balMap[curr] ?? 0;
    const net = prev + amt; // advance payment is cash in
    balMap[curr] = net;
    result.push({
      id: 1000000 + ap.id,
      type: ap.accountType === 'TRUST' ? 'TRUST' : 'EXPENSE',
      createdAt: ap.paidOn ?? new Date(),
      memo: ap.notes || 'Advance payment',
      debit: amt,
      credit: 0,
      currency: curr,
      projectName: ap.project?.name ?? null,
      clientName: ap.project?.client?.name ?? null,
      balance: net,
    });
  }

  // include project advances (prepayed amounts)
  const advances = await prisma.project.findMany({ where: { companyId, advanceAmount: { not: null } }, include: { client: true } });
  console.log('advances found', advances.length);
  for (const p of advances) {
    const amt = (p.advanceAmount as any)?.toNumber ? (p.advanceAmount as any).toNumber() : Number(p.advanceAmount);
    if (!amt) continue;
    const curr = p.advanceCurrency || 'USD';
    const prev = balMap[curr] ?? 0;
    const net = prev + amt; // advance treated as cash in
    balMap[curr] = net;
    result.push({
      id: 1000000 + p.id, // synthetic id
      createdAt: p.createdAt,
      memo: 'Project advance',
      debit: amt,
      credit: 0,
      currency: curr,
      projectName: p.name,
      clientName: p.client?.name ?? null,
      balance: net,
    });
  }

  // sort again by date
  result = result.sort((a,b)=> new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  console.log('cash result', result.length, result.slice(0,5));
  return NextResponse.json(result);
  } catch(err:any){
    console.error('Cash GET error',err);
    return NextResponse.json({error:err?.message??'error'}, {status:500});
  }
});

export const POST = withCompany(async (req: NextRequest, companyId?: number) => {
  const { date, amount, currency, direction, memo } = await req.json();
  if (!companyId) return NextResponse.json({ error: 'companyId' }, { status: 400 });
  if (!amount || !currency || !['IN', 'OUT'].includes(direction)) {
    return NextResponse.json({ error: 'Invalid fields' }, { status: 400 });
  }
  let cash = await prisma.account.findFirst({ where:{ companyId, code:'CASH-MAIN' }});
  if(!cash){
    cash = await prisma.account.create({ data:{ code:'CASH-MAIN', name:'Main Cash', type:'ASSET', companyId } });
  }
  let suspense = await prisma.account.findFirst({ where:{ companyId, code:'SUSPENSE' }});
  if(!suspense){
    suspense = await prisma.account.create({ data:{ code:'SUSPENSE', name:'Suspense', type:'EQUITY', companyId } });
  }
  const debitLine = {
    accountId: direction === 'IN' ? cash.id : suspense.id,
    debit: direction === 'IN' ? amount : 0,
    credit: direction === 'IN' ? 0 : amount,
    currency,
    memo,
  };
  const creditLine = {
    accountId: direction === 'IN' ? suspense.id : cash.id,
    debit: direction === 'IN' ? 0 : amount,
    credit: direction === 'IN' ? amount : 0,
    currency,
    memo,
  };
  await prisma.transaction.create({
    data: {
      date: date ? new Date(date) : new Date(),
      memo,
      // @ts-ignore
      companyId,
      lines: { create: [debitLine, creditLine] },
    },
  });
  return NextResponse.json({ ok: true });
});
