'use client';

import React, { useEffect, useState } from 'react';
import { getAuth } from '@/lib/auth';
import { useTranslation } from 'react-i18next';

interface TBRow {
  code: string;
  name: string;
  debit: number;
  credit: number;
  balance: number;
}

export default function TrialBalancePage() {
  const { t } = useTranslation('reports');
  const token = getAuth();

  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [rows, setRows] = useState<TBRow[]>([]);
  const [totals, setTotals] = useState({ debit: 0, credit: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    if (!token) return;
    try {
      setLoading(true);
      setError(null);
      const qs = new URLSearchParams();
      if (from) qs.append('start', from);
      if (to) qs.append('end', to);
      const res = await fetch(`/api/reports/trial-balance?${qs}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Load failed');
      const data = await res.json();
      setRows(data.rows || []);
      setTotals({ debit: data.totalDebit || 0, credit: data.totalCredit || 0 });
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) fetchData();
  }, [token]);

  return (
    <div className="container mx-auto max-w-6xl p-8">
      <h1 className="mb-6 text-3xl font-bold">{t('trial.title', 'Trial Balance')}</h1>

      {/* filters */}
      <form
        className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3"
        onSubmit={(e) => {
          e.preventDefault();
          fetchData();
        }}
      >
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
                <th className="border px-3 py-2 text-left">{t('code', 'Code')}</th>
                <th className="border px-3 py-2 text-left">{t('name', 'Name')}</th>
                <th className="border px-3 py-2 text-right">{t('debit', 'Debit')}</th>
                <th className="border px-3 py-2 text-right">{t('credit', 'Credit')}</th>
                <th className="border px-3 py-2 text-right">{t('balance', 'Balance')}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.code} className="odd:bg-white even:bg-gray-50">
                  <td className="border px-3 py-2 whitespace-nowrap">{r.code}</td>
                  <td className="border px-3 py-2 truncate">{r.name}</td>
                  <td className="border px-3 py-2 text-right">{r.debit.toFixed(2)}</td>
                  <td className="border px-3 py-2 text-right">{r.credit.toFixed(2)}</td>
                  <td className="border px-3 py-2 text-right font-semibold">
                    {r.balance.toFixed(2)}
                  </td>
                </tr>
              ))}
              <tr className="bg-gray-200 font-bold">
                <td colSpan={2} className="border px-3 py-2 text-right">
                  {t('total', 'Total')}
                </td>
                <td className="border px-3 py-2 text-right">{totals.debit.toFixed(2)}</td>
                <td className="border px-3 py-2 text-right">{totals.credit.toFixed(2)}</td>
                <td className="border px-3 py-2" />
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
