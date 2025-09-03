"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";
import { fetchAuth } from "@/lib/fetchAuth";
import dayjs from "dayjs";

interface TimeEntry {
  id: number;
  project: { name: string; client: { name: string } } | null;
  user: { name: string } | null;
  startTs: string;
  endTs: string | null;
  durationMins: number;
  notes: string | null;
}

const CURRENCIES = ['USD','EUR','SAR','EGP','GBP','AED'];

export default function AccountantPendingTimePage() {
  const [items, setItems] = useState<TimeEntry[]>([]);
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selCurrency, setSelCurrency] = useState<string>('USD');
  const [pendingId, setPendingId] = useState<number|null>(null);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    const res = await fetchAuth("/api/time-entries/pending/accountant");
    if (res.ok) {
      setItems(await res.json());
    } else {
      toast.error("Failed to load");
    }
    setLoading(false);
  }

  function openCurrencyModal(id: number) {
    setPendingId(id);
    setSelCurrency('USD');
    setShowModal(true);
  }

  async function confirmApprove(id: number, createInvoice: boolean) {
    const res = await fetchAuth(`/api/time-entries/pending/accountant?id=${id}`, {
      method: "PUT",
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currency: selCurrency, createInvoice }),
    });
    if (res.ok) {
      const data = await res.json().catch(() => ({}));
      toast.success("Approved");
      // redirect only if invoice was created
      if (data.invoiceCreated && data.invoiceNumber) {
        router.push(`/invoices/${data.invoiceNumber}`);
      } else {
        load();
      }
      setShowModal(false);
    } else {
      toast.error("Error");
    }
  }

  async function removeEntry(id: number) {
    if (!confirm('Delete this entry?')) return;
    const res = await fetchAuth(`/api/time-entries/${id}`, { method: 'DELETE' });
    if (res.ok) {
      toast.success('Deleted');
      load();
    } else {
      toast.error('Delete failed');
    }
  }

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Pending Time – Accountant</h1>
      {loading ? (
        <p>Loading...</p>
      ) : items.length === 0 ? (
        <p className="italic text-sm">No pending entries.</p>
      ) : (
        <table className="w-full bg-white shadow rounded text-sm">
          <thead className="bg-gray-100 text-left">
            <tr>
              <th className="px-3 py-2">ID</th>
              <th className="px-3 py-2">Lawyer</th>
              <th className="px-3 py-2">Client / Project</th>
              <th className="px-3 py-2">Start</th>
              <th className="px-3 py-2">End</th>
              <th className="px-3 py-2">Duration (mins)</th>
              <th className="px-3 py-2">Notes</th>
              <th className="px-3 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map((e) => (
              <tr key={e.id} className="border-t hover:bg-gray-50">
                <td className="px-3 py-2">{e.id}</td>
                <td className="px-3 py-2">{e.user?.name}</td>
                <td className="px-3 py-2">
                  {e.project?.client.name} / {e.project?.name}
                </td>
                <td className="px-3 py-2">{dayjs(e.startTs).format("YYYY-MM-DD HH:mm")}</td>
                <td className="px-3 py-2">
                  {e.endTs ? dayjs(e.endTs).format("YYYY-MM-DD HH:mm") : "-"}
                </td>
                <td className="px-3 py-2 text-center">{e.durationMins}</td>
                <td className="px-3 py-2 max-w-[200px] truncate">{e.notes || "-"}</td>
                <td className="px-3 py-2 flex gap-3">
                  <button onClick={() => confirmApprove(e.id, false)} className="text-blue-600 hover:underline">
                    Approve Only
                  </button>
                  <button onClick={() => openCurrencyModal(e.id)} className="text-green-600 hover:underline">
                    Approve &amp; Invoice
                  </button>
                  <button onClick={() => removeEntry(e.id)} className="text-red-600 hover:underline">
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded shadow p-6 w-72">
            <h2 className="text-lg font-semibold mb-4">Select Currency</h2>
            <select
              value={selCurrency}
              onChange={e=>setSelCurrency(e.target.value)}
              className="w-full border rounded px-2 py-1 mb-4"
            >
              {CURRENCIES.map(c=> (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <div className="flex justify-end gap-3">
              <button onClick={()=>setShowModal(false)} className="px-3 py-1 border rounded">Cancel</button>
              <button
                onClick={() => pendingId !== null && confirmApprove(pendingId, true)}
                className="px-4 py-1 bg-green-600 text-white rounded"
              >Approve &amp; Invoice</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
