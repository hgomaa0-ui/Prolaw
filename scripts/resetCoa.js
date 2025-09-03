const { PrismaClient } = require('@prisma/client');

(async () => {
  const prisma = new PrismaClient();
  const companyId = 12; // TODO: adjust if needed
  try {
    await prisma.account.deleteMany({ where: { companyId } });
    await prisma.account.createMany({
      data: [
        { companyId, code: '1', name: 'Assets',      type: 'ASSET' },
        { companyId, code: '2', name: 'Liabilities', type: 'LIABILITY' },
        { companyId, code: '3', name: 'Equity',      type: 'EQUITY' },
        { companyId, code: '4', name: 'Revenue',     type: 'INCOME' },
        { companyId, code: '5', name: 'Expenses',    type: 'EXPENSE' }
      ]
    });
    console.log('✅ Chart of accounts reset for company', companyId);
  } catch (err) {
    console.error('Error resetting COA:', err);
  } finally {
    await prisma.$disconnect();
  }
})();
