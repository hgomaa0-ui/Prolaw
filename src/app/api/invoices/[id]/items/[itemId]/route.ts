import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// DELETE /api/invoices/[id]/items/[itemId]
// PUT /api/invoices/[id]/items/[itemId]
export async function PUT(req: NextRequest, { params }: { params: { id: string; itemId: string } }) {
  const invoiceId = parseInt(params.id);
  const itemId = parseInt(params.itemId);
  if (isNaN(invoiceId) || isNaN(itemId)) {
    return NextResponse.json({ error: "Invalid ids" }, { status: 400 });
  }
  try {
    const body = await req.json();
    const { quantity, unitPrice, description } = body;

    const data: any = {};
    if (quantity != null) data.quantity = quantity.toString();
    if (unitPrice != null) data.unitPrice = unitPrice.toString();
    if (description != null) data.description = description;
    if (data.quantity != null || data.unitPrice != null) {
      const qty = data.quantity ? Number(data.quantity) : undefined;
      const price = data.unitPrice ? Number(data.unitPrice) : undefined;
      const q = qty ?? (await prisma.invoiceItem.findUnique({ where: { id: itemId } }))!.quantity.toNumber();
      const p = price ?? (await prisma.invoiceItem.findUnique({ where: { id: itemId } }))!.unitPrice.toNumber();
      data.lineTotal = (q * p).toString();
    }

    await prisma.invoiceItem.update({ where: { id: itemId }, data });

    // recalc totals
    const agg = await prisma.invoiceItem.aggregate({ where: { invoiceId }, _sum: { lineTotal: true } });
    const subtotal = agg._sum.lineTotal ? Number(agg._sum.lineTotal) : 0;
    // fetch current discount & tax
      const existing = await prisma.invoice.findUnique({ where: { id: invoiceId } });
      const discount = existing?.discount ? Number(existing.discount) : 0;
      const tax = existing?.tax ? Number(existing.tax) : 0;
      const totalCalc = (subtotal - discount) * (1 + tax / 100);

      const invoice = await prisma.invoice.update({
      where: { id: invoiceId },
      data: { subtotal: subtotal.toString(), total: totalCalc.toString() },
      include: { client: true, items: true },
    });
    return NextResponse.json(invoice);
  } catch (err: any) {
    console.error("Update item failed", err);
    return NextResponse.json({ error: err.message || "Server error" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string; itemId: string } }) {
  const invoiceId = parseInt(params.id);
  const itemId = parseInt(params.itemId);
  if (isNaN(invoiceId) || isNaN(itemId)) {
    return NextResponse.json({ error: "Invalid ids" }, { status: 400 });
  }
  try {
    await prisma.invoiceItem.delete({ where: { id: itemId } });

    // recalc totals
    const agg = await prisma.invoiceItem.aggregate({
      where: { invoiceId },
      _sum: { lineTotal: true },
    });
    const subtotal = agg._sum.lineTotal ?? 0;

    const existing = await prisma.invoice.findUnique({ where: { id: invoiceId } });
    const discount = existing?.discount ? Number(existing.discount) : 0;
    const tax = existing?.tax ? Number(existing.tax) : 0;
    const totalCalc = (subtotal - discount) * (1 + tax / 100);
    const invoice = await prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        subtotal: subtotal.toString(),
        total: totalCalc.toString(),
      },
      include: { client: true, items: true },
    });
    return NextResponse.json(invoice);
  } catch (err: any) {
    console.error("Delete item failed", err);
    return NextResponse.json({ error: err.message || "Server error" }, { status: 500 });
  }
}
