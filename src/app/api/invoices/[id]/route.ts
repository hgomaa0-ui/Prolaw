import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/invoices/[id]
export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
    const numericId = parseInt(id);
  try {
    const invoice = isNaN(numericId)
      ? await prisma.invoice.findUnique({
          where: { invoiceNumber: id },
          include: { client: true, items: true },
        })
      : await prisma.invoice.findUnique({
          where: { id: numericId },
          include: { client: true, items: true },
        });
    if (!invoice)
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(invoice);
  } catch (err: any) {
    console.error("Get invoice failed", err);
    return NextResponse.json(
      { error: err.message || "Server error" },
      { status: 500 },
    );
  }
}

// PUT /api/invoices/[id] — update basic fields (issueDate, dueDate, status)
// DELETE /api/invoices/[id] — delete invoice and items
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const { id } = params;
  const whereClause = isNaN(parseInt(id)) ? { invoiceNumber: id } : { id: parseInt(id) };
  try {
    let invId: number | null = null;
    if ('id' in whereClause) {
      invId = whereClause.id;
    } else {
      const inv = await prisma.invoice.findUnique({ where: whereClause });
      if (inv) invId = inv.id;
    }
    if (invId) {
       const existing = await prisma.invoice.findUnique({ where: { id: invId } });
       if (!existing) {
         return NextResponse.json({ error: 'Not found' }, { status: 404 });
       }
       await prisma.$transaction([
         prisma.payment.deleteMany({ where: { invoiceId: invId } }),
         prisma.trustTransaction.deleteMany({ where: { invoiceId: invId } }),
         prisma.invoiceItem.deleteMany({ where: { invoiceId: invId } }),
         prisma.invoice.delete({ where: { id: invId } }),
       ]);
     } else {
      // if invoice number not found
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Delete invoice failed", err);
    return NextResponse.json({ error: err.message || "Server error" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const whereClause = isNaN(parseInt(id)) ? { invoiceNumber: id } : { id: parseInt(id) };
  try {
        const data = await req.json();
    const updateData: any = {};
    if (data.issueDate) updateData.issueDate = new Date(data.issueDate);
    if (data.dueDate) updateData.dueDate = new Date(data.dueDate);
    if (data.status) updateData.status = String(data.status).toUpperCase();
    if (data.discount != null) updateData.discount = data.discount;
    if (data.projectId) updateData.project = { connect: { id: Number(data.projectId) } };
    if (data.tax != null) updateData.tax = data.tax;
    if (data.bankId) updateData.bank = { connect: { id: Number(data.bankId) } };
    if (data.language) updateData.language = String(data.language).toUpperCase();
    let currencyChanged = false;
    if (data.currency) {
      const newCur = String(data.currency).toUpperCase();
      updateData.currency = newCur;
      // fetch existing invoice to compare later
      const existingInv = await prisma.invoice.findUnique({ where: whereClause, include: { items: true } });
      if (existingInv && existingInv.currency !== newCur) {
        currencyChanged = true;
        // convert all items prices
        const { convert } = await import('@/lib/forex');
        for (const it of existingInv.items) {
          // keep quantity unchanged, only convert unit price
          const newUnit = await convert(Number(it.unitPrice), existingInv.currency, newCur);
          console.log('CONVERT ITEM', { id: it.id, from: existingInv.currency, to: newCur, oldUnit: it.unitPrice, newUnit });
          await prisma.invoiceItem.update({ where: { id: it.id }, data: { unitPrice: newUnit, lineTotal: newUnit * Number(it.quantity) } });
        }
        // recalc subtotal and total using updated items
        const agg = await prisma.invoiceItem.aggregate({ where: { invoiceId: existingInv.id }, _sum: { lineTotal: true } });
        const subtotalAgg = agg._sum.lineTotal ? Number(agg._sum.lineTotal) : 0;
        const disc = data.discount != null ? Number(data.discount) : (existingInv.discount ? Number(existingInv.discount) : 0);
        const tx = data.tax != null ? Number(data.tax) : (existingInv.tax ? Number(existingInv.tax) : 0);
        const totAgg = (subtotalAgg - disc) * (1 + tx/100);
        updateData.subtotal = subtotalAgg.toString();
        updateData.total = totAgg.toString();
      }
    }

    // if discount/tax provided recalc total based on current subtotal
    let invoice;
    if (data.discount != null || data.tax != null || data.items?.length) {
      // if items array provided, replace items
     if (Array.isArray(data.items)) {
       // remove existing items
       const targetInvForItems = await prisma.invoice.findUnique({ where: whereClause });
       if (targetInvForItems) {
         await prisma.invoiceItem.deleteMany({ where: { invoiceId: targetInvForItems.id } });
         // create new items
         for (const item of data.items) {
           await prisma.invoiceItem.create({
             data: {
               invoiceId: targetInvForItems.id,
               description: item.description,
               quantity: Number(item.quantity),
               unitPrice: Number(item.unitPrice),
               lineTotal: Number(item.quantity) * Number(item.unitPrice),
               itemType: item.itemType || 'TIME'
             }
           });
         }
       }
     }

     // after potential items update get subtotal
     // get subtotal from items
      const targetInv = await prisma.invoice.findUnique({ where: whereClause, include: { items: true } });
      if (!targetInv) return NextResponse.json({ error: 'Not found' }, { status: 404 });
      const agg = await prisma.invoiceItem.aggregate({ where: { invoiceId: targetInv.id }, _sum: { lineTotal: true } });
      const subtotal = agg._sum.lineTotal ? Number(agg._sum.lineTotal) : 0;
      const discountVal = data.discount != null ? Number(data.discount) : undefined;
      const taxVal = data.tax != null ? Number(data.tax) : undefined;
      const existing = await prisma.invoice.findUnique({ where: whereClause });
      const discount = discountVal ?? (existing?.discount ? Number(existing.discount) : 0);
      const tax = taxVal ?? (existing?.tax ? Number(existing.tax) : 0);
      const totalCalc = (subtotal - discount) * (1 + tax / 100);
      updateData.subtotal = subtotal.toString();
      updateData.total = totalCalc.toString();
    } else {
      // even when no items array sent, recalc totals in case currency changed
      const targetInv = await prisma.invoice.findUnique({ where: whereClause, include: { items: true } });
      if (targetInv) {
        const agg = await prisma.invoiceItem.aggregate({ where: { invoiceId: targetInv.id }, _sum: { lineTotal: true } });
        const subtotal = agg._sum.lineTotal ? Number(agg._sum.lineTotal) : 0;
        const discount = targetInv.discount ? Number(targetInv.discount) : 0;
        const tax = targetInv.tax ? Number(targetInv.tax) : 0;
        const totalCalc = (subtotal - discount) * (1 + tax / 100);
        updateData.subtotal = subtotal.toString();
        updateData.total = totalCalc.toString();
      }
    }

    // trust payment handling
    const trustAmt = Number(data.trustAmount) || 0;
    if (trustAmt > 0) {
      const targetInv = await prisma.invoice.findUnique({ where: whereClause });
      if (!targetInv) return NextResponse.json({ error: 'Not found' }, { status: 404 });
      // get project-specific accounts first, then other accounts for same client/currency
      const projectAccts = await prisma.trustAccount.findMany({ where: { clientId: targetInv.clientId, projectId: targetInv.projectId ?? undefined, currency: targetInv.currency }, orderBy: { id: 'asc' } });
      const otherAccts = await prisma.trustAccount.findMany({ where: { clientId: targetInv.clientId, currency: targetInv.currency, NOT: { id: { in: projectAccts.map((p) => p.id) } } }, orderBy: { id: 'asc' } });
      const accounts = [...projectAccts, ...otherAccts];
      const totalBal = accounts.reduce((sum, a) => sum + parseFloat(a.balance.toString()), 0);
      // apply up to available balance
      const applyAmt = Math.min(trustAmt, totalBal);
      if (applyAmt === 0) {
        // nothing to deduct, skip trust logic
      } else {
      // deduct sequentially from accounts
      const txns: any[] = [];
      let remaining = applyAmt;
      for (const a of accounts) {
        if (remaining <= 0) break;
        const bal = parseFloat(a.balance.toString());
        const deduction = Math.min(bal, remaining);
        if (deduction > 0) {
          txns.push(
            prisma.trustTransaction.create({
              data: {
                trustAccountId: a.id,
                txnType: 'DEBIT',
                amount: deduction,
                description: `Payment for invoice ${targetInv.invoiceNumber}`,
                invoiceId: targetInv.id,
              },
            }),
            prisma.trustAccount.update({ where: { id: a.id }, data: { balance: { decrement: deduction } } })
          );
          remaining -= deduction;
        }
      }
      // create payment and update invoice status inside same transaction
      const paymentRef = `TRUST-${accounts[0].id}`;
      txns.push(
        prisma.payment.create({
          data: {
            invoiceId: targetInv.id,
            amount: trustAmt,
            paidOn: new Date(),
            gateway: 'TRUST',
            txnReference: paymentRef,
          },
        }),
        prisma.invoice.update({
          where: { id: targetInv.id },
          data: { status: trustAmt >= Number(targetInv.total) ? 'PAID' : 'SENT' },
        })
      );

      await prisma.$transaction(txns);
      }

    }

    // final safety: recalc subtotal/total from DB before saving
    const invForTotals = await prisma.invoice.findUnique({ where: whereClause, include: { items: true } });
    if (invForTotals) {
      const aggTot = await prisma.invoiceItem.aggregate({ where: { invoiceId: invForTotals.id }, _sum: { lineTotal: true } });
      const sub = aggTot._sum.lineTotal ? Number(aggTot._sum.lineTotal) : 0;
      const discFin = updateData.discount != null ? Number(updateData.discount) : (invForTotals.discount ? Number(invForTotals.discount) : 0);
      const taxFin = updateData.tax != null ? Number(updateData.tax) : (invForTotals.tax ? Number(invForTotals.tax) : 0);
      updateData.subtotal = sub.toString();
      updateData.total = ((sub - discFin) * (1 + taxFin/100)).toString();
    }

    console.log('UPDATE DATA', updateData);
    invoice = await prisma.invoice.update({
      where: whereClause,
      data: updateData,
      include: { client: true, items: true },
    });
    return NextResponse.json(invoice);
  } catch (err: any) {
    console.error("Update invoice failed", err);
    return NextResponse.json({ error: err.message || "Server error" }, { status: 500 });
  }
}
