import { NextRequest, NextResponse } from "next/server";
// Use chrome-aws-lambda + puppeteer-core on Vercel to avoid installing full Chrome
import type { Browser } from "puppeteer-core";
import chromium from "chrome-aws-lambda";
import type { Browser } from "puppeteer-core";
import { renderInvoiceHTML } from "@/lib/invoiceHtml";
const isVercel = process.env.VERCEL === "1";



import { prisma } from "@/lib/prisma";
import jwt from "jsonwebtoken";
import fs from "fs/promises";
import path from "path";

/* ---------- helpers ---------- */
const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-me";

function getUserId(req: NextRequest): number | null {
  const header = req.headers.get("authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return null;
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { sub?: number; id?: number };
    const uid = decoded.sub ?? decoded.id;
    return uid ? Number(uid) : null;
  } catch {
    return null;
  }
}

const toNumber = (v: any) => {
  if (typeof v === "number") return v;
  if (typeof v === "string") return parseFloat(v);
  if (v && typeof v === "object" && "toNumber" in v) {
    try {
      return (v as any).toNumber();
    } catch {}
  }
  return parseFloat(String(v));
};
const fmt = (v: any) =>
  toNumber(v).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
  });

const shapeArabic = (txt: string) =>
  reshaper.ArabicShaper.convertArabic(txt).split("").reverse().join("");
/* ---------- main route ---------- */
export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;
  const userId = getUserId(req);
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const numericId = Number(id);
  const invoice = await prisma.invoice.findUnique({
    where: isNaN(numericId) ? { invoiceNumber: id } : { id: numericId },
    include: { client: true, items: true },
  });
  if (!invoice)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  /* ---------- HTML -> PDF via Puppeteer ---------- */
  
  
  

  // fetch company info for current user
  const user = await prisma.user.findUnique({ where:{ id:userId }, include:{ company:true } });
  const company=user?.company;
  const isArabic = (invoice.language || "").toLowerCase() === "ar";

    const html = renderInvoiceHTML(invoice as any, {
      firmName: company?.name || process.env.NEXT_PUBLIC_FIRM_NAME || (isArabic ? "اسم شركتك" : "Your Firm"),
      firmAddress: company?.address || process.env.NEXT_PUBLIC_FIRM_ADDRESS || "",
      firmContact: company?.phone || process.env.NEXT_PUBLIC_FIRM_CONTACT || "",
      logoUrl: company?.logoUrl ? (company.logoUrl.startsWith("http") ? company.logoUrl : `${req.nextUrl.origin}${company.logoUrl}`) : undefined,
      isArabic,
    });

    let browser: Browser;
if (isVercel) {
  const puppeteer = await import("puppeteer-core");
  browser = await puppeteer.launch({
    args: chromium.args,
    defaultViewport: chromium.defaultViewport,
    executablePath: await chromium.executablePath,
    headless: chromium.headless,
  });
} else {
  const puppeteer = await import("puppeteer");
  browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox","--font-render-hinting=medium"],
  });
}
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });
    const pdfBuffer = await page.pdf({ format: "A4", printBackground: true });
    await browser.close();

    return new NextResponse(pdfBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename=invoice_${invoice.invoiceNumber}.pdf`,
      },
    });

  // load fonts
  let regularFont, boldFont;
  if (isArabic) {
    try {
      // try local font first
      const localPath = path.join(
        process.cwd(),
        "public",
        "fonts",
        "NotoSansArabic-Regular.ttf"
      );
      // Always fetch Cairo font which supports Arabic
      const resReg = await fetch(
        "https://raw.githubusercontent.com/google/fonts/main/ofl/cairo/Cairo-Regular.ttf"
      );
      const resBold = await fetch(
        "https://raw.githubusercontent.com/google/fonts/main/ofl/cairo/Cairo-Bold.ttf"
      );
      const regularBytes = new Uint8Array(await resReg.arrayBuffer());
      const boldBytes = new Uint8Array(await resBold.arrayBuffer());
      regularFont = await pdfDoc.embedFont(regularBytes);
      boldFont = await pdfDoc.embedFont(boldBytes);
    } catch {
      console.warn("Failed to load Arabic font, falling back to Helvetica");
      regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
      boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    }
  } else {
    regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
    boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  }

  /* ---------- Header ---------- */
  const FIRM_NAME =
    process.env.NEXT_PUBLIC_FIRM_NAME || (isArabic ? "اسم شركتك" : "Your Firm");
  const FIRM_ADDRESS =
    process.env.NEXT_PUBLIC_FIRM_ADDRESS ||
    (isArabic ? "١٢٣ شارع الأعمال" : "123 Business St., Cairo");
  const FIRM_CONTACT =
    process.env.NEXT_PUBLIC_FIRM_CONTACT ||
    (isArabic
      ? "info@yourfirm.com • ٠١٠٠٠٠٠٠٠٠"
      : "info@yourfirm.com • +20 100 000 0000");

  page.drawText(isArabic ? shapeArabic(FIRM_NAME) : FIRM_NAME, { x: 50, y: 800, size: 16, font: boldFont });
  page.drawText(isArabic ? shapeArabic(FIRM_ADDRESS) : FIRM_ADDRESS, { x: 50, y: 784, size: 10, font: regularFont });
  page.drawText(isArabic ? shapeArabic(FIRM_CONTACT) : FIRM_CONTACT, { x: 50, y: 770, size: 10, font: regularFont });

  /* ---------- Invoice info ---------- */
  page.drawText(isArabic ? shapeArabic("فاتورة") : "INVOICE", {
    x: 450,
    y: 800,
    size: 20,
    font: boldFont,
  });
  page.drawText(
    isArabic ? shapeArabic(`رقم: ${invoice.invoiceNumber}`) : `No: ${invoice.invoiceNumber}`,
    { x: 450, y: 784, size: 10, font: regularFont }
  );
  page.drawText(
    isArabic
      ? shapeArabic(`الإصدار: ${invoice.issueDate ? new Date(invoice.issueDate).toLocaleDateString() : ""}`)
      : `Issue: ${invoice.issueDate ? new Date(invoice.issueDate).toLocaleDateString() : ""}`,
    { x: 450, y: 770, size: 10, font: regularFont }
  );
  page.drawText(
    isArabic
      ? shapeArabic(`الاستحقاق: ${invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString() : ""}`)
      : `Due: ${invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString() : ""}`,
    { x: 450, y: 756, size: 10, font: regularFont }
  );

  /* ---------- Client block ---------- */
  page.drawText(isArabic ? shapeArabic("فاتورة إلى:") : "Bill To:", {
    x: 50,
    y: 730,
    size: 12,
    font: boldFont,
  });
  const clientLines = [invoice.client?.name || ""];
  let y = 716;
  clientLines.forEach((line) => {
    page.drawText(isArabic ? shapeArabic(line) : line, { x: 50, y, size: 11, font: regularFont });
    y -= 14;
  });

  /* ---------- Table headers ---------- */
  y = 680;
  const headers = isArabic
    ? [shapeArabic("الوصف"), shapeArabic("الكمية"), shapeArabic("سعر الوحدة"), shapeArabic("الإجمالي")]
    : ["Description", "Qty", "Unit Price", "Line Total"];
  [50, 300, 350, 460].forEach((x, i) =>
    page.drawText(headers[i], { x, y, size: 11, font: boldFont })
  );
  y -= 12;
  page.drawLine({
    start: { x: 50, y },
    end: { x: 550, y },
    thickness: 1,
    color: rgb(0.8, 0.8, 0.8),
  });
  y -= 12;

  /* ---------- Rows ---------- */
  invoice.items.forEach((it) => {
    page.drawText(isArabic ? shapeArabic(it.description) : it.description, { x: 50, y, size: 10, font: regularFont });
    page.drawText(String(it.quantity), { x: 300, y, size: 10, font: regularFont });
    page.drawText(fmt(it.unitPrice), { x: 350, y, size: 10, font: regularFont });
    page.drawText(fmt(it.lineTotal), { x: 460, y, size: 10, font: regularFont });
    y -= 14;
  });

  /* ---------- Totals ---------- */
  y -= 10;
  page.drawLine({
    start: { x: 350, y },
    end: { x: 550, y },
    thickness: 1,
    color: rgb(0.8, 0.8, 0.8),
  });
  y -= 14;

  const drawLabelVal = (label: string, val: any) => {
    page.drawText(label, { x: 350, y, size: 10, font: regularFont });
    page.drawText(fmt(val), { x: 480, y, size: 10, font: regularFont });
    y -= 14;
  };
  drawLabelVal(isArabic ? shapeArabic("الإجمالي:") : "Subtotal:", invoice.subtotal);
  if (toNumber(invoice.discount) > 0)
    drawLabelVal(isArabic ? shapeArabic("الخصم:") : "Discount:", -toNumber(invoice.discount));
  if (toNumber(invoice.tax) > 0)
    drawLabelVal(isArabic ? shapeArabic("الضريبة:") : "Tax:", toNumber(invoice.tax));

  page.drawLine({
    start: { x: 350, y },
    end: { x: 550, y },
    thickness: 1,
    color: rgb(0.8, 0.8, 0.8),
  });
  y -= 16;
  page.drawText(isArabic ? shapeArabic("المجموع:") : "Total:", {
    x: 350,
    y,
    size: 12,
    font: boldFont,
  });
  page.drawText(fmt(invoice.total), {
    x: 480,
    y,
    size: 12,
    font: boldFont,
  });

  /* ---------- output ---------- */
  const bytes = await pdfDoc.save();
  return new NextResponse(bytes, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename=invoice_${invoice.invoiceNumber}.pdf`,
    },
  });
}