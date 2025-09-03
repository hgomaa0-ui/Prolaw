"use client";
import { useState, useEffect } from 'react';
import { getAuth } from '@/lib/auth';

export default function SettingsPage() {
  const [rate,setRate]=useState<string>('');
  const token = getAuth();
  const fetchRate=async()=>{
    const res=await fetch('/api/settings/exchange-rate',{headers: token?{Authorization:`Bearer ${token}`}:{}});
    if(res.ok){const data=await res.json();if(data.rate) setRate(String(data.rate));}
  };
  useEffect(()=>{fetchRate();},[]);
  const save=async()=>{
    if(!rate) return;
    await fetch('/api/settings/exchange-rate',{method:'PUT',headers:{'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`}:{})},body:JSON.stringify({rate:Number(rate)})});
    alert('Saved');
  };
  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-4">Exchange Rate</h1>
      <div className="max-w-sm flex flex-col gap-2">
        <label className="text-sm">EGP per 1 USD</label>
        <input type="number" step="0.0001" className="border px-2 py-1 rounded" value={rate} onChange={e=>setRate(e.target.value)} />
        <button className="bg-blue-600 text-white px-4 py-2 rounded" onClick={save}>Save</button>
      </div>
    </div>
  );
}
