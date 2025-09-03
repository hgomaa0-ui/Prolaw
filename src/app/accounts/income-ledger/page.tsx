'use client';

import React, { useState } from 'react';
import useSWR, { mutate } from 'swr';
import Link from 'next/link';

const fetcher = async (url: string) => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  const res = await fetch(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error('Failed');
  return res.json();
};

export default function IncomeLedgerPage() {
  const [bankId, setBankId] = useState<string>('');
  const [projectId, setProjectId] = useState<string>('');
  const { data: banks } = useSWR('/api/banks?all=1', fetcher);
  const { data: projects } = useSWR('/api/projects?all=1', fetcher);

  const query = `/api/income-ledger${bankId || projectId ? '?' : ''}${bankId ? `bankId=${bankId}` : ''}${bankId && projectId ? '&' : ''}${projectId ? `projectId=${projectId}` : ''}`;
  const { data: entries, isLoading } = useSWR(query, fetcher);

  return (
    <div className="p-8 space-y-6 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold">Income Cash Ledger</h1>

      {/* Filters */}
      <div className="flex gap-4 items-end">
        <div>
          <label className="block text-sm">Bank</label>
          <select value={bankId} onChange={(e) => setBankId(e.target.value)} className="border px-2 py-1">
            <option value="">All</option>
            {banks?.map((b: any) => (
              <option key={b.id} value={b.id}>
                {b.name} ({b.currency})
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm">Project</label>
          <select value={projectId} onChange={(e) => setProjectId(e.target.value)} className="border px-2 py-1">
            <option value="">All</option>
            {projects?.map((p: any) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
        <button
          className="bg-gray-200 px-3 py-1 rounded"
          onClick={() => {
            setBankId('');
            setProjectId('');
            mutate('/api/income-ledger');
          }}
        >
          Reset
        </button>
      </div>

      {/* Table */}
      {isLoading ? (
        <p>Loading...</p>
      ) : (
        <table className="text-sm border min-w-full">
          <thead className="bg-gray-100">
            <tr>
              <th className="border px-3 py-1">Date</th>
              <th className="border px-3 py-1 text-right">Amount</th>
              <th className="border px-3 py-1">Currency</th>
              <th className="border px-3 py-1">Source</th>
              <th className="border px-3 py-1">Bank</th>
              <th className="border px-3 py-1">Project</th>
              <th className="border px-3 py-1">Notes</th>
              <th className="border px-3 py-1 w-12">#</th>
            </tr>
          </thead>
          <tbody>
            {entries?.length ? (
              entries.map((e: any) => (
                <tr key={e.id}>
                  <td className="border px-3 py-1">{new Date(e.createdAt).toLocaleDateString()}</td>
                  <td className="border px-3 py-1 text-right">{Number(e.amount).toFixed(2)}</td>
                  <td className="border px-3 py-1">{e.currency}</td>
                  <td className="border px-3 py-1">{e.source.replace('_', ' ')}</td>
                  <td className="border px-3 py-1">{e.bank ? `${e.bank.name}` : '-'}</td>
                  <td className="border px-3 py-1">
                    {e.project ? (
                      <Link className="text-blue-600 underline" href={`/projects/${e.project.id}`}>{e.project.name}</Link>
                    ) : (
                      '-'
                    )}
                  </td>
                  <td className="border px-3 py-1">{e.notes || ''}</td>
                  <td className="border px-1 py-1 text-center">
                    <button
                      onClick={async () => {
                        if (!confirm('Delete entry?')) return;
                        const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
                        await fetch(`/api/income-ledger/${e.id}`, {
                          method: 'DELETE',
                          headers: {
                            ...(token ? { Authorization: `Bearer ${token}` } : {}),
                          },
                        });
                        mutate(query);
                      }}
                      className="text-red-600 hover:underline"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={8} className="border px-3 py-2 text-center text-gray-600">
                  No entries
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}
