'use client';

import React, { useEffect, useState } from 'react';
import { getAuth } from '@/lib/auth';
import { useTranslation } from 'react-i18next';

interface LedgerRow {
  id: number;
  date: string;
  memo: string | null;
  debit: string;
  credit: string;
  balance: string;
}

export default function LedgerPage() {
  const { t } = useTranslation('reports');
  const token = getAuth();

  const [accounts, setAccounts] = useState<Array<{ id: number; code: string; name: string }>>([]);
  const [accountId, setAccountId] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [rows, setRows] = useState<LedgerRow[]>([]);
  const [opening, setOpening] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /* load accounts */
  useEffect(() => {
    if (!token) return;
    fetch('/api/accounts', { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((data) => setAccounts(data || []));
  }, [token]);

  const fetchData = async () => {
    if (!token || !accountId) return;
    try {
      setLoading(true);
      setError(null);
      const qs = new URLSearchParams();
      qs.append('accountId', accountId);
      if (from) qs.append('start', from);
      if (to) qs.append('end', to);
      const res = await fetch(`/api/reports/ledger?${qs}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Load failed');
      const data = await res.json();
      setOpening(data.opening || 0);
      setRows(data.rows || []);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto max-w-6xl p-8">
      <h1 className="mb-6 text-3xl font-bold">{t('ledger.title', 'Ledger')}</h1>

      {/* filters */}
      <form
        className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-4"
        onSubmit={(e) => {
          e.preventDefault();
          fetchData();
        }}
      >
        <select
          className="rounded border px-2 py-1"
          value={accountId}
          onChange={(e) => setAccountId(e.target.value)}
          required
        >
          <option value="">{t('ledger.selectAccount', 'Select account')}</option>
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.code} – {a.name}
            </option>
          ))}
        </select>
        <input
          type="date"
          className="rounded border px-2 py-1"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
        />
        <input
          type="date"
          className="rounded border px-2 py-1"
          value={to}
          onChange={(e) => setTo(e.target.value)}
        />
        <button
          type="submit"
          className="rounded bg-blue-600 px-4 py-1 font-semibold text-white hover:bg-blue-700"
          disabled={loading}
        >
          {loading ? t('loading', 'Loading…') : t('apply', 'Apply')}
        </button>
      </form>

      {error && <p className="text-red-600">{error}</p>}

      {rows.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-gray-100">
                <th className="border px-3 py-2 text-left">{t('date', 'Date')}</th>
                <th className="border px-3 py-2 text-left">{t('memo', 'Memo')}</th>
                <th className="border px-3 py-2 text-right">{t('debit', 'Debit')}</th>
                <th className="border px-3 py-2 text-right">{t('credit', 'Credit')}</th>
                <th className="border px-3 py-2 text-right">{t('balance', 'Balance')}</th>
              </tr>
            </thead>
            <tbody>
              <tr className="bg-yellow-50 font-semibold">
                <td className="border px-3 py-2" colSpan={4}>
                  {t('ledger.opening', 'Opening Balance')}
                </td>
                <td className="border px-3 py-2 text-right">{opening.toFixed(2)}</td>
              </tr>
              {rows.map((r) => (
                <tr key={r.id} className="odd:bg-white even:bg-gray-50">
                  <td className="border px-3 py-2 whitespace-nowrap">{r.date.slice(0, 10)}</td>
                  <td className="border px-3 py-2 truncate">{r.memo ?? ''}</td>
                  <td className="border px-3 py-2 text-right">{Number(r.debit).toFixed(2)}</td>
                  <td className="border px-3 py-2 text-right">{Number(r.credit).toFixed(2)}</td>
                  <td className="border px-3 py-2 text-right font-semibold">
                    {Number(r.balance).toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
