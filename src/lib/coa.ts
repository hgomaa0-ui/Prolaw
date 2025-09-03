export type AccountSeed = { code: string; name: string; type: 'ASSET' | 'LIABILITY' | 'EQUITY' | 'INCOME' | 'EXPENSE'; };

export const STANDARD_COA: AccountSeed[] = [
  // Assets
  { code: '1000', name: 'Operating Cash', type: 'ASSET' },
  { code: '1010', name: 'Bank - Default', type: 'ASSET' },
  { code: '1020', name: 'Client Trust Cash', type: 'ASSET' },
  { code: '1100', name: 'Accounts Receivable', type: 'ASSET' },
  { code: '1110', name: 'Unbilled WIP', type: 'ASSET' },
  { code: '1200', name: 'Fixed Assets', type: 'ASSET' },

  // Liabilities
  { code: '2000', name: 'Client Trust Liability', type: 'LIABILITY' },
  { code: '2100', name: 'Accounts Payable', type: 'LIABILITY' },
  { code: '2200', name: 'Accrued Expenses', type: 'LIABILITY' },

  // Equity
  { code: '3000', name: "Owner's Capital", type: 'EQUITY' },
  { code: '3100', name: "Owner's Draws", type: 'EQUITY' },
  { code: '3200', name: 'Retained Earnings', type: 'EQUITY' },

  // Income
  { code: '4000', name: 'Legal Fees', type: 'INCOME' },
  { code: '4100', name: 'Reimbursed Expenses', type: 'INCOME' },
  { code: '4200', name: 'Other Income', type: 'INCOME' },

  // Expenses
  { code: '5000', name: 'Payroll & Benefits', type: 'EXPENSE' },
  { code: '5100', name: 'Office Expenses', type: 'EXPENSE' },
  { code: '5200', name: 'Marketing', type: 'EXPENSE' },
  { code: '5300', name: 'Professional Fees', type: 'EXPENSE' },
  { code: '5400', name: 'Client Costs Advanced', type: 'EXPENSE' },
];

import { prisma } from '@/lib/prisma';

const LEGACY_MAP: Record<string,string> = {
  'CASH-MAIN':'1010',
  'TRUST-ASSET':'1020',
  'TRUST-LIAB':'2000',
  'ASSET':'1000',
  'LIABILITY':'2000',
  'EQUITY':'3000',
  'INCOME':'4000',
  'EXPENSE':'5000',
};

export async function ensureStandardChart(companyId: number) {
  // 1. seed missing accounts
  for (const acc of STANDARD_COA) {
    const exists = await prisma.account.findFirst({ where: { code: acc.code, companyId } });
    if (!exists) {
      await prisma.account.create({ data: { ...acc, companyId } });
    }
  }

  // 2. migrate legacy codes
  for (const [legacy, modern] of Object.entries(LEGACY_MAP)) {
    const legacyAcc = await prisma.account.findFirst({ where: { code: legacy, companyId } });
    if (legacyAcc) {
      // if modern account already exists, move transaction lines then delete legacy account
      const modernAcc = await prisma.account.findFirst({ where: { code: modern, companyId } });
      if (modernAcc) {
        await prisma.transactionLine.updateMany({ where: { accountId: legacyAcc.id }, data: { accountId: modernAcc.id } });
        await prisma.account.delete({ where: { id: legacyAcc.id } });
      } else {
        // rename legacy to modern code
        await prisma.account.update({ where: { id: legacyAcc.id }, data: { code: modern } });
      }
    }
  }

  // 3. remove any remaining legacy accounts with no transaction lines
  const keepCodes = new Set(STANDARD_COA.map((a) => a.code));
  const leftovers = await prisma.account.findMany({ where: { companyId } });
  for (const acc of leftovers) {
    if (keepCodes.has(acc.code)) continue;
    const lines = await prisma.transactionLine.count({ where: { accountId: acc.id } });
    if (lines === 0) {
      await prisma.account.delete({ where: { id: acc.id } });
    }
  }
}
