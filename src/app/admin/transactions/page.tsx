'use client';

import React, { useEffect, useState } from 'react';
import { getAuth } from '@/lib/auth';

interface TxnLine { id:number; accountId:number; debit:number; credit:number; currency:string; }
interface Txn { id:number; date:string; memo:string|null; lines:TxnLine[]; }

function sumAmount(lines:TxnLine[]){
  return lines.reduce((s,l)=> s + Number(l.debit||0) - Number(l.credit||0),0);
}

export default function TransactionsPage(){
  const token = getAuth();
  const [txns,setTxns]=useState<Txn[]>([]);
  const [loading,setLoading]=useState(false);

  const fetchTxns = async ()=>{
    if(!token) return;
    setLoading(true);
    const res = await fetch('/api/transactions', { headers:{ Authorization:`Bearer ${token}` } });
    if(res.ok){ setTxns(await res.json()); }
    setLoading(false);
  };

  useEffect(()=>{ fetchTxns(); },[token]);

  const handleDelete = async(id:number)=>{
    if(!token) return;
    if(!confirm('Delete this transaction?')) return;
    const res = await fetch(`/api/transactions/${id}`,{ method:'DELETE', headers:{ Authorization:`Bearer ${token}` }});
    if(res.ok){ setTxns(txns.filter(t=>t.id!==id)); }
    else alert('Delete failed');
  };

  return (
    <div className="container mx-auto max-w-5xl p-8">
      <h1 className="mb-6 text-3xl font-bold">Transactions</h1>
      {loading ? 'Loading…' : (
        <table className="w-full border-collapse text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="border px-3 py-2 text-left">#</th>
              <th className="border px-3 py-2 text-left">Date</th>
              <th className="border px-3 py-2 text-left">Memo</th>
              <th className="border px-3 py-2 text-right">Net</th>
              <th className="border px-3 py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {txns.map(tx=>{
              const net = sumAmount(tx.lines);
              return (
                <tr key={tx.id} className="odd:bg-white even:bg-gray-50">
                  <td className="border px-3 py-2">{tx.id}</td>
                  <td className="border px-3 py-2">{new Date(tx.date).toLocaleDateString()}</td>
                  <td className="border px-3 py-2">{tx.memo}</td>
                  <td className={`border px-3 py-2 text-right font-mono ${net<0?'text-red-600':''}`}>{net.toFixed(2)}</td>
                  <td className="border px-3 py-2 text-right">
                    <button onClick={()=>handleDelete(tx.id)} className="text-red-600 hover:text-red-900 text-xs">Delete</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
