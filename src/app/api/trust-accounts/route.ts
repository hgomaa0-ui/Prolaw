import { NextRequest, NextResponse } from 'next/server';
import { withCompany } from '@/lib/with-company';
import { prisma } from '@/lib/prisma';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';

type Role = 'OWNER' | 'ADMIN' | 'STAFF' | string;

function getRole(token?: string): Role | null {
  if (!token) return null;
  try {
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString('utf8'));
    return payload.role as Role;
  } catch {
    return null;
  }
}

function auth(request: NextRequest) {
  const auth = request.headers.get('authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) return { userId: null, role: null };
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    return { userId: Number(decoded.sub), role: getRole(token || undefined) };
  } catch {
    return { userId: null, role: null };
  }
}

// GET /api/trust-accounts?clientId=123
// Returns list of trust accounts with computed balances.
// Safely skips projects that do not define advanceCurrency to avoid null currency errors.
export const GET = withCompany(async (req: NextRequest, companyId?: number) => {
  try {
    const { role } = auth(req);
    if (!role) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const clientId = req.nextUrl.searchParams.get('clientId');
    const typeParam = req.nextUrl.searchParams.get('type');
    const projectIdParam = req.nextUrl.searchParams.get('projectId');
    const currencyParam = req.nextUrl.searchParams.get('currency');

    const where: any = {
      OR: [
        { client: { companyId } },
        { project: { companyId } }
      ],
    } as any;
    if (clientId) where.clientId = Number(clientId);
    if (typeParam) {
      where.accountType = typeParam.toUpperCase();
    } else {
      // By default exclude TRUST accounts (only show EXPENSE etc.)
      where.accountType = { not: 'TRUST' } as any;
    }
    if (projectIdParam) where.projectId = Number(projectIdParam);
    if (currencyParam) where.currency = currencyParam.toUpperCase();

    /* --- auto-seed from advance payments disabled per requirement to keep TRUST advances out of Project Trust Cash --- */
    const raw = await prisma.trustAccount.findMany({
      where,
      include: {
        client: { select: { id: true, name: true } },
        project: { select: { id: true, name: true } },
        transactions: true,
      },
    });

    /* Step 2 disabled: auto-seed from advance payments removed
// Step 2: seed from advance payments if needed
    // const advMissing = await prisma.advancePayment.findMany({
      where: {
        accountType: 'TRUST',
        project: { companyId },
      },
      select: {
        projectId: true,
        amount: true,
        currency: true,
        notes: true,
        project: { select: { clientId: true } },
      },
    });
    // for (const adv of advMissing) {
      const exists = raw.find((a)=> a.projectId===adv.projectId && a.currency===adv.currency);
      if (!exists) {
        const acct = await prisma.trustAccount.create({
          data: {
            clientId: adv.project.clientId,
            projectId: adv.projectId,
            currency: adv.currency,
            balance: adv.amount,
            accountType: 'TRUST',
            transactions: { create: { txnType: 'CREDIT', amount: adv.amount, description: adv.notes || 'Initial advance payment' } },
          },
        });
        // raw.push({...acct, client:null, project:null, transactions:[]});
      }
    }

*/
    // Step 3: build response
    const accounts = raw.map((a) => ({
      id: a.id,
      client: a.client,
      project: a.project,
      accountType: a.accountType,
      currency: a.currency,
      balance: (() => {
        const sum = a.transactions.reduce((acc, t) => {
          const val = typeof t.amount === 'number' ? t.amount : parseFloat(t.amount.toString());
          return t.txnType === 'DEBIT' ? acc - val : acc + val;
        }, 0);

        return sum === 0 ? Number(a.balance) : sum;
      })(),
    }));
    return NextResponse.json(accounts);


/* legacy auto-seed logic disabled
    const advances = await prisma.project.findMany({
      where: { companyId, advanceAmount: { gt: 0 }, advanceCurrency: { not: null } },
      select: {
        clientId: true,
        advanceAmount: true,
        advanceCurrency: true,
        id: true,
        name: true,
      },
    });

    const advancesByClient = advances.reduce((acc, p) => {
      const clientId = p.clientId;
      if (!acc[clientId]) acc[clientId] = {};
      if (!acc[clientId][p.advanceCurrency]) acc[clientId][p.advanceCurrency] = 0;
      acc[clientId][p.advanceCurrency] += Number(p.advanceAmount);
      return acc;
    }, {});

    const grouped = advances.reduce((acc, p) => {
      const key = `${p.clientId}-${p.id}-${p.advanceCurrency}`;
      if (!acc[key]) acc[key] = { total: 0, currency: p.advanceCurrency, clientId: p.clientId, projectId: p.id, projectName: p.name };
      acc[key].total += Number(p.advanceAmount);
      return acc;
    }, {});

    // {
      if (!grouped[key].currency) continue;  // skip if currency undefined
      const { total, currency, clientId, projectId } = grouped[key];
      const acct = await prisma.trustAccount.findFirst({ where: { clientId: Number(clientId), projectId, currency } });
      if (!acct) {
        await prisma.trustAccount.create({
          data: {
            clientId: Number(clientId),
            projectId,
            currency,
            transactions: { create: { txnType: 'CREDIT', amount: Number(total), description: 'Initial advance payments' } },
          },
        });
      } else {
        // sum of existing credit transactions
        const creditAgg = await prisma.trustTransaction.aggregate({
          where: { trustAccountId: acct.id, txnType: 'CREDIT' },
          _sum: { amount: true },
        });
        const credited = parseFloat(creditAgg._sum.amount?.toString() || '0');
        if (total > credited) {
          const diff = total - credited;
          await prisma.trustTransaction.create({
            data: {
              trustAccountId: acct.id,
              txnType: 'CREDIT',
              amount: diff,
              description: 'Advance payment for new projects',
            },
          });
        }
      }
    }

    // seed EXPENSE accounts from AdvancePayment records (accountType=EXPENSE)
    const expAdvances = await prisma.advancePayment.findMany({
      where: { accountType: 'EXPENSE', project: { companyId } },
      select: { id: true, projectId: true, currency: true, amount: true, project: { select: { clientId: true, name: true } } },
    });
    for (const adv of expAdvances) {
      const { projectId, currency, amount } = adv;
      const clientId = adv.project.clientId;
      if (!currency) continue;
      let acct = await prisma.trustAccount.findFirst({ where: { clientId, projectId, currency, accountType: 'EXPENSE' } });
      if (!acct) {
        acct = await prisma.trustAccount.create({
          data: {
            clientId,
            projectId,
            currency,
            accountType: 'EXPENSE',
            transactions: {
              create: { txnType: 'CREDIT', amount, description: 'Initial expense advance' },
            },
          },
        });
      } else {
        const creditAgg = await prisma.trustTransaction.aggregate({
          where: { trustAccountId: acct.id, txnType: 'CREDIT' },
          _sum: { amount: true },
        });
        const credited = parseFloat(creditAgg._sum.amount?.toString() || '0');
        if (Number(amount) > credited) {
          await prisma.trustTransaction.create({
            data: { trustAccountId: acct.id, txnType: 'CREDIT', amount: Number(amount) - credited, description: 'Expense advance top-up' },
          });
        }
      }
    }

    const raw = await prisma.trustAccount.findMany({
      where,
      include: {
        client: { select: { id: true, name: true } },
        project: { select: { id: true, name: true } },
        transactions: true,
      },
    });

    // aggregate by client/project/currency to avoid duplicates
    const accountMap: Record<string, { id: number; client: any; project: any; currency: string; balance: number; accountType: string }> = {};
    raw.forEach((a) => {
      const bal = a.transactions.reduce((acc, t) => {
        const amt = Number(t.amount);
        return t.txnType === 'DEBIT' ? acc - amt : acc + amt;
      }, 0);
      const key = `${a.clientId}-${a.projectId ?? 'all'}-${a.currency}`;
      if (!accountMap[key]) {
        accountMap[key] = {
          id: a.id,
          client: a.client,
          project: a.project,
          accountType: a.accountType,
      currency: a.currency,
          balance: bal,
        };
      } else {
        accountMap[key].balance += bal;
      }
    });

    const accounts = Object.values(accountMap).map((a) => ({
      ...a,
      balance: parseFloat(a.balance.toFixed(2)),
    }));
    return NextResponse.json(accounts);
*/
  } catch (err) {
    console.error('GET /api/trust-accounts', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
});

// POST /api/trust-accounts  { clientId, currency }
export const POST = withCompany(async (req: NextRequest, companyId?: number) => {
  const { role } = auth(req);
  if (!role || role === 'STAFF') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const body = await req.json();
  const { clientId, projectId = null, currency = 'USD' } = body;
  if (!clientId) return NextResponse.json({ error: 'clientId required' }, { status: 400 });

  // ensure one account per client
  const exists = await prisma.trustAccount.findUnique({ where: { clientId_projectId_currency: { clientId, projectId, currency } } as any });
  if (exists) return NextResponse.json(exists);

  const acct = await prisma.trustAccount.create({ data: { clientId, projectId, currency, companyId } });
  return NextResponse.json(acct, { status: 201 });
});
