"use client";

import React,{useState,useEffect} from "react";
import { getAuth } from "@/lib/auth";

interface Row{
  seq:number;
  id:number;
  name:string;
  leaveBalance:number;
  latestSalary:number;
  salaryCurrency:string;
  annualConsumed:number;
  unpaidDays:number;
  penaltiesTotal:number;
}

export default function HRReportPage(){
  const [data,setData]=useState<Row[]>([]);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState<string|null>(null);

  useEffect(()=>{
    const fetchData=async()=>{
      try{
        const token=getAuth();
        const res=await fetch('/api/hr/report',{headers:{Authorization:`Bearer ${token}`}});
        if(!res.ok) throw new Error(await res.text());
        setData(await res.json());
      }catch(e:any){setError(e.message);}finally{setLoading(false);}  
    };
    fetchData();
  },[]);

  const exportCSV=()=>{
    const rows=[["#","Name","Latest Salary","Currency","Leave Balance","Annual Used","Unpaid Days","Penalties"]].concat(
      data.map(r=>[r.seq,r.name,r.latestSalary,r.salaryCurrency,r.leaveBalance,r.annualConsumed,r.unpaidDays,r.penaltiesTotal])
    );
    const csv=rows.map(row=>row.map(f=>`"${String(f).replace(/"/g,'""')}"`).join(',')).join('\n');
    const blob=new Blob([csv],{type:'text/csv'});
    const url=URL.createObjectURL(blob);
    const a=document.createElement('a');
    a.href=url; a.download='hr_report.csv'; a.click(); URL.revokeObjectURL(url);
  }

  if(loading) return <p className="p-8">Loading…</p>;
  if(error) return <p className="p-8 text-red-600">{error}</p>;

  return (
    <div className="container mx-auto max-w-6xl p-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">HR Report</h1>
        <button onClick={exportCSV} className="rounded bg-blue-600 px-4 py-2 text-white">Export CSV</button>
      </div>
      <div className="overflow-auto border rounded">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-100 text-left">
            <tr>
              <th className="border px-3 py-2">#</th>
              <th className="border px-3 py-2">Employee</th>
              <th className="border px-3 py-2">Salary</th>
              <th className="border px-3 py-2">Leave Balance</th>
              <th className="border px-3 py-2">Annual Used (yr)</th>
              <th className="border px-3 py-2">Unpaid Days</th>
              <th className="border px-3 py-2">Penalties</th>
            </tr>
          </thead>
          <tbody>
            {data.map(r=> (
              <tr key={r.id} className="hover:bg-gray-50">
                <td className="border px-3 py-2">{r.seq}</td>
                <td className="border px-3 py-2">{r.name}</td>
                <td className="border px-3 py-2">{r.latestSalary.toFixed(2)} {r.salaryCurrency}</td>
                <td className="border px-3 py-2">{r.leaveBalance}</td>
                <td className="border px-3 py-2">{r.annualConsumed}</td>
                <td className="border px-3 py-2">{r.unpaidDays}</td>
                <td className="border px-3 py-2">{r.penaltiesTotal}</td>
              </tr>
            ))}
            {data.length===0 && (
              <tr><td colSpan={6} className="border px-3 py-4 text-center text-gray-500">No data</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
