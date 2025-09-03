import { prisma } from '@/lib/prisma';

export type TxLineInput = {
  accountId: number;
  debit?: number;
  credit?: number;
  currency?: string;
};

/**
 * Helper to insert a balanced journal entry to the General Ledger.
 * Caller is responsible for passing balanced lines (total debit = credit).
 */
export async function postTransaction({
  memo,
  date = new Date(),
  createdBy,
  lines,
}: {
  memo?: string;
  date?: Date;
  createdBy?: number;
  lines: TxLineInput[];
}) {
  // quick balance check
  const debit = lines.reduce((s, l) => s + (Number(l.debit) || 0), 0);
  const credit = lines.reduce((s, l) => s + (Number(l.credit) || 0), 0);
  if (debit !== credit) {
    throw new Error('Transaction not balanced');
  }

  // derive companyId from first account line
  const firstAccount = await prisma.account.findUnique({ where: { id: lines[0].accountId }, select: { companyId: true } });
  const companyId = firstAccount?.companyId;

  return prisma.transaction.create({
    data: {
      memo,
      date,
      lines: {
        create: lines.map((l) => ({
          accountId: l.accountId,
          debit: l.debit || 0,
          credit: l.credit || 0,
          currency: l.currency || 'USD',
        })),
      },
    },
  });
}
