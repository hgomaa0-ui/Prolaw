"use client";

import { useEffect, useState } from "react";
import dayjs from "dayjs";
import { fetchAuth } from "@/lib/fetchAuth";
import Link from "next/link";

interface Item {
  id: number;
  date: string;
  memo: string | null;
  amount: number;
  currency: string;
  expenseAccount?: string;
  cashAccount?: string;
  cashAmount?: number;
  cashCurrency?: string;
}

export default function OfficeExpensesReport() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(false);
  const [from, setFrom] = useState<string>(dayjs().startOf("year").format("YYYY-MM-DD"));
  const [to, setTo] = useState<string>(dayjs().format("YYYY-MM-DD"));

  async function load() {
    setLoading(true);
    const qs = new URLSearchParams({ from, to }).toString();
    const res = await fetchAuth(`/api/reports/office-expenses?${qs}`);
    if (res.ok) setItems(await res.json());
    setLoading(false);
  }
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const totals = items.reduce((acc, it) => {
    const key = it.currency;
    acc[key] = (acc[key] || 0) + it.amount;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Office Expenses Report</h1>

      <div className="mb-4 flex gap-4 items-end">
        <div>
          <label className="block text-sm">From</label>
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="border px-2 py-1 rounded" />
        </div>
        <div>
          <label className="block text-sm">To</label>
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="border px-2 py-1 rounded" />
        </div>
        <button onClick={load} className="bg-blue-600 text-white px-4 py-1 rounded">Search</button>
      </div>

      {loading ? (
        <p>Loading…</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="text-sm w-full border-collapse">
            <thead className="bg-gray-100">
              <tr>
                <th className="border px-2 py-1">Date</th>
                <th className="border px-2 py-1">Account</th>
                <th className="border px-2 py-1">Memo</th>
                <th className="border px-2 py-1 text-right">Expense</th>
                <th className="border px-2 py-1 text-right">Paid&nbsp;From</th>
              </tr>
            </thead>
            <tbody>
              {items.map((it) => (
                <tr key={it.id} className="border-t">
                  <td className="px-2 py-1">{dayjs(it.date).format("YYYY-MM-DD")}</td>
                  <td className="px-2 py-1">{it.expenseAccount}</td>
                  <td className="px-2 py-1 max-w-[300px] truncate">{it.memo ?? "-"}</td>
                  <td className="px-2 py-1 text-right">{it.amount.toFixed(2)} {it.currency}</td>
                  <td className="px-2 py-1 text-right">{it.cashAmount?.toFixed(2)} {it.cashCurrency}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              {Object.entries(totals).map(([cur, amt]) => (
                <tr key={cur} className="font-semibold">
                  <td colSpan={3} className="text-right pr-2">Total {cur}</td>
                  <td className="text-right">{amt.toFixed(2)} {cur}</td>
                </tr>
              ))}
            </tfoot>
          </table>
        </div>
      )}

      <Link href="/admin/reports" className="mt-6 inline-block text-blue-600">
        ← Back to Reports
      </Link>
    </div>
  );
}
