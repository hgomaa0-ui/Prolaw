import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { convert } from '@/lib/forex';
import { postTransaction } from '@/lib/gl';
import { getOrCreateExpenseAccount } from '@/lib/trust';




function getUser(req: NextRequest) {
  const auth = req.headers.get('authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) return null;
  try {
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
    return { id: Number(payload.sub ?? payload.id), role: payload.role };
  } catch {
    return null;
  }
}


// expects { bankId }
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = getUser(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!['ADMIN','OWNER','ACCOUNTANT_MASTER','ACCOUNTANT_ASSISTANT'].includes(user.role))
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const body = await req.json().catch(()=>({}));
    const bankId: number | undefined = body?.bankId ? Number(body.bankId) : undefined;

    const { id: paramId } = await params;
    const expId = Number(paramId);
    const expense = await prisma.expense.findUnique({
      where: { id: expId },
      include: { project: true },
    });
    if (!expense) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if (expense.approved)
      return NextResponse.json({ error: 'Already approved' }, { status: 400 });

    const projectId = expense.projectId;
    const currency = expense.currency ?? 'USD';
    let remaining = Number(expense.amount);
    let trustUsed = 0;

    // -----------------------------------------------------------------------------
// 1. consume EXPENSE advances first (cross-currency aware)
// -----------------------------------------------------------------------------
        let advances = await prisma.advancePayment.findMany({
      where: { projectId, accountType: { in: ['EXPENSE','TRUST'] } },
      orderBy: { paidOn: 'asc' },
    });
    // prioritize advances with same currency as expense
    advances = advances.sort((a,b)=> (a.currency===currency?0:1) - (b.currency===currency?0:1));

    for (const ap of advances) {
      if (remaining <= 0) break;
      const advAvailable = Number(ap.amount) - Number(ap.consumed);
      if (advAvailable <= 0) continue;

      // convert available to expense currency to know coverage
      const availableInExpense = await convert(advAvailable, ap.currency, currency);
      if (availableInExpense <= 0) continue;

      const useExpense = Math.min(availableInExpense, remaining);
      const useAdv = await convert(useExpense, currency, ap.currency);

      // increment consumed on advance payment
      await prisma.advancePayment.update({
        where: { id: ap.id },
        data: { consumed: { increment: useAdv } },
      });
      // also decrement corresponding EXPENSE trust account balance
      const expenseAcct = await prisma.trustAccount.findFirst({
        where: { projectId, currency: ap.currency, NOT: { accountType: 'TRUST' } },
      });
      if (expenseAcct) {
        await prisma.trustAccount.update({
          where: { id: expenseAcct.id },
          data: { balance: { decrement: useAdv } },
        });
        await prisma.trustTransaction.create({
          data: {
            trustAccountId: expenseAcct.id,
            projectId,
            txnType: 'DEBIT',
            amount: useAdv,
            description: `Expense #${expId} approval`,
          },
        });
      }
      remaining -= useExpense;
      trustUsed += useExpense;
    }

    // 2. debit trust account if still remaining
    if (remaining > 0) {
      const acct = await prisma.trustAccount.findFirst({
          where: { projectId, currency, NOT: { accountType: 'TRUST' } },
        });
      // if no account, create one with zero balance so it can go negative
      let accountId = acct?.id;
      if (!acct) {
        const newAcct = await prisma.trustAccount.create({
          data: {
            clientId: expense.project.clientId,
            projectId,
            currency,
            balance: 0,
            accountType: 'EXPENSE',
          },
        });
        accountId = newAcct.id;
      }
      // allow overdraft: balance may go negative after decrement
      await prisma.$transaction([
        prisma.trustTransaction.create({
          data: {
            trustAccountId: accountId!,
            projectId,
            txnType: 'DEBIT',
            amount: remaining,
            description: `Expense #${expId}`,
          },
        }),
        prisma.trustAccount.update({
          where: { id: accountId! },
          data: { balance: { decrement: remaining } },
        }),
      ]);
      remaining = 0; // companyPortion already handled above
    }

    if (remaining > 0) {
      return NextResponse.json({ error: 'Uncovered amount' }, { status: 400 });
    }

        // @ts-expect-error approved exists after migration
    // -------------------------------------------------------------------------
    // Deduct cash from selected bank (if provided)
    // -------------------------------------------------------------------------
    if (bankId) {
      try {
        const bank = await prisma.bankAccount.findUnique({ where: { id: bankId } });
        if (bank) {
          const amountInBankCurr = await convert(Number(expense.amount), expense.currency, bank.currency);
          await prisma.$transaction([
            prisma.bankAccount.update({ where: { id: bankId }, data: { balance: { decrement: amountInBankCurr } } }),
            prisma.bankTransaction.create({ data: { bankId, amount: -amountInBankCurr, currency: bank.currency, memo: `Expense #${expId} approval` } })
          ]);
        }
      } catch (err) { console.error('Bank deduction failed', err); }
    }

    // mark approved
    let updated = await prisma.expense.update({ where:{ id:expId }, data:{ approved:true } });

    // -------------------------------------------------------------------------
    // سجل قيد DEBIT فى حساب EXPENSE الخاص بالمشروع
    // -------------------------------------------------------------------------
    try {
      const expAcct = await getOrCreateExpenseAccount(projectId, expense.project.clientId, currency);
      await prisma.$transaction([
        prisma.trustAccount.update({ where:{ id: expAcct.id }, data:{ balance:{ decrement: Number(expense.amount) } } }),
        prisma.trustTransaction.create({ data:{ trustAccountId: expAcct.id, projectId, txnType:'DEBIT', amount: Number(expense.amount), description: `Expense #${expId}` } })
      ]);
    } catch(debitErr){ console.error('Trust debit for expense', debitErr); }


    // ---------------- Invoice linking + WIP GL ----------------
    try {
      let invoice = await prisma.invoice.findFirst({ where: { projectId: expense.projectId, status: 'DRAFT' } });
      if (!invoice) {
        const { generateInvoiceNumber } = await import('@/lib/invoice');
        invoice = await prisma.invoice.create({ data: { projectId: expense.projectId, clientId: expense.project.clientId, invoiceNumber: await generateInvoiceNumber(), issueDate: new Date(), dueDate: new Date(Date.now()+14*24*3600*1000), status: 'DRAFT', subtotal: 0, total: 0, currency } });
      }
      const existing = await prisma.invoiceItem.findFirst({ where: { invoiceId: invoice.id, refId: expense.id, itemType: 'EXPENSE' } });
      if (!existing) {
        await prisma.invoiceItem.create({ data: { invoiceId: invoice.id, itemType: 'EXPENSE', refId: expense.id, description: expense.description, quantity: 1, unitPrice: Number(expense.amount), lineTotal: Number(expense.amount) } });
        const sums = await prisma.invoiceItem.aggregate({ where: { invoiceId: invoice.id }, _sum: { lineTotal: true } });
        const subtotal = Number(sums._sum.lineTotal) || 0;
        await prisma.invoice.update({ where: { id: invoice.id }, data: { subtotal, total: subtotal } });
        updated = await prisma.expense.update({ where: { id: expense.id }, data: { invoiceId: invoice.id, invoiced: true } });
        const companyId = expense.project.companyId;
        const wipAcct = await prisma.account.findFirst({ where: { companyId, code: '1110' } });
        const incomeAcct = await prisma.account.findFirst({ where: { companyId, code: '4000' } });
        if (wipAcct && incomeAcct) {
          await postTransaction({ memo: `WIP expense #${expense.id}`, createdBy: user.id, lines: [ { accountId: wipAcct.id, debit: Number(expense.amount), currency }, { accountId: incomeAcct.id, credit: Number(expense.amount), currency } ] });
        }
      }
    } catch (err) { console.error('Expense invoice/WIP', err); }

    // -------------------------------------------------------------------------
    // Post to General Ledger for trust portion (debit liability, credit cash)
    // -------------------------------------------------------------------------
    if (trustUsed > 0) {
      try {
        const trustLiab = await prisma.account.findFirst({ where: { code: 'TRUST-LIAB' } });
        const cashAccount = await prisma.account.findFirst({ where: { code: 'CASH-MAIN' } });
        if (trustLiab && cashAccount) {
          const { postTransaction } = require('@/lib/gl');
          await postTransaction({
            memo: `Expense #${expId} trust withdrawal`,
            createdBy: user.id,
            lines: [
              { accountId: trustLiab.id, debit: trustUsed, currency },
              { accountId: cashAccount.id, credit: trustUsed, currency },
            ],
          });
        }
      } catch (err) {
        console.error('GL posting failed for trust portion', err);
      }
    }

    // -------------------------------------------------------------------------
    // Post to General Ledger IF company cash used (companyPortion > 0)
    //   Debit: Expense account
    //   Credit: Cash (Main)
    // -------------------------------------------------------------------------
    const companyPortion = 0; // since remaining is zero after deduction above
      try {
        const expenseAccount = await prisma.account.findFirst({
          where: { type: 'EXPENSE' },
          orderBy: { code: 'asc' },
        });
        const cashAccount = await prisma.account.findFirst({ where: { code: 'CASH-MAIN' } });
        if (expenseAccount && cashAccount) {
          const { postTransaction } = require('@/lib/gl');
          await postTransaction({
            memo: `Expense #${expId} approval`,
            createdBy: user.id,
            lines: [
              { accountId: expenseAccount.id, debit: companyPortion, currency: expense.currency },
              { accountId: cashAccount.id, credit: companyPortion, currency: expense.currency },
            ],
          });
        }
      } catch (glErr) {
        console.error('GL posting failed for expense', glErr);
      }


    return NextResponse.json(updated);
  } catch (e) {
    console.error('PUT /api/expenses/[id]/approve', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
