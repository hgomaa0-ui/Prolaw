'use client';

import useSWR, { mutate } from 'swr';
import { useState } from 'react';
import Link from 'next/link';

const fetcher = async (url: string) => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  const res = await fetch(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  return res.json();
};

export default function BanksPage() {
  const { data, isLoading } = useSWR('/api/banks', fetcher);
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  const headers = token ? { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` } : { 'Content-Type': 'application/json' };
  const [name, setName] = useState('');
  const [currency, setCurrency] = useState('EGP');
  if (isLoading) return <p>Loading...</p>;
  const banks = Array.isArray(data) ? data : [];

  return (
    <div className="p-8 space-y-6">
      <h1 className="text-2xl font-bold">Banks</h1>
      <Link href="/accounts/banks/transfer" className="text-blue-600 underline ml-4 text-sm">Transfer Funds</Link>
      <Link href="/accounts/project-trust" className="text-blue-600 underline">&larr; Back to Trust Accounts</Link>

      {banks.length > 0 && (
        <table className="text-sm border min-w-full">
          <thead className="bg-gray-100"><tr><th className="border px-3 py-1">Name</th><th className="border px-3 py-1">Currency</th><th className="border px-3 py-1 text-right">Balance</th></tr></thead>
          <tbody>
            {banks.map((b:any)=>(
              <tr key={b.id} className="hover:bg-gray-50 cursor-pointer" onClick={()=>location.href=`/accounts/banks/${b.id}` }><td className="border px-3 py-1 text-blue-600 underline">{b.name}</td><td className="border px-3 py-1">{b.currency}</td><td className="border px-3 py-1 text-right">{Number((b.derived ?? b.balance)).toFixed(2)}</td></tr>
            ))}
          </tbody>
        </table>
      )}

      <form className="flex gap-2 items-center" onSubmit={async(e)=>{e.preventDefault();if(!name)return;const res=await fetch('/api/banks',{method:'POST',headers,body:JSON.stringify({name,currency})});if(res.ok){mutate('/api/banks');setName('');}else{alert('Save failed');}}}>
        <input value={name} onChange={(e)=>setName(e.target.value)} placeholder="Bank name" className="border px-2 py-1" />
        <select value={currency} onChange={(e)=>setCurrency(e.target.value)} className="border px-2 py-1">
          {['EGP','USD','EUR','SAR','GBP'].map(c=>(<option key={c}>{c}</option>))}
        </select>
        <button type="submit" className="bg-blue-600 text-white px-3 py-1 rounded">Add Bank</button>
      </form>
    </div>
  );
}
