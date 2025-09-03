"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { fetchAuth } from "@/lib/fetchAuth";
import Link from "next/link";

import useSWR from 'swr';

interface Bank { id: number; name: string; currency: string; }

interface PendingExpense {
  id: number;
  amount: string;
  currency: string;
  description: string | null;
  incurredOn: string;
  receiptUrl?: string;
  user: { name: string } | null;
  project: { name: string; client: { name: string } } | null;
}

export default function PendingExpensesPage() {
  const [items, setItems] = useState<PendingExpense[]>([]);
  const { data: banks } = useSWR<Bank[]>('/api/banks', (url:string)=>fetchAuth(url).then(r=>r.json()));
  const [selectedBank, setSelectedBank] = useState<Record<number, number | ''>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchList();
  }, []);

  async function fetchList() {
    setLoading(true);
    const res = await fetchAuth("/api/expenses/pending");
    if (res.ok) {
      const data = await res.json();
      setItems(data);
    } else if (res.status === 403) {
      toast.error("Forbidden – accountants/owners only");
    } else {
      const err = await res.json();
      toast.error(err.error || "Error");
    }
    setLoading(false);
  }

  async function approve(id: number) {
    const bankId = selectedBank[id];
    if (!bankId) { toast.error('Select bank first'); return; }

    if (!confirm("Approve expense?")) return;
    const res = await fetchAuth(`/api/expenses/${id}/approve`, { method: "PUT", headers: { 'Content-Type':'application/json' }, body: JSON.stringify({ bankId }) });
    if (res.ok) {
      toast.success("Approved");
      setItems((prev) => prev.filter((e) => e.id !== id));
    } else {
      const err = await res.json();
      toast.error(err.error || "Failed");
    }
  }

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Pending Expenses Approval</h1>

      {loading ? (
        <p>Loading...</p>
      ) : items.length === 0 ? (
        <p className="italic text-sm">No pending expenses.</p>
      ) : (
        <table className="w-full bg-white shadow rounded text-sm">
          <thead className="bg-gray-100 text-left">
            <tr>
              <th className="px-3 py-2">ID</th>
              <th className="px-3 py-2">Client / Project</th>
              <th className="px-3 py-2">Lawyer</th>
              <th className="px-3 py-2">Date</th>
              <th className="px-3 py-2">Amount</th>
              <th className="px-3 py-2">Description</th>
              <th className="px-3 py-2">Receipt</th>
              <th className="px-3 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map((e) => (
              <tr key={e.id} className="border-t hover:bg-gray-50">
                <td className="px-3 py-2">{e.id}</td>
                <td className="px-3 py-2">
                  {e.project?.client.name ?? "-"} / {e.project?.name ?? "-"}
                </td>
                <td className="px-3 py-2">{e.user?.name ?? "-"}</td>
                <td className="px-3 py-2">{new Date(e.incurredOn).toLocaleDateString()}</td>
                <td className="px-3 py-2">
                  {e.amount} {e.currency}
                </td>
                <td className="px-3 py-2 truncate max-w-[200px]">{e.description ?? "-"}</td>
                <td className="px-3 py-2">
                  {e.receiptUrl ? (
                    <a href={e.receiptUrl} target="_blank" rel="noopener" className="text-blue-600 underline">View</a>
                  ) : '-' }
                </td>
                <td className="px-3 py-2">
                  <select className="border rounded mr-2 text-xs" value={selectedBank[e.id] ?? ''} onChange={ev=>setSelectedBank(prev=>({...prev,[e.id]: ev.target.value ? Number(ev.target.value):''}))}>
                    <option value="">Bank</option>
                    {banks?.map(b=> <option key={b.id} value={b.id}>{b.name} ({b.currency})</option>)}
                  </select>
                  <button
                    onClick={() => approve(e.id)}
                    className="bg-green-600 text-white px-2 py-1 rounded text-xs hover:bg-green-500"
                  >
                    Approve
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <Link href="/admin" className="mt-6 inline-block text-blue-600">
        ← Back to Admin
      </Link>
    </div>
  );
}
