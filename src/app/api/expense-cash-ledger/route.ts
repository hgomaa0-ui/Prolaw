import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { withCompany } from '@/lib/with-company';

// GET /api/expense-cash-ledger?clientId=123&projectId=456
// Returns { balance, entries: [...] }
export const GET = withCompany(async (req: NextRequest, companyId?: number) => {
  try {
    const clientIdParam = req.nextUrl.searchParams.get('clientId');
    const projectIdParam = req.nextUrl.searchParams.get('projectId');

    const where: any = { companyId };
    if (clientIdParam) where.clientId = Number(clientIdParam);
    if (projectIdParam) where.projectId = Number(projectIdParam);

    const entries = await prisma.expenseCashLedger.findMany({
      where,
      include: {
        client: { select: { id: true, name: true } },
        project: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const balance = entries.reduce((sum, e) => sum + Number(e.amount), 0);

    return NextResponse.json({ balance, entries });
  } catch (err: any) {
    console.error('/api/expense-cash-ledger', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
});
