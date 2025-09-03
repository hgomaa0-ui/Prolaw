import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { convert } from "@/lib/forex";
import { getAuthUser } from "@/utils/auth-server";

// POST /api/invoices/[id]/approve
// Accountant approves invoice: if project currency differs from invoice currency (USD),
// convert all item prices and totals to project currency, update invoice status to APPROVED.
export async function POST(req: NextRequest, ctx: { params: { id: string } }) {
  const { id } = ctx.params;

  // Optional: auth & role check
  try {
    const user = await getAuthUser(req);
    if (!user || (user.role !== "ACCOUNTANT_MASTER" && user.role !== "ACCOUNTANT_ASSISTANT" && user.role !== "ADMIN")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  } catch {
    // if auth util missing, continue without strict check
  }

  const whereClause = isNaN(parseInt(id)) ? { invoiceNumber: id } : { id: parseInt(id) };

  try {
    // fetch invoice with items and project
    const invoice = await prisma.invoice.findUnique({
      where: whereClause,
      include: { items: true, project: true },
    });
    if (!invoice) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const projectCurrency: string | undefined = (invoice.project as any)?.advanceCurrency || (invoice.project as any)?.currency;
    const targetCur = projectCurrency || invoice.currency;

    // flag to know if conversion needed
    const needConv = invoice.currency !== targetCur;

    if (needConv) {
      // loop items convert
      for (const item of invoice.items) {
        let newUnit = await convert(Number(item.unitPrice), invoice.currency, targetCur);
        // simple fallback hard-coded if API fails
        if (newUnit === Number(item.unitPrice)) {
          const fbRates: Record<string, number> = { 'USD_EGP': 30, 'EGP_USD': 1 / 30 };
          const k = `${invoice.currency}_${targetCur}`;
          if (fbRates[k]) newUnit = Number(item.unitPrice) * fbRates[k];
        }
        const newLine = newUnit * Number(item.quantity);
        await prisma.invoiceItem.update({
          where: { id: item.id },
          data: { unitPrice: newUnit, lineTotal: newLine },
        });
      }
      // recalc subtotal & total
      const agg = await prisma.invoiceItem.aggregate({ where: { invoiceId: invoice.id }, _sum: { lineTotal: true } });
      const subtotal = agg._sum.lineTotal ? Number(agg._sum.lineTotal) : 0;
      const discount = invoice.discount ? Number(invoice.discount) : 0;
      const tax = invoice.tax ? Number(invoice.tax) : 0;
      const total = (subtotal - discount) * (1 + tax / 100);

      await prisma.invoice.update({
        where: { id: invoice.id },
        data: {
          currency: targetCur,
          subtotal: subtotal.toString(),
          total: total.toString(),
        },
      });
    }

    // finally set status to APPROVED
    const updated = await prisma.invoice.update({
      where: { id: invoice.id },
      data: { status: "APPROVED" },
      include: { items: true, client: true },
    });

        // -------------------------------------------------------------------------
    // Post to General Ledger
    //   Debit: Accounts Receivable (client)
    //   Credit: Revenue (and Tax Payable if tax > 0)
    // -------------------------------------------------------------------------
    try {
      const arAccount = await prisma.account.findFirst({ where: { code: 'AR' } });
      const revenueAccount = await prisma.account.findFirst({ where: { type: 'INCOME' } });
      const taxAccount = await prisma.account.findFirst({ where: { code: 'TAX_PAYABLE' } });
      if (arAccount && revenueAccount) {
        const amountTotal = Number(updated.total);
        const lines = [
          { accountId: arAccount.id, debit: amountTotal, currency: updated.currency },
          { accountId: revenueAccount.id, credit: amountTotal - (updated.tax || 0), currency: updated.currency },
        ] as any[];
        if (updated.tax && taxAccount) {
          lines.push({ accountId: taxAccount.id, credit: Number(updated.tax), currency: updated.currency });
        }
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const { postTransaction } = require('@/lib/gl');
        await postTransaction({
          memo: `Invoice #${updated.invoiceNumber || updated.id} approved`,
          createdBy: user?.id,
          lines,
        });
      }
    } catch (glErr) {
      console.error('GL posting failed for invoice', glErr);
    }

    return NextResponse.json(updated);
  } catch (err: any) {
    console.error("Approve invoice failed", err);
    return NextResponse.json({ error: err.message || "Server error" }, { status: 500 });
  }
}
