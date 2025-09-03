import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { convert } from '@/lib/forex';
import jwt from 'jsonwebtoken';
import { postTransaction } from '@/lib/gl';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';

/**
 * Quick expense / salary posting.
 * Body: { date?, memo?, amount, currency, expenseAccountId, payAccountId, cashCurrency? }
 * - Converts amount to cashCurrency (default USD) so that the journal entry is balanced.
 */
export async function POST(req: NextRequest) {
  const auth = req.headers.get('authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  let payload: any;
  try {
    payload = jwt.verify(token, JWT_SECRET);
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!['ADMIN', 'OWNER', 'ACCOUNTANT_MASTER', 'ACCOUNTANT_ASSISTANT'].includes(payload.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { date, memo, amount, currency, expenseAccountId, payAccountId, cashCurrency = 'USD' } = await req.json();
  if (!amount || !currency || !expenseAccountId || !payAccountId) {
    return NextResponse.json({ error: 'amount, currency, expenseAccountId, payAccountId required' }, { status: 400 });
  }

  // convert amount to cash currency if needed
  let convertedAmount = Number(amount);
  if (currency !== cashCurrency) {
    convertedAmount = await convert(Number(amount), currency, cashCurrency);
  }

  try {
    const tx = await postTransaction({
      memo: memo || 'Quick expense',
      date: date ? new Date(date) : new Date(),
      createdBy: Number(payload.sub ?? payload.id),
      lines: [
        { accountId: expenseAccountId, debit: convertedAmount, currency: cashCurrency },
        { accountId: payAccountId, credit: convertedAmount, currency: cashCurrency },
      ],
    });
    return NextResponse.json(tx, { status: 201 });
  } catch (err: any) {
    console.error('quick-expense error', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
