import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import * as reshaper from 'arabic-persian-reshaper';
type Invoice = any;  // ضع النوع الحقيقي إن أردت

export async function buildInvoicePdf(
  invoice: Invoice,
  company: any,
  origin: string
): Promise<Uint8Array> {
  const isArabic = (invoice.language || '').toLowerCase() === 'ar';
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595, 842]);

  /* حمّل الخطوط */
  let regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
  let boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const currency = invoice.currency || 'USD';
  const toNumber = (v: any) => {
    if (typeof v === 'number') return v;
    if (typeof v === 'string') return parseFloat(v);
    if (v && typeof v === 'object' && 'toNumber' in v) {
      try { return (v as any).toNumber(); } catch {}
    }
    return parseFloat(String(v));
  };
  const fmt = (v: any) => toNumber(v).toLocaleString('en-US', { style: 'currency', currency });
  const formatDate = (d: any) => d ? new Date(d).toLocaleDateString('en-US') : '';


  /* ---------- Header ---------- */
  const FIRM_NAME = company?.name || process.env.NEXT_PUBLIC_FIRM_NAME || (isArabic ? 'اسم شركتك' : 'Your Firm');
    page.drawText(isArabic ? shape(FIRM_NAME) : FIRM_NAME, { x: 50, y: 800, size: 16, font: boldFont });
  const FIRM_ADDRESS = company?.address || '';
  const FIRM_CONTACT = company?.phone || '';
  page.drawText(isArabic ? shape(FIRM_ADDRESS) : FIRM_ADDRESS, { x: 50, y: 784, size: 10, font: regularFont });
  page.drawText(isArabic ? shape(FIRM_CONTACT) : FIRM_CONTACT, { x: 50, y: 770, size: 10, font: regularFont });

  /* ---------- Invoice info ---------- */
  page.drawText(isArabic ? shape('INVOICE') : 'INVOICE', { x: 450, y: 800, size: 20, font: boldFont });
  page.drawText(isArabic ? shape(`No: ${invoice.invoiceNumber}`) : `No: ${invoice.invoiceNumber}`, { x: 450, y: 784, size: 10, font: regularFont });
  page.drawText(isArabic ? shape(`Issue: ${formatDate(invoice.issueDate)}`) : `Issue: ${formatDate(invoice.issueDate)}`, { x: 450, y: 770, size: 10, font: regularFont });
  page.drawText(isArabic ? shape(`Due: ${formatDate(invoice.dueDate)}`) : `Due: ${formatDate(invoice.dueDate)}`, { x: 450, y: 756, size: 10, font: regularFont });

  /* ---------- Client block ---------- */
  page.drawText(isArabic ? shape('Bill To:') : 'Bill To:', { x: 50, y: 730, size: 12, font: boldFont });
  const clientName = invoice.client?.name || '-';
  page.drawText(isArabic ? shape(clientName) : clientName, { x: 50, y: 716, size: 11, font: regularFont });

  /* ---------- Table Headers ---------- */
  let y = 680;
  const headers = isArabic ? [shape('Description'), shape('Qty'), shape('Unit'), shape('Total')] : ['Description', 'Qty', 'Unit Price', 'Line Total'];
  [50, 300, 350, 460].forEach((x, i) => page.drawText(headers[i], { x, y, size: 11, font: boldFont }));
  y -= 12;
  page.drawLine({ start: { x: 50, y }, end: { x: 550, y }, thickness: 1, color: rgb(0.8,0.8,0.8) });
  y -= 12;

  /* ---------- Rows ---------- */
  invoice.items.forEach((it: any) => {
    page.drawText(isArabic ? shape(it.description) : it.description, { x: 50, y, size: 10, font: regularFont });
    page.drawText(String(it.quantity), { x: 300, y, size: 10, font: regularFont });
    page.drawText(fmt(it.unitPrice), { x: 350, y, size: 10, font: regularFont });
    page.drawText(fmt(it.lineTotal), { x: 460, y, size: 10, font: regularFont });
    y -= 14;
  });

  /* ---------- Totals ---------- */
  y -= 10;
  page.drawLine({ start: { x: 350, y }, end: { x: 550, y }, thickness: 1, color: rgb(0.8,0.8,0.8) });
  y -= 14;
  const drawLabelVal = (label: string, val: any) => {
    page.drawText(label, { x: 350, y, size: 10, font: regularFont });
    page.drawText(fmt(val), { x: 480, y, size: 10, font: regularFont });
    y -= 14;
  };
  drawLabelVal(isArabic ? shape('Subtotal:') : 'Subtotal:', invoice.subtotal || 0);
  if (invoice.discount) drawLabelVal(isArabic ? shape('Discount:') : 'Discount:', -toNumber(invoice.discount));
  if (invoice.tax) drawLabelVal(isArabic ? shape('Tax:') : 'Tax:', toNumber(invoice.tax));
  page.drawLine({ start: { x: 350, y }, end: { x: 550, y }, thickness: 1, color: rgb(0.8,0.8,0.8) });
  y -= 16;
  page.drawText(isArabic ? shape('Total:') : 'Total:', { x: 350, y, size: 12, font: boldFont });
  page.drawText(fmt(invoice.total || 0), { x: 480, y, size: 12, font: boldFont });

  return pdfDoc.save();
}

function shape(t: string) {
  return reshaper.ArabicShaper.convertArabic(t).split('').reverse().join('');
}