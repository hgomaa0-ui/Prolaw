"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import dayjs from "dayjs";
import { fetchAuth } from "@/lib/fetchAuth";

interface OfficeTxn {
  id: number;
  date: string;
  memo: string | null;
  amount: number;
  currency: string;
  expenseAccount?: { name: string };
  cashAccount?: { name: string };
}

export default function OfficeExpensesAdminPage() {
  const [items, setItems] = useState<OfficeTxn[]>([]);
  const [loading, setLoading] = useState(true);
  const [editId, setEditId] = useState<number | null>(null);
  const [editAmount, setEditAmount] = useState("");
  const [editMemo, setEditMemo] = useState("");
  const [editCurrency, setEditCurrency] = useState("USD");

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    const res = await fetchAuth("/api/office-expenses?limit=100");
    if (res.ok) {
      setItems(await res.json());
    } else {
      toast.error("Failed to load");
    }
    setLoading(false);
  }

  async function save(id: number) {
    try {
      const body: any = {};
      if (editAmount) body.amount = Number(editAmount);
      if (editMemo) body.memo = editMemo;
      if (editCurrency) body.currency = editCurrency;
      const res = await fetchAuth(`/api/office-expenses/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        toast.success("Updated");
        setEditId(null);
        load();
      } else {
        const err = await res.json();
        toast.error(err.error || "Error");
      }
    } catch (e: any) {
      toast.error(e.message || "Error");
    }
  }

  async function remove(id: number) {
    if (!confirm("Delete transaction?")) return;
    const res = await fetchAuth(`/api/office-expenses/${id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Deleted");
      setItems((prev) => prev.filter((t) => t.id !== id));
    } else {
      const err = await res.json();
      toast.error(err.error || "Error");
    }
  }

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Office Expenses</h1>

      {loading ? (
        <p>Loading...</p>
      ) : items.length === 0 ? (
        <p className="italic text-sm">No transactions found.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead className="bg-gray-100 text-left">
              <tr>
                <th className="border px-3 py-2">ID</th>
                <th className="border px-3 py-2">Date</th>
                <th className="border px-3 py-2">Account</th>
                <th className="border px-3 py-2">Amount</th>
                <th className="border px-3 py-2">Memo</th>
                <th className="border px-3 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((t) => (
                <tr key={t.id} className="border-t hover:bg-gray-50">
                  <td className="px-3 py-1">{t.id}</td>
                  <td className="px-3 py-1">{dayjs(t.date).format("YYYY-MM-DD")}</td>
                  <td className="px-3 py-1">{t.expenseAccount?.name}</td>
                  {editId === t.id ? (
                    <>
                      <td className="px-3 py-1">
                        <input
                          type="number"
                          value={editAmount}
                          onChange={(e) => setEditAmount(e.target.value)}
                          className="border rounded px-1 w-24 text-right"
                        />
                        <select
                          value={editCurrency}
                          onChange={(e) => setEditCurrency(e.target.value)}
                          className="ml-1 border rounded px-1"
                        >
                          {["USD", "EUR", "EGP", "SAR", "AED", "GBP"].map((c) => (
                            <option key={c}>{c}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-3 py-1">
                        <input
                          value={editMemo}
                          onChange={(e) => setEditMemo(e.target.value)}
                          className="border rounded px-1 w-full"
                        />
                      </td>
                      <td className="px-3 py-1">
                        <button className="text-green-600 mr-2" onClick={() => save(t.id)}>
                          Save
                        </button>
                        <button className="text-gray-600" onClick={() => setEditId(null)}>
                          Cancel
                        </button>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="px-3 py-1 text-right">
                        {Number(t.amount).toFixed(2)} {t.currency}
                      </td>
                      <td className="px-3 py-1 truncate max-w-[200px]">{t.memo ?? "-"}</td>
                      <td className="px-3 py-1">
                        <button
                          className="text-blue-600 mr-2"
                          onClick={() => {
                            setEditId(t.id);
                            setEditAmount(String(t.amount));
                            setEditCurrency(t.currency);
                            setEditMemo(t.memo || "");
                          }}
                        >
                          Edit
                        </button>
                        <button className="text-red-600" onClick={() => remove(t.id)}>
                          Delete
                        </button>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Link href="/admin" className="mt-6 inline-block text-blue-600">
        ← Back to Admin
      </Link>
    </div>
  );
}
