import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import jwt from 'jsonwebtoken';

type Tx = Parameters<typeof prisma.$transaction>[0];
async function ensurePayrollExp(tx: Tx, companyId: number): Promise<number> {
  const acc = await tx.account.findFirst({ where: { companyId, code: 'PAYROLL_EXP' } });
  if (acc) return acc.id;
  const newAcc = await tx.account.create({ data: { companyId, code: 'PAYROLL_EXP', name: 'Payroll Expense', type: 'EXPENSE' } });
  return newAcc.id;
}

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

function isAccountant(role: string) {
  return role === 'ADMIN' || role === 'OWNER' || role.startsWith('ACCOUNTANT');
}

// PUT /api/payroll/batches/[id]/acc-approve
export async function PUT(req: NextRequest, context: { params: { id: string } }) {
  const batchId = Number(context.params.id);
  const { rate: rateParam } = Object.fromEntries(new URL(req.url).searchParams);
  let bodyRate: number | undefined;
  let bodyJson: any = undefined;
  // try read body once
  if (req.method === 'PUT') {
    try {
      bodyJson = await req.json();
      if (bodyJson && bodyJson.rate) bodyRate = Number(bodyJson.rate);
    } catch {
      bodyJson = {};
    }
  }
  let rate = Number(rateParam ?? bodyRate);
  if (!rate || isNaN(rate) || rate <= 0) {
    // fetch from stored settings
    const setting = await prisma.setting.findUnique({ where: { key: 'EX_RATE_EGP_USD' } });
    rate = setting ? Number(setting.value) : 1;
  }
  const auth = decode(req);
  if (!auth || !isAccountant(auth.role))
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const batch = await prisma.payrollBatch.findUnique({
    where: { id: batchId },
    include: { items: true },
  });
  if (!batch) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (batch.status !== 'HR_APPROVED')
    return NextResponse.json({ error: 'Batch not HR approved' }, { status: 400 });

  // company check
  const user = await prisma.user.findUnique({ where: { id: auth.id }, select: { companyId: true } });
  if (batch.companyId !== user?.companyId)
    return NextResponse.json({ error: 'Cross-company access' }, { status: 403 });

  // total net salary in payroll currency (assumed EGP)
  const totalNet = batch.items.reduce((acc, i) => acc + Number(i.netSalary), 0);
  const usdAmount = Number((totalNet / rate).toFixed(2));

  try {
    await prisma.$transaction(async (tx) => {
    await tx.payrollBatch.update({
      where: { id: batchId },
      data: { status: 'ACC_APPROVED', accApprovedAt: new Date() },
    });

    // update cash account balance
    const cash = await tx.account.findFirst({
      where: { companyId: batch.companyId, code: 'CASH-MAIN' },
    });
    let cashId: number;
    if (!cash) {
      const newCash = await tx.account.create({ data: { companyId: batch.companyId, code: 'CASH-MAIN', name: 'Main Cash', type: 'ASSET' } });
      cashId = newCash.id;
    } else {
      cashId = cash.id;
    }

    // record transaction line (simple)
    await tx.transaction.create({
      data: {
        memo: `Payroll ${batch.month}/${batch.year}`,
        createdBy: auth.id,
        lines: {
          create: [
            { accountId: cashId, credit: usdAmount, currency: 'USD' },
            { accountId: await ensurePayrollExp(tx, batch.companyId), debit: totalNet, currency: 'EGP' },
          ],
        },
      },
    });
    });
    return NextResponse.json({ ok: true });
  } catch(err:any){
    console.error('Acc approve error', err);
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}
