"use client";
import React, { useEffect, useState } from "react";
import { getAuth } from "@/lib/auth";

interface Lawyer { id:number; name:string }
interface Project { id:number; name:string; clientId:number }

export default function AdminTimeEntryPage(){
  const [lawyers,setLawyers]=useState<Lawyer[]>([]);
  const [projects,setProjects]=useState<Project[]>([]);
  const [userId,setUserId]=useState<number|"")("");
  const [projectId,setProjectId]=useState<number|"")("");
  const [date,setDate]=useState("");
  const [hours,setHours]=useState<string>("");
  const [notes,setNotes]=useState("");
  const [loading,setLoading]=useState(true);
  const [saving,setSaving]=useState(false);
  const [error,setError]=useState<string|null>(null);
  const token = getAuth();

  useEffect(()=>{
    const load = async()=>{
      try{
        const headers = token? { Authorization:`Bearer ${token}` } : {} as any;
        const [lawyersRes, projRes] = await Promise.all([
          fetch('/api/lawyers',{ headers }),
          fetch('/api/projects',{ headers })
        ]);
        const law = await lawyersRes.json();
        const pro = await projRes.json();
        setLawyers(Array.isArray(law)? law: []);
        setProjects(Array.isArray(pro)? pro: []);
      }catch(e:any){ setError(e.message); }
      finally{ setLoading(false); }
    };
    load();
  },[token]);

  const submit = async(e:React.FormEvent)=>{
    e.preventDefault();
    if(!token || userId==="" || projectId==="" || !date || !hours) return;
    const h = Number(hours); if(isNaN(h) || h<=0){ alert('Enter valid hours'); return; }
    setSaving(true); setError(null);
    try{
      const res = await fetch('/api/admin/time-entries',{
        method:'POST',
        headers:{ 'Content-Type':'application/json', Authorization:`Bearer ${token}` },
        body: JSON.stringify({ userId:Number(userId), projectId:Number(projectId), date, hours:h, notes })
      });
      const data = await (async()=>{ const ct=res.headers.get('content-type')||''; return ct.includes('application/json')? res.json(): null; })();
      if(!res.ok) throw new Error((data as any)?.error || res.statusText);
      setDate(""); setHours(""); setNotes("");
      alert('Time entry added');
    }catch(err:any){ setError(err.message); }
    finally{ setSaving(false); }
  };

  if(loading) return <div className="p-6">Loading…</div>;
  return (
    <div className="container mx-auto max-w-3xl p-6">
      <h1 className="text-2xl font-bold mb-4">Admin: Add Time Entry</h1>
      {error && <p className="text-red-600 mb-3">{error}</p>}
      <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2">
        <select value={userId} onChange={e=>setUserId(e.target.value? Number(e.target.value):"")} className="rounded border px-3 py-2" required>
          <option value="">Select Lawyer</option>
          {lawyers.map(l=>(<option key={l.id} value={l.id}>{l.name}</option>))}
        </select>
        <select value={projectId} onChange={e=>setProjectId(e.target.value? Number(e.target.value):"")} className="rounded border px-3 py-2" required>
          <option value="">Select Project</option>
          {projects.map(p=>(<option key={p.id} value={p.id}>{p.name}</option>))}
        </select>
        <input type="date" value={date} onChange={e=>setDate(e.target.value)} className="rounded border px-3 py-2" required />
        <input type="number" step="0.25" min="0" placeholder="Hours" value={hours} onChange={e=>setHours(e.target.value)} className="rounded border px-3 py-2" required />
        <input type="text" placeholder="Notes" value={notes} onChange={e=>setNotes(e.target.value)} className="rounded border px-3 py-2 sm:col-span-2" />
        <div className="sm:col-span-2">
          <button disabled={saving} className="rounded bg-blue-600 px-4 py-2 text-white disabled:opacity-50">{saving? 'Saving…':'Save'}</button>
        </div>
      </form>
    </div>
  );
}
