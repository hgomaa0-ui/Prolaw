import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// POST /api/invoices/[id]/items
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const invoiceId = parseInt(params.id);
  if (isNaN(invoiceId)) {
    return NextResponse.json({ error: "Invalid invoice id" }, { status: 400 });
  }

  try {
    const body = await req.json();
    const { description, quantity, unitPrice } = body ?? {};

    if (!description || quantity == null || unitPrice == null) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    const qtyNum = Number(quantity);
    const priceNum = Number(unitPrice);
    if (isNaN(qtyNum) || isNaN(priceNum) || qtyNum <= 0 || priceNum < 0) {
      return NextResponse.json({ error: "Invalid quantity or price" }, { status: 400 });
    }

    const lineTotal = qtyNum * priceNum;

    // create item
    const item = await prisma.invoiceItem.create({
      data: {
        invoiceId,
        itemType: "CUSTOM",
        description,
        quantity: qtyNum.toString(),
        unitPrice: priceNum.toString(),
        lineTotal: lineTotal.toString(),
      },
    });

    // recalc invoice totals
    const agg = await prisma.invoiceItem.aggregate({
      where: { invoiceId },
      _sum: { lineTotal: true },
    });
    const subtotal = agg._sum.lineTotal ? Number(agg._sum.lineTotal) : 0;

    const invoice = await prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        subtotal: subtotal.toString(),
        total: subtotal.toString(),
      },
      include: { client: true, items: true },
    });

    return NextResponse.json(invoice, { status: 201 });
  } catch (err: any) {
    console.error("Add item failed", err);
    return NextResponse.json({ error: err.message || "Server error" }, { status: 500 });
  }
}
