'use client';

import useSWR, { mutate } from 'swr';
import { useState } from 'react';
import Link from 'next/link';

const fetcher = async (url: string) => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  const res = await fetch(url, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
  return res.json();
};

export default function BankTransferPage() {
  const { data: banksData, isLoading } = useSWR('/api/banks', fetcher);
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  const headers: Record<string, string> = token
    ? { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
    : { 'Content-Type': 'application/json' };

  const banks = Array.isArray(banksData) ? banksData : [];

  const [fromBankId, setFromBankId] = useState<number | ''>('');
  const [toBankId, setToBankId] = useState<number | ''>('');
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fromBankId || !toBankId || !amount) return;
    setBusy(true);
    const res = await fetch('/api/bank-transfers', {
      method: 'POST',
      headers,
      body: JSON.stringify({ fromBankId, toBankId, amount: Number(amount), notes }),
    });
    setBusy(false);
    if (res.ok) {
      alert('Transfer successful');
      mutate('/api/banks');
      setAmount('');
      setNotes('');
    } else {
      const j = await res.json();
      alert(j.error || 'Transfer failed');
    }
  };

  if (isLoading) return <p>Loading...</p>;

  return (
    <div className="p-8 space-y-6">
      <h1 className="text-2xl font-bold">Bank Transfer</h1>
      <Link href="/accounts/banks" className="text-blue-600 underline">&larr; Back to Banks</Link>

      <form onSubmit={submit} className="flex flex-wrap gap-2 items-end mt-6 max-w-lg">
        <div className="flex flex-col">
          <label className="text-sm">From Bank</label>
          <select value={fromBankId} onChange={(e)=>setFromBankId(Number(e.target.value))} className="border px-2 py-1">
            <option value="">Select bank</option>
            {banks.map((b:any)=>(<option key={b.id} value={b.id}>{`${b.name} (${b.currency})`}</option>))}
          </select>
        </div>
        <div className="flex flex-col">
          <label className="text-sm">To Bank</label>
          <select value={toBankId} onChange={(e)=>setToBankId(Number(e.target.value))} className="border px-2 py-1">
            <option value="">Select bank</option>
            {banks.map((b:any)=>(<option key={b.id} value={b.id}>{`${b.name} (${b.currency})`}</option>))}
          </select>
        </div>
        <div className="flex flex-col">
          <label className="text-sm">Amount</label>
          <input type="number" step="0.01" value={amount} onChange={(e)=>setAmount(e.target.value)} className="border px-2 py-1" />
        </div>
        <div className="flex flex-col flex-1">
          <label className="text-sm">Notes</label>
          <input value={notes} onChange={(e)=>setNotes(e.target.value)} className="border px-2 py-1 w-full" />
        </div>
        <button disabled={busy} type="submit" className="bg-blue-600 text-white px-3 py-1 rounded disabled:opacity-50">{busy ? 'Processing...' : 'Transfer'}</button>
      </form>
    </div>
  );
}
