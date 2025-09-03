import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import jwt from 'jsonwebtoken';
import { convert } from '@/lib/forex';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';

type Auth = { userId: number | null; companyId: number | null };

function getAuth(req: NextRequest): Auth {
  const hdr = req.headers.get('authorization') || '';
  const token = hdr.startsWith('Bearer ') ? hdr.slice(7) : null;
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

// POST /api/bank-transfers { fromBankId, toBankId, amount, notes? }
export async function POST(req: NextRequest) {
  const { userId, companyId } = getAuth(req);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { fromBankId, toBankId, amount, notes } = await req.json();
  if (!fromBankId || !toBankId || !amount)
    return NextResponse.json({ error: 'fromBankId, toBankId, amount required' }, { status: 400 });
  if (fromBankId === toBankId)
    return NextResponse.json({ error: 'from and to bank cannot be same' }, { status: 400 });

  const [fromBank, toBank] = await prisma.$transaction([
    prisma.bankAccount.findUnique({ where: { id: fromBankId } }),
    prisma.bankAccount.findUnique({ where: { id: toBankId } }),
  ]);
  if (!fromBank || !toBank) return NextResponse.json({ error: 'Bank not found' }, { status: 404 });
  if (fromBank.companyId !== companyId || toBank.companyId !== companyId)
    return NextResponse.json({ error: 'Bank not in your company' }, { status: 403 });

  const amt = Number(amount);
  if (amt <= 0) return NextResponse.json({ error: 'Amount must be positive' }, { status: 400 });
  if (Number(fromBank.balance) < amt)
    return NextResponse.json({ error: 'Insufficient funds in source bank' }, { status: 400 });

  // convert if currency differs
  const convertedAmt = await convert(amt, fromBank.currency, toBank.currency);

  await prisma.$transaction([
    prisma.bankAccount.update({ where: { id: fromBankId }, data: { balance: { decrement: amt } } }),
    prisma.bankAccount.update({ where: { id: toBankId }, data: { balance: { increment: convertedAmt } } }),
    prisma.bankTransaction.create({
      data: {
        bankId: fromBankId,
        amount: -amt,
        currency: fromBank.currency,
        memo: notes ? `Transfer to ${toBank.name}: ${notes}` : `Transfer to ${toBank.name}`,
      },
    }),
    prisma.bankTransaction.create({
      data: {
        bankId: toBankId,
        amount: convertedAmt,
        currency: toBank.currency,
        memo: notes ? `Transfer from ${fromBank.name}: ${notes}` : `Transfer from ${fromBank.name}`,
      },
    }),
  ]);

  return NextResponse.json({ status: 'ok', convertedAmount: convertedAmt });
}
