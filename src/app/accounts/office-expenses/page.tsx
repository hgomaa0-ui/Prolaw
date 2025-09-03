'use client';

import useSWR, { mutate } from 'swr';
import { useState } from 'react';
import Link from 'next/link';

const fetcher = async (url: string) => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  const res = await fetch(url, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
  return res.json();
};

export default function OfficeExpensesPage() {
  const { data: expensesData, isLoading: expensesLoading } = useSWR('/api/office-expenses', fetcher);
  const { data: banks } = useSWR('/api/banks', fetcher);

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  const headers: Record<string, string> = token
    ? { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
    : { 'Content-Type': 'application/json' };

  const [bankId, setBankId] = useState<number | ''>('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('EGP');
  const [notes, setNotes] = useState('');

  if (expensesLoading) return <p>Loading...</p>;
  const expenses = Array.isArray(expensesData) ? expensesData : [];

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bankId || !amount) return;
    const res = await fetch('/api/office-expenses', {
      method: 'POST',
      headers,
      body: JSON.stringify({ bankId, amount: Number(amount), currency, notes }),
    });
    if (res.ok) {
      mutate('/api/office-expenses');
      setAmount('');
      setNotes('');
    } else {
      alert('Save failed');
    }
  };

  return (
    <div className="p-8 space-y-6">
      <h1 className="text-2xl font-bold">Office Expenses</h1>
      <Link href="/accounts" className="text-blue-600 underline">&larr; Back to Accounts</Link>

      {expenses.length > 0 && (
        <table className="text-sm border min-w-full">
          <thead className="bg-gray-100">
            <tr>
              <th className="border px-3 py-1">Date</th>
              <th className="border px-3 py-1">Bank</th>
              <th className="border px-3 py-1 text-right">Amount</th>
              <th className="border px-3 py-1">Currency</th>
              <th className="border px-3 py-1">Notes</th>
            </tr>
          </thead>
          <tbody>
            {expenses.map((exp:any)=>(
              <tr key={exp.id} className="hover:bg-gray-50">
                <td className="border px-3 py-1">{new Date(exp.createdAt).toLocaleDateString()}</td>
                <td className="border px-3 py-1">{exp.bank?.name}</td>
                <td className="border px-3 py-1 text-right">{Number(exp.amount).toFixed(2)}</td>
                <td className="border px-3 py-1">{exp.currency}</td>
                <td className="border px-3 py-1">{exp.notes}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <form onSubmit={submit} className="flex flex-wrap gap-2 items-end">
        <select value={bankId} onChange={(e)=>setBankId(Number(e.target.value))} className="border px-2 py-1">
          <option value="">Select bank</option>
          {Array.isArray(banks) && banks.map((b:any)=>(<option key={b.id} value={b.id}>{`${b.name} (${b.currency})`}</option>))}
        </select>
        <input type="number" step="0.01" value={amount} onChange={(e)=>setAmount(e.target.value)} placeholder="Amount" className="border px-2 py-1" />
        <select value={currency} onChange={(e)=>setCurrency(e.target.value)} className="border px-2 py-1">
          {['EGP','USD','EUR','SAR','GBP'].map(c=>(<option key={c}>{c}</option>))}
        </select>
        <input value={notes} onChange={(e)=>setNotes(e.target.value)} placeholder="Notes" className="border px-2 py-1" />
        <button type="submit" className="bg-blue-600 text-white px-3 py-1 rounded">Add Expense</button>
      </form>
    </div>
  );
}
