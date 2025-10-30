import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import jwt from 'jsonwebtoken';
import { getAuthServer } from '@/lib/auth';
import { convert } from '@/lib/forex';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';

function getUserId(request: NextRequest): number | null {
  // try bearer/cookie via util first
  const raw = getAuthServer(request);
  if (raw) {
    try {
      const decoded = jwt.verify(raw, JWT_SECRET) as any;
      return Number((decoded as any).id ?? (decoded as any).sub);
    } catch {}
  }
  // Try Authorization header first
  let token: string | null = null;
  const auth = request.headers.get('authorization') || '';
  if (auth.startsWith('Bearer ')) token = auth.slice(7);
  // Fallback to cookie
  if (!token) {
    token = request.cookies.get('token')?.value || null;
  }
  if (!token) return null;
  try {
        const decoded = jwt.verify(token, JWT_SECRET) as jwt.JwtPayload | string;
    if (typeof decoded === 'string') {
      return Number(decoded);
    }
    const payload = decoded as any;
    return Number(payload.id ?? payload.sub);
  } catch {
    return null;
  }
}

// GET /api/advance-payments?projectId=
export async function GET(request: NextRequest) {
  try {
  const userId = getUserId(request);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get('projectId');

  const where: any = {};
  if (projectId) where.projectId = Number(projectId);

  // OWNER/ADMIN can view all; STAFF only projects they own
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if ((user?.role as string) === 'STAFF') {
    where.project = { ownerId: userId };
  }

    const payments = await prisma.advancePayment.findMany({
    where,
    include: { project: { select: { id: true, name: true, clientId: true } }, bank: { select: { id: true, name: true } } },
    orderBy: { paidOn: 'desc' },
  });
    return NextResponse.json(payments);
  } catch (err: any) {
    console.error('Advance payments fetch error', err);
    return NextResponse.json({ error: err?.message || 'Server error' }, { status: 500 });
  }
}

// POST /api/advance-payments  { projectId, amount, currency, notes }
export async function POST(request: NextRequest) {
  const userId = getUserId(request);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const raw = await request.json();
  const { projectId, amount, currency, notes, accountType = 'TRUST' } = raw;
  const bankId = raw.bankId ? Number(raw.bankId) : null;
  if (!projectId || !amount || !currency) {
    return NextResponse.json({ error: 'projectId, amount, currency required' }, { status: 400 });
  }

  // verify user owns the project or is OWNER
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 });

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if ((user?.role as string) === 'STAFF' && project.ownerId !== userId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const payment = await prisma.advancePayment.create({
    data: { projectId, amount, currency, notes, accountType, bankId },
  });

// -----------------------------------------------------------------
  // Update Bank balance if bankId provided
  // -----------------------------------------------------------------
  if (bankId) {
    await prisma.bankAccount.update({ where: { id: bankId }, data: { balance: { increment: amount } } });
  }

  // سجل في IncomeCashLedger فقط إذا كانت الدفعة TRUST
  if (accountType === 'TRUST') {
    await prisma.incomeCashLedger.create({
      data: {
        companyId: project.companyId,
        bankId,
        projectId,
        source: 'TRUST_DEPOSIT',
        amount,
        currency,
        notes: notes || 'Advance payment',
      },
    });
  }

  // -----------------------------------------------------------------
  // Update TrustAccount balance فقط لحسابات EXPENSE وليس TRUST
  // -----------------------------------------------------------------
  if (accountType === 'EXPENSE') {
    // سجل فى ExpenseCashLedger كإيداع للمصروفات
    await prisma.expenseCashLedger.create({
      data:{ companyId: project.companyId, clientId: project.clientId, projectId, amount, currency, notes: notes || 'Expense advance' }
    });
    const trustAcct = await prisma.trustAccount.findFirst({
      where: { projectId, currency, accountType: 'EXPENSE' },
    });
    if (trustAcct) {
      await prisma.$transaction([
        prisma.trustAccount.update({ where: { id: trustAcct.id }, data: { balance: { increment: amount } } }),
        prisma.trustTransaction.create({ data: { trustAccountId: trustAcct.id, projectId, txnType: 'CREDIT', amount, description: notes || 'Advance payment' } })
      ]);
    } else {
      const newAcct = await prisma.trustAccount.create({
        data: {
          clientId: project!.clientId,
          projectId,
          currency,
          balance: amount,
          accountType: 'EXPENSE',
          transactions: { create: { txnType: 'CREDIT', amount, description: notes || 'Advance payment' } }
        },
      });
    }
  }

  // -----------------------------------------------------------------
  // إذا كان المشروع بدون advanceCurrency حدد العملة الحالية وحوّل المصروفات المعلقة
  // -----------------------------------------------------------------
  if (!project.advanceCurrency) {
    await prisma.project.update({ where: { id: projectId }, data: { advanceCurrency: currency } });
    const pendingExpenses = await prisma.expense.findMany({ where: { projectId, approved: false } });
    for (const exp of pendingExpenses) {
      if (exp.currency === currency) continue;
      try {
        const newAmt = await convert(Number(exp.amount), exp.currency, currency);
        await prisma.expense.update({ where: { id: exp.id }, data: { amount: newAmt, currency } });
      } catch (e) {
        console.error('FX convert pending expense', exp.id, e);
      }
    }
  }

  // If TRUST advance, post to GL: Debit Trust Cash (1020), Credit Trust Liability (2000)
  if (payment.accountType === 'TRUST') {
    try {
      const companyId = project.companyId;
      const trustCash = await prisma.account.findFirst({ where: { code: '1020', companyId } });
      const trustLiab = await prisma.account.findFirst({ where: { code: '2000', companyId } });
      if (trustCash && trustLiab) {
        const { postTransaction } = require('@/lib/gl');
        await postTransaction({
          memo: `Trust advance payment project #${projectId}`,
          createdBy: userId,
          lines: [
            { accountId: trustCash.id, debit: Number(amount), currency },
            { accountId: trustLiab.id, credit: Number(amount), currency },
          ],
        });
      } else {
        console.error('Trust accounts missing for company', companyId);
      }
    } catch (e) {
      console.error('GL posting failed for trust advance', e);
    }
  }

  return NextResponse.json(payment, { status: 201 });
}
