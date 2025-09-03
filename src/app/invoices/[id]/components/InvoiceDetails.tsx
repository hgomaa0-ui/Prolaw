import { Invoice } from '@/types/invoice';

interface InvoiceDetailsProps {
  invoice: Invoice;
}

export function InvoiceDetails({ invoice }: InvoiceDetailsProps) {
  // لم يعد مطلوبًا عرض الخصم أو الضريبة هنا
  return null;

}
