"use client";

import { Invoice } from '@/types/invoice';
import { formatMoney } from '@/utils/formatMoney';
import { useTranslation } from 'react-i18next';

interface InvoiceItemsProps {
  invoice: Invoice;
}

export function InvoiceItems({ invoice }: InvoiceItemsProps) {
  const { t } = useTranslation();
  const fmt = (n: number | string) => formatMoney(Number(n), invoice.currency);
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              {t('description', { lng: invoice.language })}
              
            </th>
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
               {t('quantity', { lng: invoice.language })}
             </th>
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
              {t('unitPrice', { lng: invoice.language })}
            </th>
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
              {t('amount', { lng: invoice.language })}
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {invoice.items?.map((item, index) => (
            <tr key={index} className="hover:bg-gray-50">
              <td className="px-6 py-4 whitespace-nowrap">
                <p className="text-sm font-medium text-gray-900">{item.description}</p>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-right">
                <p className="text-sm text-gray-900">{item.quantity}</p>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-right">
                <p className="text-sm text-gray-900">{fmt(item.unitPrice)}</p>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-right font-semibold">
                <p className="text-sm text-gray-900">{fmt(item.quantity * item.unitPrice)}</p>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
