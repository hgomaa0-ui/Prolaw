○ Compiling /api/invoices/[id]/pdf ...
✓ Compiled /api/invoices/[id]/pdf in 907ms (726 modules)
GET /api/invoices/INV-00006/pdf 401 in 3072ms
GET /api/invoices/INV-00006/pdf 401 in 58ms
GET /api/invoices/INV-00006/pdf 401 in 46ms ✓ Compiled /api/invoices/[id]/pdf in 3.1s (451 modules)
GET /api/invoices/INV-00006/pdf 401 in 5696ms

import { useState } from 'react';
import useSWR, { mutate } from 'swr';
import Link from 'next/link';

const fetcher = async (url: string) => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  const res = await fetch(url, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
  return res.json();
};

export default function SalariesApprovePage() {
  const { data: runs, isLoading: loadingRuns } = useSWR('/api/salaries/pending', fetcher);
  const { data: banks } = useSWR('/api/banks', fetcher);

  const [selectedRun, setSelectedRun] = useState<any>(null);
  const [bankId, setBankId] = useState<number | ''>('');
  const [busy, setBusy] = useState(false);

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  const headers: Record<string, string> = token ? { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` } : { 'Content-Type': 'application/json' };

  const approve = async () => {
    if (!selectedRun || !bankId) return;
    setBusy(true);
    const res = await fetch('/api/salaries/approve', {
      method: 'POST',
      headers,
      body: JSON.stringify({ batchId: selectedRun.id, bankId }),
    });
    setBusy(false);
    if (res.ok) {
      alert('Approved successfully');
      setSelectedRun(null);
      setBankId('');
      mutate('/api/salaries/pending');
      mutate('/api/banks');
    } else {
      let msg='Approval failed';
      try {
        const txt = await res.text();
        try{ const j=JSON.parse(txt); msg=j.error||msg; }
        catch{ msg = txt || msg; }
      } catch {}
      alert(msg);
    }
  };

  if (loadingRuns) return <p className="p-8">Loading...</p>;

  return (
    <div className="p-8 space-y-6">
      <h1 className="text-2xl font-bold">Pending Salary Batches</h1>
      <Link href="/accounts" className="text-blue-600 underline">&larr; Back to Accounts</Link>

      {Array.isArray(runs) && runs.length > 0 ? (
        <table className="text-sm border min-w-full mt-4">
          <thead className="bg-gray-100"><tr><th className="border px-3 py-1">Period</th><th className="border px-3 py-1 text-right">Payslips</th><th className="border px-3 py-1 text-right">Total</th><th className="border px-3 py-1"></th></tr></thead>
          <tbody>
            {runs.map((r:any)=>(
              <tr key={r.id} className="hover:bg-gray-50">
                <td className="border px-3 py-1">{r.period}</td>
                <td className="border px-3 py-1 text-right">{r.payslipCount}</td>
                <td className="border px-3 py-1 text-right">{r.total.toFixed(2)}</td>
                <td className="border px-3 py-1 text-center"><button className="text-blue-600 underline" onClick={()=>{setSelectedRun(r);setBankId('');}}>Approve</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : <p>No pending salary batches.</p>}

      {selectedRun && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center">
          <div className="bg-white p-6 rounded shadow max-w-sm w-full space-y-4">
            <h2 className="text-lg font-semibold">Approve {selectedRun.period} – {selectedRun.total.toFixed(2)}</h2>
            <div className="flex flex-col">
              <label className="text-sm mb-1">Select Bank</label>
              <select value={bankId} onChange={(e)=>setBankId(Number(e.target.value))} className="border px-2 py-1">
                <option value="">Choose bank</option>
                {Array.isArray(banks) && banks.map((b:any)=>(<option key={b.id} value={b.id}>{`${b.name} (${b.currency}) - Bal: ${Number(b.balance).toFixed(2)}`}</option>))}
              </select>
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={()=>setSelectedRun(null)} className="px-3 py-1 border rounded">Cancel</button>
              <button disabled={!bankId||busy} onClick={approve} className="px-3 py-1 bg-blue-600 text-white rounded disabled:opacity-50">{busy?'Processing...':'Confirm'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
