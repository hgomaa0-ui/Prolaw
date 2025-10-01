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

  /* رأس الشركة */
  const FIRM_NAME = company?.name || process.env.NEXT_PUBLIC_FIRM_NAME || (isArabic ? 'اسم شركتك' : 'Your Firm');
  page.drawText(isArabic ? shape(FIRM_NAME) : FIRM_NAME, { x: 50, y: 800, size: 16, font: boldFont });

  /* … نفس بقية الرسم الموجود سابقاً … */

  return pdfDoc.save();
}

function shape(t: string) {
  return reshaper.ArabicShaper.convertArabic(t).split('').reverse().join('');
}