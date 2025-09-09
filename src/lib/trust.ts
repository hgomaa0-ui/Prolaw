import { prisma } from '@/lib/prisma';
import { AccountType, CurrencyCode } from '@prisma/client';

/**
 * Returns the EXPENSE trust account for the given project. If it doesn't exist it will
 * be created with zero balance.
 *
 * @param projectId The project ID
 * @param clientId  The client ID (needed when creating)
 * @param currency  Currency code (defaults to USD)
 */
export async function getOrCreateExpenseAccount(projectId: number, clientId: number, currency: CurrencyCode = 'USD') {
  let acct = await prisma.trustAccount.findFirst({
    where: {
      projectId,
      accountType: AccountType.EXPENSE,
      currency,
    },
  });
  if (!acct) {
    acct = await prisma.trustAccount.create({
      data: {
        clientId,
        projectId,
        currency,
        accountType: AccountType.EXPENSE,
        balance: 0,
      },
    });
  }
  return acct;
}
