import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';

function getUser(req: NextRequest) {
  const auth = req.headers.get('authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) return null;
  try {
    const d = jwt.verify(token, JWT_SECRET) as any;
    return d ? { id: Number(d.sub), role: d.role } : null;
  } catch {
    return null;
  }
}

// PUT /api/invoices/[id]/trust — deduct invoice total from trust account(s)
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = getUser(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!(user.role === 'OWNER' || user.role === 'ACCOUNTANT'))
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const invId = Number(params.id);
    if (isNaN(invId)) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });

    const invoice = await prisma.invoice.findUnique({ where: { id: invId }, include: { client: true } });
    if (!invoice) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    if (invoice.status?.toUpperCase() === 'DRAFT') {
      return NextResponse.json({ error: 'Invoice is draft; issue it first' }, { status: 400 });
    }

    // already fully paid?
    if (invoice.status?.toUpperCase() === 'PAID') {
      return NextResponse.json({ error: 'Already paid' }, { status: 400 });
    }

    const amountDue = Number(invoice.total) - (invoice.paid ?? 0);
    if (amountDue <= 0) return NextResponse.json({ error: 'Nothing due' }, { status: 400 });

    // gather trust accounts by priority: project account first, then other client accounts same currency
    const projectAccounts = await prisma.trustAccount.findMany({
      where: {
        clientId: invoice.clientId,
        projectId: invoice.projectId ?? undefined,
        currency: invoice.currency,
      },
      orderBy: { id: 'asc' },
    });
    const otherAccounts = await prisma.trustAccount.findMany({
      where: {
        clientId: invoice.clientId,
        currency: invoice.currency,
        NOT: { id: { in: projectAccounts.map((a) => a.id) } },
      },
      orderBy: { id: 'asc' },
    });
    const accounts = [...projectAccounts, ...otherAccounts];

    const totalBal = accounts.reduce((sum, a) => sum + Number(a.balance), 0);
    if (totalBal < amountDue) {
      return NextResponse.json({ error: 'Insufficient trust balance' }, { status: 400 });
    }

    const txns: any[] = [];
    let remaining = amountDue;
    for (const acct of accounts) {
      if (remaining <= 0) break;
      const bal = Number(acct.balance);
      const deduct = Math.min(bal, remaining);
      if (deduct > 0) {
        txns.push(
          prisma.trustTransaction.create({
            data: {
              trustAccountId: acct.id,
              projectId: invoice.projectId ?? undefined,
              invoiceId: invoice.id,
              txnType: 'DEBIT',
              amount: deduct,
              description: `Invoice #${invoice.invoiceNumber ?? invoice.id}`,
            },
          }),
          prisma.trustAccount.update({
            where: { id: acct.id },
            data: { balance: { decrement: deduct } },
          }),
        );
        remaining -= deduct;
      }
    }

    txns.push(
      prisma.payment.create({
        data: {
          invoiceId: invoice.id,
          amount: amountDue,
          gateway: 'TRUST',
          paidOn: new Date(),
          txnReference: `TRUST-${accounts[0]?.id}`,
        },
      }),
      prisma.invoice.update({
        where: { id: invoice.id },
        data: {
            status: 'PAID',
            trustDeducted: { increment: amountDue },
            total: (Number(invoice.subtotal) - Number(invoice.discount) - (Number(invoice.trustDeducted) + amountDue) + Number(invoice.tax || 0)).toString(),
          },
      }),
    );

    await prisma.$transaction(txns);

    const updated = await prisma.invoice.findUnique({ where: { id: invoice.id }, include: { client: true, items: true } });
    return NextResponse.json(updated);
  } catch (e) {
    console.error('PUT /api/invoices/[id]/trust', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
