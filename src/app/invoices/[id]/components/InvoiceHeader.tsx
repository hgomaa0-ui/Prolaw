"use client";

import { Invoice } from '@/types/invoice';
import { useEffect, useState } from 'react';
import { getAuth } from '@/lib/auth';
// removed static FIRM_INFO
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';

type Lang = 'EN' | 'AR';

interface CompanyInfo{ name:string; address?:string; phone?:string; logoUrl?:string; }
interface InvoiceHeaderProps {
  invoice: Invoice;
}

export function InvoiceHeader({ invoice }: InvoiceHeaderProps) {
  const [company,setCompany]=useState<CompanyInfo|null>(null);
  const { t } = useTranslation();
  useEffect(()=>{
    const token=getAuth();
    fetch('/api/company',{headers:{Authorization:`Bearer ${token}`}})
      .then(r=>r.json()).then(setCompany);
  },[]);
  const formatDate = (dateStr: string, lang: Lang) => {
    const locale = lang === 'AR' ? 'ar-EG' : 'en-US';
    return format(new Date(dateStr), 'dd MMM yyyy', { locale: undefined }); // simple format
  };

  return (
    <div className="p-6 border-b">
      {/* Company & Invoice meta */}
      <div className="flex justify-between items-start mb-6">
        {/* Company */}
        {company && (
          <div className="max-w-xs">
            <h2 className="text-xl font-extrabold uppercase tracking-wide mb-2">{company.name}</h2>
            {company.logoUrl && <img src={company.logoUrl} alt="logo" width={120} height={120} className="mb-2 object-contain"/>}
                                  </div>
        )}
        {/* Invoice meta */}
        <div className="text-right space-y-1">
          <h1 className="text-3xl font-bold">{t('invoice', { lng: invoice.language })} {invoice.invoiceNumber}</h1>
          <p className="text-gray-600">{t('issueDate', { lng: invoice.language })}: {formatDate(invoice.issueDate, invoice.language)}</p>
          {invoice.dueDate && (
            <p className="text-gray-600">{t('dueDate', { lng: invoice.language })}: {formatDate(invoice.dueDate!, invoice.language)}</p>
          )}
          <p className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${
            invoice.status === 'DRAFT' ? 'bg-yellow-100 text-yellow-800' :
            invoice.status === 'SENT' ? 'bg-orange-100 text-orange-800' :
            'bg-green-100 text-green-800'
          }`}>
            {invoice.status}
          </p>
        </div>
      </div>
    </div>
  );
}
