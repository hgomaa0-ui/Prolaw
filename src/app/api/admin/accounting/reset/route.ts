import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

/**
 * POST /api/admin/accounting/reset
 * Body: { companyId?: number }
 * Requires user role OWNER or ADMIN.
 * Deletes ALL existing `Account`s for the company
 * and recreates 5 root accounts (Assets, Liabilities, Equity, Revenue, Expenses).
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { role, companyId: sessionCompany } = session.user as any;
    if (!(role === 'OWNER' || role === 'ADMIN')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { companyId } = (await req.json().catch(() => ({}))) as {
      companyId?: number;
    };
    const targetCompanyId = companyId ?? sessionCompany;
    if (!targetCompanyId) {
      return NextResponse.json({ error: 'companyId required' }, { status: 400 });
    }

    // delete existing accounts for company
    await prisma.$transaction([
      prisma.account.deleteMany({ where: { companyId: targetCompanyId } }),
      prisma.account.createMany({
        data: [
          // root
          { companyId: targetCompanyId, code: '1', name: 'Assets', type: 'ASSET' },
          { companyId: targetCompanyId, code: '2', name: 'Liabilities', type: 'LIABILITY' },
          { companyId: targetCompanyId, code: '3', name: 'Equity', type: 'EQUITY' },
          { companyId: targetCompanyId, code: '4', name: 'Revenue', type: 'INCOME' },
          { companyId: targetCompanyId, code: '5', name: 'Expenses', type: 'EXPENSE' },
          // common sub-accounts
          { companyId: targetCompanyId, code: '1-001', name: 'Main Cash', type: 'ASSET' },
          { companyId: targetCompanyId, code: '1-002', name: 'Accounts Receivable', type: 'ASSET' },
          { companyId: targetCompanyId, code: '2-001', name: 'Accounts Payable', type: 'LIABILITY' },
          { companyId: targetCompanyId, code: '2-002', name: 'Tax Payable', type: 'LIABILITY' },
        ],
        skipDuplicates: true,
      }),
    ]);

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error('reset accounts error', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
