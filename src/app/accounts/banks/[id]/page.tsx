'use client';

import React from 'react';
import useSWR, { mutate } from 'swr';
import { useParams } from 'next/navigation';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const fetcher = async (url: string) => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  const res = await fetch(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error('Failed');
  return res.json();
};

function AddTxnForm({ bankId, currency }: { bankId: number; currency: string }) {
  const [amount, setAmount] = React.useState('');
  const [memo, setMemo] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  const headers: HeadersInit = token
    ? { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
    : { 'Content-Type': 'application/json' } as HeadersInit;

  return (
    <form
      className="mt-6 flex gap-2 items-center"
      onSubmit={async (e) => {
        e.preventDefault();
        if (!amount) return;
        setLoading(true);
        try {
          const res = await fetch('/api/bank-transactions', {
            method: 'POST',
            headers,
            body: JSON.stringify({ bankId, amount: Number(amount), currency, memo }),
          });
          if (res.ok) {
            setAmount('');
            setMemo('');
            mutate(`/api/banks/${bankId}`);
            mutate(`/api/bank-transactions?bankId=${bankId}`);
          } else {
            alert('Save failed');
          }
        } finally {
          setLoading(false);
        }
      }}
    >
      <input
        type="number"
        step="0.01"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        placeholder="Amount (+/-)"
        className="border px-2 py-1 w-32"
      />
      <input
        value={memo}
        onChange={(e) => setMemo(e.target.value)}
        placeholder="Memo"
        className="border px-2 py-1"
      />
      <button type="submit" disabled={loading || !amount} className="bg-green-600 text-white px-3 py-1 rounded">
        {loading ? 'Saving' : 'Add'}
      </button>
    </form>
  );
}

export default function BankDetailPage() {
  const params = useParams();
  const id = (params as any)?.id as string;
  const { data: bankData, isLoading } = useSWR(`/api/banks/${id}`, fetcher);
  const { data: txnsData } = useSWR(id ? `/api/bank-transactions?bankId=${id}` : null, fetcher);
  const bank = bankData as any;
  const txns = Array.isArray(txnsData) ? txnsData : [];
  const router = useRouter();
  if (isLoading) return <p className="p-8">Loading...</p>;
  return (
    <div className="p-8 space-y-6 max-w-3xl mx-auto">
      <div className="flex items-center gap-4">
        <button onClick={()=>router.back()} className="text-blue-600 underline">&larr; Back</button>
        <h1 className="text-2xl font-bold">{bank.name}</h1>
      </div>
      {(() => {
        const sumTxns = txns.reduce((acc:any,t:any)=>acc+Number(t.amount),0);
        const sumAdv = bank.advancePayments.reduce((acc:any,a:any)=>acc+Number(a.amount),0);
        // bank.balance already reflects advance payments effect
        const derived = sumTxns + sumAdv;
        const display = derived.toFixed(2);
        return <p className="text-lg">Balance: <span className="font-medium">{display} {bank.currency}</span></p>;
      })()} 

      <h2 className="text-xl font-semibold mt-6 mb-2">Transactions</h2>
      {(bank.advancePayments.length + txns.length) === 0 ? (
        <p className="text-sm text-gray-600">No transactions yet.</p>
      ) : (
        <>
          <table className="text-sm border min-w-full">
          <thead className="bg-gray-100"><tr><th className="border px-3 py-1 text-right">Amount</th><th className="border px-3 py-1">Date</th><th className="border px-3 py-1">Source</th><th className="border px-3 py-1">Actions</th></tr></thead>
          <tbody>
            {[...txns, ...bank.advancePayments].sort((a:any,b:any)=>new Date(b.createdAt??b.paidOn).getTime()-new Date(a.createdAt??a.paidOn).getTime()).map((item:any)=>{const isAdv=!!item.project;return(
              <tr key={item.id}>
                <td className="border px-3 py-1 text-right">{Number(item.amount).toFixed(2)} {item.currency}</td>
                <td className="border px-3 py-1">{new Date(item.paidOn ?? item.createdAt).toLocaleDateString()}</td>
                <td className="border px-3 py-1">
                  {isAdv ? (<Link href={`/projects/${item.project.id}`} className="text-blue-600 underline">{item.project.name}</Link>) : (item.memo || 'Manual')}
                </td>
                <td className="border px-3 py-1 text-center">
                  {(
                    <button className="text-red-600 hover:underline text-xs" onClick={async()=>{
                      if(!confirm('Delete transaction?')) return;
                      const token = typeof window!=='undefined'?localStorage.getItem('token'):null;
                      const headers: HeadersInit = {};
                      if(token) headers['Authorization'] = `Bearer ${token}`;
                      const url = isAdv ? `/api/advance-payments/${item.id}` : `/api/bank-transactions/${item.id}`;
                      const res = await fetch(url, { method:'DELETE', headers });
                      if(res.ok){
                        mutate(`/api/banks/${bank.id}`);
                        mutate(`/api/bank-transactions?bankId=${bank.id}`);
                      } else { alert('Delete failed'); }
                    }}>Delete</button>
                  )}
                </td>
              </tr>
            )})}
          </tbody>
        </table>
        </>
      )}
      {/* Add transaction form */}
      <AddTxnForm bankId={bank.id} currency={bank.currency} />
    </div>
  );
}
