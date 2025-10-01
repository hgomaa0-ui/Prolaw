import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { buildInvoicePdf } from '@/lib/invoicePdf';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';

function getUserId(req: NextRequest): number | null {
  const token = req.headers.get('authorization')?.replace('Bearer ', '') || '';
  try {
    const { id, sub } = jwt.verify(token, JWT_SECRET) as any;
    return Number(id ?? sub);
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const userId = getUserId(req);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  /* جلب الفاتورة والشركة */
  const numericId = Number(params.id);
  const invoice = await prisma.invoice.findUnique({
    where: isNaN(numericId) ? { invoiceNumber: params.id } : { id: numericId },
    include: { client: true, items: true },
  });
  if (!invoice) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const company = await prisma.company.findUnique({ where: { id: invoice.companyId } });

  /* بناء PDF */
  const bytes = await buildInvoicePdf(invoice, company, req.nextUrl.origin);

  return new NextResponse(bytes, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename=invoice_${invoice.invoiceNumber}.pdf`,
    },
  });
}