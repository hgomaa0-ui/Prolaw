'use client';

import { useState, useEffect } from 'react';
import { getAuth } from '@/lib/auth';
import toast, { Toaster } from 'react-hot-toast';
import { useRouter } from 'next/navigation';
import { Invoice } from '@/types/invoice';
import { useTranslation, formatDate, formatMoney } from '@/lib/i18n';
import { enUS } from 'date-fns/locale';
import { format as formatDateFn } from 'date-fns';
import Link from 'next/link';

export default function InvoicesPage() {
  const { t } = useTranslation('invoices');
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [tempStatus, setTempStatus] = useState<string>('DRAFT');
  const router = useRouter();

  useEffect(() => {
    fetchInvoices();
  }, []);

  const token = getAuth();

  const fetchInvoices = async () => {
    try {
      const res = await fetch('/api/invoices', { headers: token ? { Authorization: `Bearer ${token}` } : undefined });
      const data = await res.json();
      setInvoices(data);
    } catch (error) {
      console.error('Error fetching invoices:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this invoice?')) return;
    try {
      const res = await fetch(`/api/invoices/${id}`, {
        method: 'DELETE',
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Failed to delete (HTTP ${res.status})`);
      }
      toast.success('Invoice deleted');
      setInvoices(prev => prev.filter(inv => inv.id !== id));
    } catch (err) {
      console.error(err);
      toast.error((err as Error).message || 'Delete failed');
    }
  };

  const startEdit = (inv: Invoice) => {
    setEditingId(inv.id);
    setTempStatus(inv.status);
  };

  const cancelEdit = () => {
    setEditingId(null);
  };

  const saveEdit = async (id: string) => {
    try {
      const res = await fetch(`/api/invoices/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ status: tempStatus }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Failed to update (HTTP ${res.status})`);
      }
      const updated = await res.json();
      setInvoices(prev => prev.map(inv => inv.id === id ? updated : inv));
      toast.success('Invoice updated');
    } catch (err) {
      console.error(err);
      toast.error((err as Error).message || 'Update failed');
    } finally {
      cancelEdit();
    }
  };

  // Accountant approve invoice with currency selection
  const approveInvoice = async (id: string) => {
    const currency = prompt('Select currency code (e.g. USD, EUR, SAR):');
    if (!currency) return;
    try {
      const res = await fetch(`/api/invoices/${id}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ currency }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Failed to approve (HTTP ${res.status})`);
      }
      const updated = await res.json();
      setInvoices(prev => prev.map(inv => inv.id === id ? updated : inv));
      toast.success('Invoice approved');
    } catch (err) {
      console.error(err);
      toast.error((err as Error).message || 'Approve failed');
    }
  };

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Invoices</h1>
      
      <div className="flex justify-between items-center mb-6">
        <div className="flex gap-2">
          <Link
            href="/dashboard/clients"
            className="text-blue-600 hover:text-blue-800"
          >
            Clients
          </Link>
          <button
            onClick={() => router.push('/dashboard/invoices/new') }
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            New Invoice
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('headers.number')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('headers.client')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Project
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('headers.issueDate')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('headers.status')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Bank</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('headers.total')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('headers.actions')}
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {invoices.map((invoice) => (
              <tr key={invoice.id}>
                <td className="px-6 py-4 whitespace-nowrap">
                  {invoice.invoiceNumber}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {invoice.client?.name}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {invoice.project?.name || '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {formatDate(invoice.issueDate, invoice.language)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {editingId === invoice.id ? (
                    <select
                      value={tempStatus}
                      onChange={(e) => setTempStatus(e.target.value)}
                      className="border rounded px-2 py-1 text-sm"
                    >
                      <option value="DRAFT">DRAFT</option>
                      <option value="SENT">SENT</option>
                      <option value="PAID">PAID</option>
                    </select>
                  ) : (
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      invoice.status === 'DRAFT' ? 'bg-yellow-100 text-yellow-800' :
                      invoice.status === 'SENT' ? 'bg-orange-100 text-orange-800' :
                      'bg-green-100 text-green-800'
                    }`}>
                      {invoice.status}
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">{invoice.bank?.name || '-'}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {formatMoney(invoice.total, invoice.currency, invoice.language)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium flex gap-2">
                  {editingId === invoice.id ? (
                    <>
                      <button
                        onClick={() => saveEdit(invoice.id as string)}
                        className="text-green-600 hover:text-green-800"
                      >
                        Save
                      </button>
                      <button
                        onClick={cancelEdit}
                        className="text-gray-600 hover:text-gray-800"
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => router.push(`/invoices/${invoice.invoiceNumber}`)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        View
                      </button>
                      <button
                        onClick={() => router.push(`/invoices/${invoice.invoiceNumber}/edit`)}
                        className="bg-indigo-600 text-white px-3 py-1 rounded hover:bg-indigo-700"
                      >
                        Edit
                      </button>
                      {(invoice.status as any) === 'PENDING_APPROVAL' && (
                        <button
                          onClick={() => approveInvoice(invoice.id as string)}
                          className="text-green-600 hover:text-green-900"
                        >
                          Approve
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(invoice.id as string)}
                        className="text-red-600 hover:text-red-900"
                      >
                        Delete
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <Toaster position="top-right" />
      </div>
    </div>
  );
}
