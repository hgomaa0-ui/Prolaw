import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import nodemailer from "nodemailer";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const numericId = parseInt(params.id);
  const whereClause = isNaN(numericId) ? { invoiceNumber: params.id } : { id: numericId };

  try {
    const { toEmail } = await req.json();
    if (!toEmail) return NextResponse.json({ error: "toEmail required" }, { status: 400 });

    const invoice = await prisma.invoice.findFirst({
      where: whereClause,
    });

    // fetch fresh client email
    const client = await prisma.client.findUnique({ where: { id: invoice?.clientId ?? 0 } });
    if (!invoice || !client) return NextResponse.json({ error: "Not found" }, { status: 404 });

    // build PDF link (already copy link feature)
    const base = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL || "http://localhost:3000";
    const invoiceUrl = `${base}/invoices/${invoice?.invoiceNumber}`;

    // create transporter from env vars
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    await transporter.sendMail({
      from: `Invoices <${process.env.SMTP_USER}>`,
      to: toEmail,
      subject: `Invoice ${invoice.invoiceNumber}`,
      html: `<p>Dear client,</p>
      <p>Please find your invoice (${invoice.invoiceNumber}). You can view and download it here:</p>
      <p><a href="${invoiceUrl}">${invoiceUrl}</a></p>
      <p>Thank you.</p>`,
    });

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("send invoice email failed", err);
    return NextResponse.json({ error: err.message || "Server error" }, { status: 500 });
  }
}
