import { prisma } from "./prisma";

/**
 * Generate a new unique invoice number in format INV-00001.
 * Uses count of existing invoices + 1. Not concurrency-safe but acceptable for low volume.
 */
export async function generateInvoiceNumber() {
  // fetch last invoice ordered by numeric part, fallback to count
  const last = await prisma.invoice.findFirst({
    orderBy: { id: 'desc' },
    select: { invoiceNumber: true },
  });
  let nextNum = 1;
  if (last?.invoiceNumber) {
    const m = last.invoiceNumber.match(/(\d+)/);
    if (m) {
      const n = parseInt(m[1], 10);
      if (!isNaN(n)) nextNum = n + 1;
    }
  }
  // ensure uniqueness in case of concurrent creation
  while (true) {
    const candidate = `INV-${nextNum.toString().padStart(5, '0')}`;
    const exists = await prisma.invoice.findUnique({ where: { invoiceNumber: candidate } });
    if (!exists) return candidate;
    nextNum += 1;
  }
}
