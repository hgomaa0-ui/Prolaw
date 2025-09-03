"use client";

import { useState, useEffect, useRef } from 'react';
import { Invoice, InvoiceItem } from '@/types/invoice';
import { formatMoney } from '@/lib/i18n';
import { useTranslation as useRT } from 'react-i18next';
import { useTranslation } from 'react-i18next';

interface InvoiceFormProps {
  invoice: Partial<Invoice>;
  onSubmit: (invoice: Partial<Invoice>) => Promise<void>;
  onCancel: () => void;
  loading: boolean;
  clients: Array<{ id: string; name: string }>;
  projects: Array<{ id: string; name: string }>;
  selectedClient: string;
  selectedProject: string;
}

export const InvoiceForm = ({
  invoice,
  onSubmit,
  onCancel,
  loading,
  clients,
  projects,
  selectedClient,
  selectedProject
}: InvoiceFormProps) => {
  const { t, i18n } = useRT(['common', 'invoices']);
  const { t: translate } = useTranslation();

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const payload: any = { ...formData, items: formData.items };
    if (useTrust) {
      payload.trustAmount = (formData as any).trustAmount ?? maxTrust;
    } else {
      payload.trustAmount = 0;
    }
    onSubmit(payload);
  };

  // لا حاجة لتنفيذ أي شيء هنا، يتم التعامل معه في useInvoiceData
  const handleClientChange = () => {};

  // لا حاجة لتنفيذ أي شيء هنا، يتم التعامل معه في useInvoiceData
  const handleProjectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    handleChange('projectId', e.target.value);
  };

  // local editable copy
  const [trustBalance, setTrustBalance] = useState<number>(0);
  const [useTrust, setUseTrust] = useState(false);

  const [formData, setFormData] = useState<Partial<Invoice>>({
    ...invoice,
    language: (invoice.language as any)?.toString().toLowerCase() || 'en',
    projectId: invoice.projectId ? String(invoice.projectId) : ''
  });

  // sync whenever invoice prop changes (after fetch)
  useEffect(() => {
    if (!invoice) return;
    setFormData({
      ...invoice,
      language: (invoice.language as any)?.toString().toLowerCase() || 'en',
      status: invoice.status || 'DRAFT',
      projectId: invoice.projectId ? String(invoice.projectId) : '',
      bankId: (invoice as any).bankId ? String((invoice as any).bankId) : ''
    });
  }, [invoice]);

  // fetch trust balance when client/project/currency changes
  useEffect(() => {
    if (!formData.clientId || !formData.currency) return;
    const url = `/api/trust-accounts?clientId=${formData.clientId}&currency=${formData.currency}${formData.projectId ? `&projectId=${formData.projectId}` : ''}`;
    fetch(url, {
      credentials: 'include',
      headers: {
        Authorization: typeof window !== 'undefined' ? `Bearer ${localStorage.getItem('token') || ''}` : '',
      },
    })
      .then((r) => r.json())
      .then((arr) => {
        if (Array.isArray(arr) && arr.length) {
          setTrustBalance(Number(arr[0].balance) || 0);
        } else {
          // fallback to client-level account
          fetch(`/api/trust-accounts?clientId=${formData.clientId}&currency=${formData.currency}`, {
            credentials: 'include',
            headers: {
              Authorization: typeof window !== 'undefined' ? `Bearer ${localStorage.getItem('token') || ''}` : '',
            },
          })
            .then((r2) => r2.json())
            .then((arr2) => {
              if (Array.isArray(arr2) && arr2.length) setTrustBalance(Number(arr2[0].balance) || 0);
              else setTrustBalance(0);
            })
            .catch(() => setTrustBalance(0));
        }
      })
      .catch(() => setTrustBalance(0));
  }, [formData.clientId, formData.projectId, formData.currency]);

  // fetch banks once
  const [banks, setBanks] = useState<Array<{id:number,name:string,currency:string}>>([]);
  useEffect(()=>{
    const tok = typeof window !== 'undefined' ? localStorage.getItem('token') || '' : '';
    fetch(`/api/banks${invoice.companyId?`?companyId=${invoice.companyId}`:''}`, {
      credentials: 'include',
      headers: tok ? { Authorization: `Bearer ${tok}` } : {}
    })
      .then(r=>r.json())
      .then((d)=>setBanks(Array.isArray(d)?d:(d?.data||[])))
      .catch(()=>{});
  },[]);

  const handleChange = (field: keyof Invoice, value: any) => {
    if (field === 'language') {
      i18n.changeLanguage(value);
    }
    if (field === 'discount' || field === 'tax') {
      setFormData((prev) => ({ ...prev, [field]: parseFloat(value) }));
    } else {
      setFormData((prev) => ({ ...prev, [field]: value }));
    }
  };

  const handleItemChange = (index: number, key: keyof InvoiceItem, value: any) => {
    const items = [...(formData.items || [])];
    items[index] = { ...items[index], [key]: value };
    handleChange('items', items as any);
  };

  const addItem = () => {
    handleChange('items', [...(formData.items || []), { description: '', quantity: 1, unitPrice: 0 }]);
  };

  const removeItem = (index: number) => {
    const items = [...(formData.items || [])];
    items.splice(index, 1);
    handleChange('items', items as any);
  };

  // computed totals
  const subtotal = (formData.items || []).reduce((sum, it) => sum + (it.quantity || 0) * (it.unitPrice || 0), 0);
  const discountAmt = ((formData.discount || 0) / 100) * subtotal;
  const taxAmt = ((formData.tax || 0) / 100) * (subtotal - discountAmt);
  const total = subtotal - discountAmt + taxAmt;
  const maxTrust = Math.min(trustBalance, total);

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Client Select */}
      <div>
        <label className="block text-sm font-medium text-gray-700">
          {t('edit.fields.client', { ns: 'invoices' })}
        </label>
        <select
          value={selectedClient}
          onChange={handleClientChange}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          required
        >
          <option value="">{t('edit.selectClient', { ns: 'invoices' })}</option>
          {clients.map((client) => (
            <option key={client.id} value={client.id}>
              {client.name}
            </option>
          ))}
        </select>
      </div>

      {/* Project Select */}
      <div>
        <label className="block text-sm font-medium text-gray-700">
          {t('edit.fields.project', { ns: 'invoices' })}
        </label>
        <select
          value={formData.projectId || ''}
          onChange={handleProjectChange}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          required
        >
          <option value="">{t('edit.selectProject', { ns: 'invoices' })}</option>
          {projects.map((project) => (
            <option key={project.id} value={project.id}>
              {project.name}
            </option>
          ))}
        </select>
      </div>

      {/* Status */}
      <div>
        <label className="block text-sm font-medium text-gray-700">
          {t('edit.status', { ns: 'invoices' })}
        </label>
        <select
          value={formData.status || 'DRAFT'}
          onChange={(e) => handleChange('status', e.target.value)}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
        >
          <option value="DRAFT">DRAFT</option>
          <option value="SENT">SENT</option>
          <option value="PAID">PAID</option>
        </select>
      </div>

      {/* Bank Selector when PAID */}
      {formData.status==='PAID' && (
        <div>
          <label className="block text-sm font-medium text-gray-700">Bank</label>
          <select
            value={(formData as any).bankId || ''}
            onChange={(e)=>handleChange('bankId' as any, e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            required
          >
            <option value="">-- Select Bank --</option>
            {Array.isArray(banks) && banks.map(b=> (
              <option key={b.id} value={b.id}>{b.name} ({b.currency})</option>
            ))}
          </select>
        </div>
      )}

      {/* Language & Currency */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">
            {t('edit.fields.language', { ns: 'invoices' })}
          </label>
          <select
            value={formData.language || 'en'}
            onChange={(e) => handleChange('language', e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          >
            <option value="en">English</option>
            <option value="ar">العربية</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">
            {t('edit.fields.currency', { ns: 'invoices' })}
          </label>
          <select
            value={formData.currency || 'USD'}
            onChange={(e) => handleChange('currency', e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          >
            {['USD','EUR','GBP','SAR','EGP','AED','QAR','KWD','OMR','JPY','CNY','INR'].map(cur=> (
              <option key={cur} value={cur}>{cur}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Dates */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">
            {t('edit.fields.issueDate', { ns: 'invoices' })}
          </label>
          <input
            type="date"
            value={formData.issueDate?.substring(0, 10) || ''}
            onChange={(e) => handleChange('issueDate', e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">
            {t('edit.fields.dueDate', { ns: 'invoices' })}
          </label>
          <input
            type="date"
            value={formData.dueDate?.substring(0, 10) || ''}
            onChange={handleProjectChange}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          />
        </div>
      </div>

      {/* Discount & Tax */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">
            {t('edit.fields.discount', { ns: 'invoices' })} (%)
          </label>
          <input
            type="number"
            min="0"
            max="100"
            value={formData.discount ?? 0}
            onChange={(e) => handleChange('discount', parseFloat(e.target.value))}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">
            {t('edit.fields.tax', { ns: 'invoices' })} (%)
          </label>
          <input
            type="number"
            min="0"
            max="100"
            value={formData.tax ?? 0}
            onChange={(e) => handleChange('tax', parseFloat(e.target.value))}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          />
        </div>
      </div>

      {/* Invoice Items */}
      <div>
        <h3 className="text-lg font-semibold mb-2">{t('edit.fields.items', { ns: 'invoices' })}</h3>
        <table className="min-w-full border divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('edit.fields.description', { ns: 'invoices' })}
              </th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('edit.fields.quantity', { ns: 'invoices' })}
              </th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('edit.fields.unitPrice', { ns: 'invoices' })}
              </th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('edit.fields.total', { ns: 'invoices' })}
              </th>
              <th></th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {(formData.items || []).map((item, idx) => (
              <tr key={idx}>
                <td className="px-3 py-2">
                  <input
                    type="text"
                    value={item.description}
                    onChange={(e) => handleItemChange(idx, 'description', e.target.value)}
                    className="w-full border-gray-300 rounded-md"
                  />
                </td>
                <td className="px-3 py-2">
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={item.quantity}
                    onChange={(e) => handleItemChange(idx, 'quantity', parseFloat(e.target.value))}
                    className="w-full border-gray-300 rounded-md"
                  />
                </td>
                <td className="px-3 py-2">
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={item.unitPrice}
                    onChange={(e) => handleItemChange(idx, 'unitPrice', parseFloat(e.target.value))}
                    className="w-full border-gray-300 rounded-md"
                  />
                </td>
                <td className="px-3 py-2 text-right">
                  {formatMoney(item.quantity * item.unitPrice, formData.currency || 'USD')}
                </td>
                <td className="px-3 py-2 text-right">
                  <button type="button" onClick={() => removeItem(idx)} className="text-red-600">
                    {t('remove', { ns: 'common' })}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <button
          type="button"
          onClick={addItem}
          className="mt-2 text-indigo-600 hover:underline"
        >
          {t('edit.addItem', { ns: 'invoices' })}
        </button>
      </div>

      {/* Trust Payment */}
      {trustBalance > 0 && (
        <div className="border p-4 rounded-md bg-gray-50">
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={useTrust}
              onChange={(e) => setUseTrust(e.target.checked)}
            />
            <span>{t('edit.useTrust', { ns: 'invoices' })} ( {formatMoney(trustBalance, formData.currency || 'USD', formData.language || 'en')} )</span>
          </label>
          {useTrust && (
            <input
              type="number"
              min="0"
              max={maxTrust}
              step="0.01"
              // @ts-ignore - trustAmount is transient UI field
              value={(formData as any).trustAmount ?? maxTrust}
              onChange={(e) => handleChange('trustAmount' as any, parseFloat(e.target.value))}
              className="mt-2 w-full border-gray-300 rounded-md"
            />
          )}
        </div>
      )}

      {/* Totals */}
      <div className="text-right space-y-1">
        <p>
          {t('edit.subtotal', { ns: 'invoices' })}: {formatMoney(subtotal, formData.currency || 'USD', formData.language || 'en')}
        </p>
        <p>
          {t('edit.discount', { ns: 'invoices' })} ({formData.discount || 0}%): -
          {formatMoney(discountAmt, formData.currency || 'USD', formData.language || 'en')}
        </p>
        <p>
          {t('edit.tax', { ns: 'invoices' })} ({formData.tax || 0}%): {formatMoney(taxAmt, formData.currency || 'USD', formData.language || 'en')}
        </p>
        <p className="font-bold">
          {t('edit.total', { ns: 'invoices' })}: {formatMoney(total, formData.currency || 'USD', formData.language || 'en')}
        </p>
      </div>

      <div className="flex justify-end space-x-3">
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          {t('cancel', { ns: 'common' })}
        </button>
        <button
          type="submit"
          disabled={loading}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
        >
          {t('save', { ns: 'common' })}
        </button>
      </div>
    </form>
  );
};
