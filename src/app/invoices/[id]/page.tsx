'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Invoice } from '@/types/invoice';
import { Toaster, toast } from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { InvoiceHeader } from './components/InvoiceHeader';
import { InvoiceDetails } from './components/InvoiceDetails';
import { ClientInfo } from './components/ClientInfo';
import { InvoiceItems } from './components/InvoiceItems';
import { InvoiceTotals } from './components/InvoiceTotals';
import InvoiceFooter from './components/InvoiceFooter';
import InvoiceNotes from './components/InvoiceNotes';
import { getAuth } from '@/lib/auth';

export default function InvoicePage() {
  const { t, i18n } = useTranslation(['common', 'invoices']);
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [role,setRole]=useState<string|null>(null);
  const router = useRouter();
  const params = useParams();



  const handleSendEmail = async (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    try {
      const clientEmail = invoice?.client?.email || (invoice?.client as any)?.contactEmail;
      if (!clientEmail) {
        toast.error('Client email is required');
        console.log('Invoice data:', invoice);
        return;
      }

      const response = await fetch(`/api/invoices/${params.id}/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getAuth()}`
        },
        body: JSON.stringify({
          toEmail: clientEmail
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.message || `Failed to send email (HTTP ${response.status})`;
        throw new Error(errorMessage);
      }

      toast.success('Invoice sent successfully');
    } catch (error: any) {
      console.error('Error sending email:', error);
      toast.error(error.message || 'Failed to send email');
    }
  };

  const handleDownloadPDF = async (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    try {
      const token = getAuth();
      const headers: Record<string, string> = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const response = await fetch(`/api/invoices/${params.id}/pdf`, { headers });

      if (!response.ok) {
        throw new Error('Failed to generate PDF');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `invoice-${invoice?.invoiceNumber}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success('PDF downloaded successfully');
    } catch (error) {
      console.error('Error downloading PDF:', error);
      toast.error('Failed to download PDF');
    }
  };

  const handleApproveInvoice = async () => {
    if(!invoice) return;
    try{
      const res = await fetch(`/api/invoices/${invoice.id}/approve`,{
        method:'POST',
        headers:{'Authorization':`Bearer ${getAuth()}`}
      });
      if(!res.ok){
        const err = await res.json().catch(()=>({}));
        throw new Error(err.error||`Failed (${res.status})`);
      }
      const updated = await res.json();
      setInvoice(updated);
      toast.success('Invoice approved');
    }catch(e:any){
      toast.error(e.message||'Error');
    }
  };

  const handleTrustPayment = async () => {
    if (!invoice) return;
    try {
      const res = await fetch(`/api/invoices/${invoice.id}/trust`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${getAuth()}`,
        },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Failed (HTTP ${res.status})`);
      }
      const updated = await res.json();
      setInvoice(updated);
      toast.success('Trust payment applied');
    } catch (e:any) {
      console.error('Trust payment error', e);
      toast.error(e.message || 'Error');
    }
  };

  useEffect(()=>{
    // decode role from stored JWT
    const token=getAuth();
    if(token){
      try{
        const payload=JSON.parse(atob(token.split('.')[1]));
        setRole(payload.role||null);
      }catch{}
    }
  },[]);

  useEffect(() => {
    fetchInvoice();
  }, [params.id]);

  const fetchInvoice = async () => {
    console.log('params.id in InvoicePage:', params.id);
    try {
      const token = getAuth();
      const res = await fetch(`/api/invoices/${params.id}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Failed to fetch invoice (HTTP ${res.status})`);
      }
      const data = await res.json();
      console.log('Fetched invoice data:', data); // Add this line for debugging
      setInvoice(data);
      // Sync i18n language with invoice language
      if (data.language && i18n && (i18n as any).changeLanguage) {
        const lang = data.language.toLowerCase();
        if ((i18n as any).language !== lang) {
          (i18n as any).changeLanguage(lang);
        }
      }
    } catch (error) {
      console.error('Error fetching invoice:', error);
      toast.error('Failed to load invoice');
      router.push('/invoices');
    }
  };

  if (!invoice) return <div className="flex items-center justify-center h-screen">{t('view.loading', { ns: 'invoices' })}</div>;

  return (
    <div className="container mx-auto p-6" dir={i18n.language === 'ar' ? 'rtl' : 'ltr'}>
      <div className="flex justify-between items-center mb-6">
        <button
          onClick={() => router.push('/invoices')}
          className="text-blue-600 underline text-sm"
        >
          {t('view.back', { ns: 'invoices' })}
        </button>
        <div className="flex gap-4">
          <button
            onClick={handleSendEmail}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
          >
            {t('view.sendEmail', { ns: 'invoices' })}
          </button>
          <button
            onClick={handleDownloadPDF}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded"
          >
            {t('view.downloadPdf', { ns: 'invoices' })}
          </button>
          {invoice && invoice.status==='DRAFT' && ((role==='ACCOUNTANT_MASTER'||role==='ADMIN')) && (
            <button onClick={handleApproveInvoice} className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded">Approve</button>
          )}
          {invoice && invoice.status !== 'DRAFT' && invoice.status !== 'PAID' && (
            <button
              onClick={handleTrustPayment}
              className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded"
            >
              Trust
            </button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <InvoiceHeader invoice={invoice} />
        <InvoiceDetails invoice={invoice} />
        <ClientInfo invoice={invoice} />
        <InvoiceItems invoice={invoice} />
        <InvoiceTotals invoice={invoice} />
        <InvoiceFooter />
          <InvoiceNotes notes={invoice.notes} terms={invoice.terms} />
      </div>

      <Toaster position="top-right" />
    </div>
  );
}