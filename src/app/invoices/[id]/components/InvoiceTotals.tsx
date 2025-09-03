"use client";

import { Invoice } from '@/types/invoice';
import { formatMoney } from '@/utils/formatMoney';
import { useTranslation } from 'react-i18next';

interface InvoiceTotalsProps {
  invoice: Invoice;
}

export function InvoiceTotals({ invoice }: InvoiceTotalsProps) {
  const { t } = useTranslation();
  const fmt = (n: number | string) => formatMoney(Number(n), invoice.currency);
  return (
    <div className="p-6">
      <div className="flex justify-end">
        <div className="space-y-2 bg-gray-50 rounded-lg shadow-sm p-6 w-64">
          <div className="flex justify-between">
            <p className="text-gray-600">{t('subtotal', { lng: invoice.language })}:</p>
            <p className="font-medium">{fmt(invoice.subtotal || 0)}</p>
          </div>
          <div className="flex justify-between">
            <p className="text-gray-600">{t('discount', { lng: invoice.language })}:</p>
            <p className="font-medium">{fmt(invoice.discount || 0)}</p>
          </div>
          <div className="flex justify-between">
            <p className="text-gray-600">{t('tax', { lng: invoice.language })}:</p>
            <p className="font-medium">{fmt(invoice.tax || 0)}</p>
          </div>
          {invoice.trustDeducted && parseFloat(String(invoice.trustDeducted)) > 0 && (
            <div className="flex justify-between">
              <p className="text-gray-600">{t('trustDeduction', { lng: invoice.language })}:</p>
              <p className="font-medium text-red-600">- {fmt(parseFloat(String(invoice.trustDeducted)))}</p>
            </div>
          )}
          <div className="border-t pt-4">
            <div className="flex justify-between">
              <p className="text-lg font-bold">{t('total', { lng: invoice.language })}:</p>
              <p className="text-lg font-bold">{fmt(invoice.total || 0)}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
