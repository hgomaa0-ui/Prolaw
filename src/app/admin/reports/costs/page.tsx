'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import { getAuth } from '@/lib/auth';

interface CostRow {
  projectId: number;
  projectName: string;
  lawyerId: number;
  lawyerName: string;
  hours: number;
  rate: number;
  currency: string | null;
}

type TotalsMap = Record<string, { total: number }>;
type DraftsMap = Record<number, number>; // projectId → draft invoice id

function findAssignment(projectId: number, lawyerId: number, list: any[]) {
  return list.find((a) => a.projectId === projectId && a.userId === lawyerId);
}

export default function CostsReportPage() {
  const { t } = useTranslation('reports');
  const token = getAuth();

  const [rows, setRows] = useState<CostRow[]>([]);
  const [totals, setTotals] = useState<TotalsMap>({});
  const [clients, setClients] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [lawyers, setLawyers] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [drafts, setDrafts] = useState<DraftsMap>({});

  /* ---------- filters ---------- */
  const [clientFilter, setClientFilter] = useState('');
  const [projectFilter, setProjectFilter] = useState('');
  const [lawyerFilter, setLawyerFilter] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /* ---------- static lists ---------- */
  useEffect(() => {
    if (!token) return;
    (async () => {
      const headers = { Authorization: `Bearer ${token}` };
      const [cRes, pRes, lRes, aRes] = await Promise.all([
        fetch('/api/clients', { headers }),
        fetch('/api/projects', { headers }),
        fetch('/api/lawyers', { headers }),
        fetch('/api/assignments', { headers }),
      ]);
      if (cRes.ok) setClients(await cRes.json());
      if (pRes.ok) setProjects(await pRes.json());
      if (lRes.ok) setLawyers(await lRes.json());
      if (aRes.ok) setAssignments(await aRes.json());
    })();
  }, [token]);

  /* ---------- fetch report ---------- */
  const fetchData = async () => {
    if (!token) return;
    try {
      setLoading(true);
      setError(null);

      const qs = new URLSearchParams();
      if (clientFilter) qs.append('clientId', clientFilter);
      if (projectFilter) qs.append('projectId', projectFilter);
      if (lawyerFilter) qs.append('userId', lawyerFilter);
      if (from) qs.append('from', new Date(from).toISOString());
      if (to) qs.append('to', new Date(to).toISOString());

      const res = await fetch(`/api/reports/costs?${qs}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Load failed');
      const data = await res.json();
      setRows(data.rows || []);
      setTotals(data.totals || {});
      setDrafts(data.drafts || {});
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [token]);

  /* ---------- grouping ---------- */
  const grouped = rows.reduce<Record<string, CostRow[]>>((acc, r) => {
    const key = `${r.projectName}|${r.currency ?? ''}`;
    (acc[key] = acc[key] || []).push(r);
    return acc;
  }, {});

  /* ---------- UI ---------- */
  return (
    <div className="container mx-auto max-w-5xl p-8">
      <h1 className="mb-6 text-3xl font-bold">{t('title')}</h1>

      {/* filters */}
      <form
        className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-5"
        onSubmit={(e) => {
          e.preventDefault();
          fetchData();
        }}
      >
        {/* client */}
        <select
          className="w-full rounded border px-2 py-1"
          value={clientFilter}
          onChange={(e) => {
            setClientFilter(e.target.value);
            setProjectFilter('');
          }}
        >
          <option value="">{t('filters.allClients')}</option>
          {clients.map((c: any) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>

        {/* project */}
        <select
          className="w-full rounded border px-2 py-1"
          value={projectFilter}
          onChange={(e) => setProjectFilter(e.target.value)}
        >
          <option value="">{t('filters.allProjects')}</option>
          {projects
            .filter((p: any) => !clientFilter || p.clientId === Number(clientFilter))
            .map((p: any) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
        </select>

        {/* lawyer */}
        <select
          className="w-full rounded border px-2 py-1"
          value={lawyerFilter}
          onChange={(e) => setLawyerFilter(e.target.value)}
        >
          <option value="">{t('filters.allLawyers')}</option>
          {lawyers.map((l: any) => (
            <option key={l.id} value={l.id}>
              {l.name}
            </option>
          ))}
        </select>

        {/* date range */}
        <input
          type="date"
          className="w-full rounded border px-2 py-1"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
        />
        <input
          type="date"
          className="w-full rounded border px-2 py-1"
          value={to}
          onChange={(e) => setTo(e.target.value)}
        />

        {/* buttons */}
        <button
          type="submit"
          className="rounded bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700 sm:col-span-2 lg:col-span-1"
        >
          {t('buttons.applyFilters')}
        </button>
        <button
          type="button"
          className="rounded bg-gray-300 px-4 py-2 font-semibold text-gray-800 hover:bg-gray-400 sm:col-span-2 lg:col-span-1"
          onClick={() => {
            setClientFilter('');
            setProjectFilter('');
            setLawyerFilter('');
            setFrom('');
            setTo('');
            fetchData();
          }}
        >
          {t('buttons.reset')}
        </button>
      </form>

      {/* table */}
      {loading ? (
        <p>Loading…</p>
      ) : error ? (
        <p className="text-red-600">{error}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full table-auto border-collapse text-sm">
            <thead>
              <tr className="bg-gray-100">
                <th className="border px-3 py-2 text-left">{t('headers.project')}</th>
                <th className="border px-3 py-2 text-left">{t('headers.lawyer')}</th>
                <th className="border px-3 py-2 text-right">{t('headers.hours')}</th>
                <th className="border px-3 py-2 text-right">{t('headers.rate')}</th>
                <th className="border px-3 py-2 text-right">{t('headers.total')}</th>
                <th className="border px-3 py-2 text-right">{t('headers.ready')}</th>
              </tr>
            </thead>
            <tbody>
              {(() => {
                const currencyTotals: Record<string, number> = {};

                return (
                  <>
                    {Object.entries(grouped).map(([key, list]) => {
                      const [projectName, currency = ''] = key.split('|');
                      const projectHours = list.reduce((s, r) => s + r.hours, 0);
                      const projectTotal = list.reduce((s, r) => s + (Number(r.rate || 0) * r.hours), 0);
                      currencyTotals[currency] = (currencyTotals[currency] || 0) + projectTotal;

                      return (
                        <React.Fragment key={key}>
                          {/* project subtotal */}
                          <tr className="bg-blue-50 font-semibold">
                            <td className="border px-3 py-2">{projectName}</td>
                            <td className="border px-3 py-2" />
                            <td className="border px-3 py-2 text-right">{projectHours.toFixed(2)}</td>
                            <td className="border px-3 py-2 text-right" />
                            <td className="border px-3 py-2 text-right">
                              {currency} {projectTotal.toFixed(2)}
                            </td>
                            <td className="border px-3 py-2" />
                          </tr>

                          {/* lawyer rows */}
                          {list.map((r: CostRow) => {
                            const asn = findAssignment(r.projectId, r.lawyerId, assignments);
                            const ready = asn?.readyForInvoicing ?? false;
                            const total = Number(r.rate || 0) * r.hours;

                            return (
                              <tr key={`${r.projectId}-${r.lawyerId}`} className="odd:bg-white even:bg-gray-50">
                                <td className="border px-3 py-2" />
                                <td className="border px-3 py-2">{r.lawyerName}</td>
                                <td className="border px-3 py-2 text-right">{r.hours.toFixed(2)}</td>
                                <td className="border px-3 py-2 text-right">
                                  {r.currency} {(Number(r.rate) || 0).toFixed(2)}
                                </td>
                                <td className="border px-3 py-2 text-right">
                                  {r.currency} {total.toFixed(2)}
                                </td>
                                <td className="border px-3 py-2 text-center">
                                  <input
                                    type="checkbox"
                                    checked={ready}
                                    onChange={async () => {
                                      if (!asn) return;
                                      await fetch(`/api/assignments/${asn.id}`, {
                                        method: 'PUT',
                                        headers: {
                                          'Content-Type': 'application/json',
                                          Authorization: `Bearer ${token}`,
                                        },
                                        body: JSON.stringify({ readyForInvoicing: !ready }),
                                      });
                                      setAssignments((prev) =>
                                        prev.map((a: any) =>
                                          a.id === asn.id ? { ...a, readyForInvoicing: !ready } : a,
                                        ),
                                      );
                                    }}
                                  />
                                </td>
                              </tr>
                            );
                          })}
                        </React.Fragment>
                      );
                    })}

                    {/* grand totals */}
                    {Object.entries(currencyTotals)
                      .filter(([, tot]) => tot > 0)
                      .map(([cur, tot]) => (
                        <tr key={cur} className="bg-gray-200 font-bold">
                          <td colSpan={4} />
                          <td className="border px-3 py-2 text-right">
                            {cur} {tot.toFixed(2)}
                          </td>
                          <td />
                        </tr>
                      ))}
                  </>
                );
              })()}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}