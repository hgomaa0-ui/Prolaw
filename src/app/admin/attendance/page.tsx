"use client";
import React, { useState, useEffect } from "react";
import { getAuth } from "@/lib/auth";

interface Record {
  id: number;
  employeeId: number;
  employee: { name: string };
  clockIn: string;
  clockOut?: string;
}

export default function AttendancePage() {
  const [records, setRecords] = useState<Record[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState({ from: "", to: "" });

  const token = getAuth();

  const fetchData = async () => {
    try {
      const url = `/api/attendance?from=${filter.from}&to=${filter.to}`;
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error(await res.text());
      const json = await res.json();
      setRecords(json);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const hoursDiff = (start: string, end?: string) => {
    if (!end) return "—";
    const diffMs = new Date(end).getTime() - new Date(start).getTime();
    return (diffMs / 1000 / 60 / 60).toFixed(2);
  };

  const totalHours = records.reduce((sum, r) => {
    if (r.clockOut) {
      return sum + (new Date(r.clockOut).getTime() - new Date(r.clockIn).getTime()) / 36e5;
    }
    return sum;
  }, 0);

  return (
    <div className="container mx-auto max-w-6xl p-8 space-y-6">
      <h1 className="text-3xl font-bold">Attendance</h1>

      <div className="flex flex-wrap items-end gap-4 border p-4 rounded">
        <div>
          <label className="block text-sm">From</label>
          <input type="date" value={filter.from} onChange={(e)=>setFilter({...filter,from:e.target.value})} className="rounded border px-3 py-2" />
        </div>
        <div>
          <label className="block text-sm">To</label>
          <input type="date" value={filter.to} onChange={(e)=>setFilter({...filter,to:e.target.value})} className="rounded border px-3 py-2" />
        </div>
        <button onClick={fetchData} className="rounded bg-gray-600 px-4 py-2 text-white">Apply</button>
        <button onClick={()=>{
            const q=`from=${filter.from}&to=${filter.to}`;
            window.location.href=`/api/attendance/export?${q}`;
        }} className="rounded bg-blue-600 px-4 py-2 text-white">Export CSV</button>
        <label className="inline-flex items-center gap-2 cursor-pointer text-white bg-green-600 px-4 py-2 rounded">
          Import CSV
          <input type="file" accept=".csv" className="hidden" onChange={async(e)=>{
            const file=e.target.files?.[0];
            if(!file) return;
            const fd=new FormData();fd.append('file',file);
            const res=await fetch('/api/attendance/import',{method:'POST',body:fd});
            if(res.ok){alert('Imported');fetchData();}else{alert(await res.text());}
            e.target.value='';
          }} />
        </label>
        <div className="ml-auto text-sm font-medium">Total Hours: {totalHours.toFixed(2)}</div>
      </div>

      {loading && <p>Loading…</p>}
      {error && <p className="text-red-600">{error}</p>}

      <table className="min-w-full border-collapse">
        <thead>
          <tr className="bg-gray-100 text-left">
            <th className="border px-4 py-2">Employee</th>
            <th className="border px-4 py-2">Clock In</th>
            <th className="border px-4 py-2">Clock Out</th>
            <th className="border px-4 py-2">Hours</th>
          </tr>
        </thead>
        <tbody>
          {records.map((r) => (
            <tr key={r.id} className="hover:bg-gray-50">
              <td className="border px-4 py-2">{r.employee.name}</td>
              <td className="border px-4 py-2">{new Date(r.clockIn).toLocaleString()}</td>
              <td className="border px-4 py-2">{r.clockOut ? new Date(r.clockOut).toLocaleString() : "—"}</td>
              <td className="border px-4 py-2">{hoursDiff(r.clockIn, r.clockOut)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
