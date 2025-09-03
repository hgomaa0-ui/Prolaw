"use client";

import { useRouter, useParams } from 'next/navigation';
import { InvoiceForm } from '@/components/invoice/InvoiceForm';
import { useSWRConfig } from 'swr';
import { useInvoiceData } from '@/hooks/useInvoiceData';
import { useTranslation } from 'react-i18next';
import { toast, Toaster } from 'react-hot-toast';
import { getAuth } from '@/utils/auth';
import { Invoice } from '@/types/invoice';

export default function InvoiceEditPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const { mutate } = useSWRConfig();
  const { t } = useTranslation(['common', 'invoices']);

  const {
    loading,
    invoice,
    selectedClient,
    selectedProject,
    clientsData,
    filteredProjects,
  } = useInvoiceData(id);


  const handleSave = async (data: Partial<Invoice>) => {
    try {
      const tokenStr: string = typeof window !== 'undefined' ? (localStorage.getItem('token') || '') : ((await getAuth()) as any)?.token || '';

      const res = await fetch(`/api/invoices/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(tokenStr ? { Authorization: `Bearer ${tokenStr}` } : {}),
        },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to update invoice');
      const updatedInv: any = await res.json();

      // If marked as PAID create payment entry
      if (data.status === 'PAID' && (data as any).bankId) {
        const payRes = await fetch('/api/payments', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(tokenStr ? { Authorization: `Bearer ${tokenStr}` } : {}),
          },
          body: JSON.stringify({ invoiceId: Number(updatedInv?.id || 0), source: 'OPERATING', bankId: Number((data as any).bankId), amount: Number(updatedInv?.total || 0) }),
        });
        if(!payRes.ok){
          const errJson = await payRes.json().catch(()=>({}));
          throw new Error(errJson.error || 'Payment failed');
        }
      }

      toast.success(t('common.save'));
      // invalidate cached invoices list so totals refresh
      mutate('/api/invoices');
      router.push('/invoices');
    } catch (err: any) {
      toast.error(err.message || t('common.error'));
    }
  };

  const handleCancel = () => router.push('/invoices');

  return (
    <div className="flex flex-col h-full">
      <div className="container mx-auto p-4 flex-1">
        <h1 className="text-2xl font-bold mb-4">{t('edit.title', { ns: 'invoices' })}</h1>
        {loading && <p>{t('common.loading')}</p>}
        {invoice && (
          <InvoiceForm
            invoice={invoice}
            onSubmit={handleSave}
            onCancel={handleCancel}
            loading={loading}
            clients={clientsData}
            projects={filteredProjects}
            selectedClient={selectedClient}
            selectedProject={selectedProject}
          />
        )}
      </div>
      <Toaster position="top-right" />
    </div>
  );
}