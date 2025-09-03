"use client";
import React, { useEffect, useState } from 'react';
import { getAuth } from '@/lib/auth';

interface OfficeExpense {
  id: number;
  date: string;
  memo: string | null;
  amount: number;
  currency: string;
  expenseAccount: { code: string; name: string } | null;
}

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function OfficeExpenseHistoryDialog({ open, onClose }: Props) {
  const [items, setItems] = useState<OfficeExpense[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editAmount, setEditAmount] = useState('');
  const [editMemo, setEditMemo] = useState('');
  const token = getAuth();

  const headers = token ? { Authorization: `Bearer ${token}` } : undefined;

  const load = async () => {
    setLoading(true);
    const res = await fetch('/api/office-expenses?limit=100', { headers });
    if (res.ok) {
      setItems(await res.json());
    }
    setLoading(false);
  };

  useEffect(() => {
    if (open) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded shadow-lg w-full max-w-3xl p-6">
        <h2 className="text-xl font-semibold mb-4">Office Expense History</h2>
        {loading ? (
          <p>Loading...</p>
        ) : (
          <div className="overflow-y-auto max-h-[60vh]">
            <table className="w-full text-sm border">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border px-2 py-1">Date</th>
                  <th className="border px-2 py-1 text-right">Amount</th>
                  <th className="border px-2 py-1">Currency</th>
                  <th className="border px-2 py-1">Memo</th>
                  <th className="border px-2 py-1">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((it) => (
                  <tr key={it.id}>
                    <td className="border px-2 py-1">{new Date(it.date).toLocaleDateString()}</td>
                    {editingId === it.id ? (
                      <>
                        <td className="border px-2 py-1 text-right">
                          <input
                            value={editAmount}
                            onChange={(e) => setEditAmount(e.target.value)}
                            className="border rounded px-1 w-24"
                          />
                        </td>
                        <td className="border px-2 py-1">{it.currency}</td>
                        <td className="border px-2 py-1">
                          <input
                            value={editMemo}
                            onChange={(e) => setEditMemo(e.target.value)}
                            className="border rounded px-1 w-full"
                          />
                        </td>
                        <td className="border px-2 py-1">
                          <button
                            className="text-green-600 mr-2"
                            onClick={async () => {
                              await fetch(`/api/office-expenses/${it.id}`, {
                                method: 'PUT',
                                headers: { 'Content-Type': 'application/json', ...headers },
                                body: JSON.stringify({ amount: Number(editAmount), memo: editMemo }),
                              });
                              setEditingId(null);
                              load();
                            }}
                          >
                            Save
                          </button>
                          <button className="text-gray-600" onClick={() => setEditingId(null)}>
                            Cancel
                          </button>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="border px-2 py-1 text-right">{it.amount.toFixed(2)}</td>
                        <td className="border px-2 py-1">{it.currency}</td>
                        <td className="border px-2 py-1">{it.memo}</td>
                        <td className="border px-2 py-1">
                          <button
                            className="text-blue-600 mr-2"
                            onClick={() => {
                              setEditingId(it.id);
                              setEditAmount(String(it.amount));
                              setEditMemo(it.memo || '');
                            }}
                          >
                            Edit
                          </button>
                          <button
                            className="text-red-600"
                            onClick={async () => {
                              if (!confirm('Delete this office expense?')) return;
                              await fetch(`/api/office-expenses/${it.id}`, {
                                method: 'DELETE',
                                headers,
                              });
                              load();
                            }}
                          >
                            Delete
                          </button>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
                {items.length === 0 && (
                  <tr>
                    <td colSpan={5} className="text-center py-4 text-gray-500">
                      No office expenses recorded.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
        <div className="text-right mt-4">
          <button className="px-4 py-2 bg-gray-600 text-white rounded" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
