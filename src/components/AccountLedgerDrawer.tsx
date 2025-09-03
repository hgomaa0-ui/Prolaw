'use client';
import React, { useEffect, useState } from 'react';

interface Line {
  id: number;
  transaction: { id: number; date: string; memo: string | null };
  debit: string;
  credit: string;
  currency: string;
}
interface LedgerData {
  opening: Record<string, number>;
  lines: Line[];
}

export default function AccountLedgerDrawer({
  accountId,
  code,
  name,
  onClose,
}: {
  accountId: number;
  code: string;
  name: string;
  onClose: () => void;
}) {
  const [data, setData] = useState<LedgerData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchLedger = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/accounts/${accountId}/ledger`);
        if (!res.ok) throw new Error('Failed to load ledger');
        setData(await res.json());
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };
    fetchLedger();
  }, [accountId]);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/30 p-4">
      <div className="max-h-full w-full max-w-4xl overflow-y-auto rounded bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between gap-4">
          <h2 className="text-xl font-bold">
            Ledger – {code} • {name}
          </h2>
          <button
            onClick={onClose}
            className="rounded bg-gray-200 px-3 py-1 text-sm font-semibold hover:bg-gray-300"
          >
            Close
          </button>
        </div>
        {loading && <p>Loading…</p>}
        {error && <p className="text-red-600">{error}</p>}
        {data && (
          <>
            {Object.keys(data.opening).length > 0 && (
              <div className="mb-4 text-sm">Opening balance:
                {Object.entries(data.opening).map(([cur, bal]) => (
                  <span key={cur} className="ml-2 font-mono">{cur} {bal.toFixed(2)}</span>
                ))}
              </div>
            )}
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border px-3 py-2 text-left">Date</th>
                    <th className="border px-3 py-2 text-left">Memo</th>
                    <th className="border px-3 py-2 text-right">Debit</th>
                    <th className="border px-3 py-2 text-right">Credit</th>
                    <th className="border px-3 py-2 text-left">Currency</th>
                  </tr>
                </thead>
                <tbody>
                  {data.lines.map((l) => (
                    <tr key={l.id} className="odd:bg-white even:bg-gray-50">
                      <td className="border px-3 py-2 whitespace-nowrap">
                        {new Date(l.transaction.date).toLocaleDateString()}
                      </td>
                      <td className="border px-3 py-2">{l.transaction.memo}</td>
                      <td className="border px-3 py-2 text-right">{Number(l.debit).toFixed(2)}</td>
                      <td className="border px-3 py-2 text-right">{Number(l.credit).toFixed(2)}</td>
                      <td className="border px-3 py-2">{l.currency}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
