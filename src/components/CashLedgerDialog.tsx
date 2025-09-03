"use client";
import React, { useEffect, useState } from "react";
import { getAuth } from "@/lib/auth";

interface Line {
  id: number;
  createdAt: string;
  memo: string | null;
  debit: number;
  credit: number;
  currency: string;
  type?: string;
  projectName?: string | null;
  clientName?: string | null;
  balance: number;
}

interface Props {
  open: boolean;
  onClose: () => void;
  allowDelete?: boolean;
}

export default function CashLedgerDialog({ open, onClose, allowDelete = false }: Props) {
  const token = getAuth();
  const companyId = (() => {
    if (!token) return null;
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.companyId as number | undefined;
    } catch {
      return null;
    }
  })();
  const [lines, setLines] = useState<Line[]>([]);
  const [loading, setLoading] = useState(false);
  const [addMode,setAddMode]=useState(false);
  const [amount,setAmount]=useState('');
  const [direction,setDirection]=useState<'IN'|'OUT'>('IN');
  const [currency,setCurrency]=useState('USD');
  const [memoInput,setMemoInput]=useState('');
  const [saving,setSaving]=useState(false);

  // totals per currency
  const totals = React.useMemo(() => {
    const map: Record<string, number> = {};
    for (const l of lines) {
      map[l.currency] = (map[l.currency] ?? 0) + (l.debit - l.credit);
    }
    return map;
  }, [lines]);

  useEffect(() => {
    if (!open || !token) return;
    const fetchLines = async () => {
      setLoading(true);
      const res = await fetch(`/api/cash${companyId ? `?companyId=${companyId}` : ''}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      if (res.ok) setLines(await res.json());
      setLoading(false);
    };
    fetchLines();
  }, [open, token]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-20">
      <div className="max-h-[90vh] w-full max-w-4xl overflow-hidden rounded bg-white shadow-lg">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-4 py-2">
          <div className="flex items-center gap-4">
          <h2 className="text-lg font-semibold">Cash Ledger</h2>
            <div className="flex gap-2 text-xs text-gray-700">
              {Object.entries(totals).map(([cur, val]) => (
                <span key={cur} className={val<0? 'text-red-600':''}>
                  {cur} {val.toFixed(2)}
                </span>
              ))}
            </div>
            <button onClick={()=>setAddMode(p=>!p)} className="rounded bg-blue-600 px-3 py-1 text-white text-xs hover:bg-blue-700">
              {addMode? 'Cancel' : 'Add'}
            </button>
          </div>
          <button onClick={onClose} className="text-red-600 hover:text-red-800">
            ✕
          </button>
        </div>
        {/* Add form */}
        {addMode && (
          <form
            className="flex flex-wrap items-end gap-2 border-b px-4 py-3 text-sm"
            onSubmit={async(e)=>{
              e.preventDefault();
              if(!token) return;
              setSaving(true);
              const res=await fetch(`/api/cash${companyId ? `?companyId=${companyId}` : ''}`,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},body:JSON.stringify({amount:Number(amount),currency,direction,memo:memoInput})});
              setSaving(false);
              if(res.ok){
                setAddMode(false);
                setAmount('');setMemoInput('');
                // refresh
                const lines=await (await fetch(`/api/cash${companyId ? `?companyId=${companyId}` : ''}`,{headers: token ? {Authorization:`Bearer ${token}`} : undefined})).json();
                setLines(lines);
              }else{
                alert('Save failed');
              }
            }}
          >
            <input required type="number" step="0.01" value={amount} onChange={e=>setAmount(e.target.value)} placeholder="Amount" className="w-24 rounded border px-2 py-1" />
            <select value={currency} onChange={e=>setCurrency(e.target.value)} className="rounded border px-2 py-1">
              <option value="USD">USD</option>
              <option value="EGP">EGP</option>
              <option value="SAR">SAR</option>
            </select>
            <select value={direction} onChange={e=>setDirection(e.target.value as any)} className="rounded border px-2 py-1">
              <option value="IN">In</option>
              <option value="OUT">Out</option>
            </select>
            <input value={memoInput} onChange={e=>setMemoInput(e.target.value)} placeholder="Memo" className="flex-1 rounded border px-2 py-1" />
            <button type="submit" disabled={saving} className="rounded bg-green-600 px-3 py-1 text-white hover:bg-green-700">
              {saving? 'Saving…':'Save'}
            </button>
          </form>
        )}

        {/* Body */}
        <div className="overflow-auto p-4">
          {loading ? (
            <p>Loading…</p>
          ) : (
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border px-3 py-2">Date</th>
                  <th className="border px-3 py-2">Client</th>
                  <th className="border px-3 py-2">Project</th>
                  <th className="border px-3 py-2">Type</th>
                  <th className="border px-3 py-2">Memo</th>
                  <th className="border px-3 py-2 text-right">Debit</th>
                  <th className="border px-3 py-2 text-right">Credit</th>
                  <th className="border px-3 py-2 text-right">Balance</th>
                  {allowDelete && <th className="border px-3 py-2">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {lines.map((l) => (
                  <tr key={l.id} className="odd:bg-white even:bg-gray-50">
                    <td className="border px-3 py-1 whitespace-nowrap">
                      {new Date(l.createdAt).toLocaleDateString()}
                    </td>
                    <td className="border px-3 py-1">{l.clientName ?? "-"}</td>
                    <td className="border px-3 py-1">{l.projectName ?? "-"}</td>
                    <td className="border px-3 py-1">{l.type ?? ""}</td>
                    <td className="border px-3 py-1 max-w-[200px] truncate">
                      {l.memo ?? ""}
                    </td>
                    <td className="border px-3 py-1 text-right font-mono">
                      {l.debit ? `${l.currency} ${l.debit.toFixed(2)}` : ""}
                    </td>
                    <td className="border px-3 py-1 text-right font-mono">
                      {l.credit ? `${l.currency} ${l.credit.toFixed(2)}` : ""}
                    </td>
                    <td
                      className={`border px-3 py-1 text-right font-mono ${
                        l.balance < 0 ? "text-red-600" : ""
                      }`}
                    >
                      {`${l.currency} ${l.balance.toFixed(2)}`}
                    </td>
                    {allowDelete && (
                      <td className="border px-3 py-1 text-center">
                      {l.id < 1000000 && (
                        <button
                          onClick={async () => {
                            if (!confirm('Delete entry?')) return;
                            await fetch(`/api/cash/${l.id}`, { method: 'DELETE', headers: token ? { Authorization: `Bearer ${token}` } : undefined });
                            // refresh list
                            const res = await fetch(`/api/cash${companyId ? `?companyId=${companyId}` : ''}`, {
                              headers: token ? { Authorization: `Bearer ${token}` } : undefined,
                            });
                            if (res.ok) setLines(await res.json());
                          }}
                          className="text-red-600 text-xs hover:text-red-800"
                        >
                          Delete
                        </button>
                      )}
                    </td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
