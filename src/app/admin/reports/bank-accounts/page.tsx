"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface BankTxn {
  id: number;
  createdAt: string;
  amount: number;
  currency: string;
  memo: string | null;
}
interface BankItem {
  id: number;
  name: string;
  currency: string;
  balance: number;
}

export default function BankAccountsReport() {
  const today = new Date().toISOString().slice(0, 10);
  const [from, setFrom] = useState("2025-01-01");
  const [to, setTo] = useState(today);
  const [data, setData] = useState<BankItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [openId, setOpenId] = useState<number | null>(null);
  const [txnsByBank, setTxnsByBank] = useState<Record<number, BankTxn[]>>({});

  const fetchData = async () => {
    setLoading(true);
    try {
      const token = typeof window!=="undefined" ? localStorage.getItem('token'):null;
      const res = await fetch('/api/banks', { headers: token? { Authorization:`Bearer ${token}` }: {} });
      const json = await res.json();
      setData(Array.isArray(json) ? json : []);
    } finally {
      setLoading(false);
    }
  };

  const loadTxns = async (bankId:number) => {
    const token = typeof window!=="undefined" ? localStorage.getItem('token'):null;
    const url = new URL('/api/bank-transactions', window.location.origin);
    url.searchParams.set('bankId', String(bankId));
    const res = await fetch(url.toString(), { headers: token? { Authorization:`Bearer ${token}` }: {} });
    const json = await res.json();
    setTxnsByBank(prev => ({ ...prev, [bankId]: Array.isArray(json) ? json : [] }));
  };

  useEffect(() => { fetchData(); }, []); // initial

  return (
    <div className="p-8 space-y-6">
      <Link href="/admin/reports" className="text-blue-600 underline">&larr; Back to Reports</Link>
      <h1 className="text-2xl font-bold">Bank Accounts Report</h1>

      {/* Filters */}
      <div className="flex gap-4 items-end flex-wrap">
        <div>
          <label className="block text-sm font-medium">From</label>
          <input type="date" value={from} onChange={e=>setFrom(e.target.value)} className="border rounded px-2 py-1" />
        </div>
        <div>
          <label className="block text-sm font-medium">To</label>
          <input type="date" value={to} onChange={e=>setTo(e.target.value)} className="border rounded px-2 py-1" />
        </div>
        <button onClick={fetchData} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded">Search</button>
      </div>

      {loading ? <p>Loading…</p> : (
        <table className="min-w-full border text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="border px-2 py-1 text-left">Bank</th>
              <th className="border px-2 py-1 text-right">Balance</th>
            </tr>
          </thead>
          <tbody>
            {data.map(item => (
              <>
              <tr key={item.id} className="hover:bg-gray-50 cursor-pointer" onClick={()=>{
                const nextId = openId===item.id?null:item.id;
                setOpenId(nextId);
                if(nextId){ loadTxns(nextId); }
              }}>
                <td className="border px-2 py-1">{item.name}</td>
                <td className="border px-2 py-1 text-right">{item.balance.toFixed(2)} {item.currency}</td>
              </tr>
              {openId===item.id && (
                <tr>
                  <td colSpan={2} className="p-0">
                    <table className="w-full text-xs">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="border px-1 py-0.5">Date</th>
                          <th className="border px-1 py-0.5 text-right">Amount</th>
                          <th className="border px-1 py-0.5">Memo</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(txnsByBank[item.id] || []).map(t=> (
                          <tr key={t.id}>
                            <td className="border px-1 py-0.5">{new Date(t.createdAt).toLocaleDateString()}</td>
                            <td className="border px-1 py-0.5 text-right">{Number(t.amount).toFixed(2)} {t.currency}</td>
                            <td className="border px-1 py-0.5">{t.memo||'—'}</td>
                          </tr>
                        ))}
                        {!((txnsByBank[item.id] || []).length) && (
                          <tr><td className="border px-1 py-1 text-center text-gray-500" colSpan={3}>No transactions</td></tr>
                        )}
                      </tbody>
                    </table>
                  </td>
                </tr>
              )}
              </>
            ))}
            {!data.length && !loading && (
              <tr><td colSpan={2} className="text-center text-gray-500 py-4">No records</td></tr>
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}
