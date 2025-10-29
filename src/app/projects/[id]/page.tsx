"use client";

import { useEffect, useState } from "react";
import useSWR from 'swr';
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { toast, Toaster } from "react-hot-toast";
import ProjectTaskModal from "../../../components/ProjectTaskModal";
import { getAuth } from "@/lib/auth";

interface Payment {
  id: number;
  amount: number;
  currency: string;
  bank?: { id: number; name: string } | null;
  paidOn: string;
  notes: string | null;
  accountType: 'TRUST' | 'EXPENSE';
}

export default function ProjectDetailPage() {
  const params = useParams();
  const projectId = Number(params?.id);
  if (Number.isNaN(projectId)) {
    return (
      <div className="p-6 text-red-600">Invalid project ID</div>
    );
  }

  interface Attachment { id:number; url:string; type:string; createdAt:string; }

  const router = useRouter();
  const token = getAuth();

  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);

  // attachments
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [attType, setAttType] = useState<'POWER_OF_ATTORNEY'|'CONTRACT'|'OTHER'>('OTHER');
  const [attFiles, setAttFiles] = useState<FileList|null>(null);
  const [showTaskModal, setShowTaskModal] = useState(false);

  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [notes, setNotes] = useState("");
  const [bankId, setBankId] = useState<number | ''>('');
  const { data: banks } = useSWR('/api/banks', (url: string)=>fetch(url,{headers: token?{Authorization:`Bearer ${token}`}:{}}).then(r=>r.json()));
  const [accountType, setAccountType] = useState<'TRUST' | 'EXPENSE'>("TRUST");
  const [editId, setEditId] = useState<number | null>(null);

  const fetchPayments = async () => {
    try {
      const res = await fetch(`/api/advance-payments?projectId=${projectId}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      if (!res.ok) throw new Error("Failed fetch");
      const data = await res.json();
      setPayments(data);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load payments");
    } finally {
      setLoading(false);
    }
  };

  const fetchAttachments = async()=>{
    try{
      const res = await fetch(`/api/projects/${projectId}/attachments`, { headers: token?{Authorization:`Bearer ${token}`}:{}});
      if(res.ok){ setAttachments(await res.json()); }
    }catch(e){ console.error(e);} };

  const uploadAttachments = async()=>{
    if(!attFiles || attFiles.length===0) return;
    const fd = new FormData();
    Array.from(attFiles).forEach(f=>fd.append('files', f));
    fd.append('type', attType);
    const res = await fetch(`/api/projects/${projectId}/attachments`, { method:'POST', body:fd, headers: token?{Authorization:`Bearer ${token}`}:{}});
    if(res.ok){ toast.success('Uploaded'); setAttFiles(null); fetchAttachments(); } else { toast.error('Upload failed'); }
  };

  const submitPayment = async () => {
    if (!amount) return;
    try {
      const endpoint = editId ? `/api/advance-payments/${editId}` : `/api/advance-payments`;
      const method = editId ? "PUT" : "POST";
      const res = await fetch(endpoint, {
        method,
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          projectId,
          amount: parseFloat(amount),
          currency,
          accountType,
          notes: notes.trim() || null,
          bankId: bankId || null,
        }),
      });
      if (!res.ok) throw new Error(editId ? "Failed update" : "Failed add");
      toast.success(editId ? "Payment updated" : "Payment added");
      setAmount("");
      setNotes("");
      setEditId(null);
      fetchPayments();
    } catch (err) {
      console.error(err);
      toast.error("Add failed");
    }
  };

  useEffect(() => {
    fetchPayments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="container mx-auto p-6 max-w-3xl">
      <Toaster />
      <h1 className="text-2xl font-bold mb-4">Advance Payments</h1>
      <p className="mb-6 text-sm text-gray-600">
        Project ID: {projectId}
      </p>

      {/* Add payment form */}
      <div className="bg-gray-50 p-4 rounded border mb-8">
        <h2 className="font-semibold mb-2">Add Payment</h2>
        <div className="flex flex-wrap gap-3 items-end">
          <input
            type="number"
            step="0.01"
            placeholder="Amount"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="border px-2 py-1 rounded w-32"
          />
          <select
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            className="border px-1 py-1 rounded"
          >
            {["USD","EUR","GBP","SAR","EGP","AED","QAR","KWD","OMR","JPY","CNY","INR"].map((c)=>(
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          {/* Account type */}
          <div className="flex items-center gap-2 text-sm">
            <label className="flex items-center gap-1">
              <input
                type="radio"
                name="acctType"
                value="TRUST"
                checked={accountType === 'TRUST'}
                onChange={() => setAccountType('TRUST')}
              />
              Trust
            </label>
            <label className="flex items-center gap-1">
              <input
                type="radio"
                name="acctType"
                value="EXPENSE"
                checked={accountType === 'EXPENSE'}
                onChange={() => setAccountType('EXPENSE')}
              />
              Expense
            </label>
          </div>
          <select
            value={bankId}
            onChange={(e)=>setBankId(e.target.value?Number(e.target.value):'')}
            className="border px-1 py-1 rounded"
          >
            <option value="">{Array.isArray(banks)?'Select Bank':'Loading banks...'}</option>
            {Array.isArray(banks)&&banks.filter((b:any)=>b.currency===currency).map((b:any)=>(<option key={b.id} value={b.id}>{b.name}</option>))}
          </select>
          <input
            type="text"
            placeholder="Notes (optional)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="border px-2 py-1 rounded flex-1"
          />
          <button
            onClick={submitPayment}
            disabled={!amount || !bankId}
            className="bg-blue-600 text-white rounded px-4 py-1 hover:bg-blue-700 disabled:opacity-50"
          >
            Add
          </button>
        </div>
      </div>

      {/* Attachments section */}
      <div className="bg-gray-50 p-4 rounded border mb-8">
        <h2 className="font-semibold mb-2">Project Attachments</h2>
        <div className="flex flex-wrap items-center gap-3 mb-3">
          <select value={attType} onChange={e=>setAttType(e.target.value as any)} className="border px-2 py-1 rounded">
            <option value="POWER_OF_ATTORNEY">Power of Attorney</option>
            <option value="CONTRACT">Contract</option>
            <option value="OTHER">Other</option>
          </select>
          <input type="file" multiple onChange={e=>setAttFiles(e.target.files)} className="border px-2 py-1" />
          <button onClick={uploadAttachments} disabled={!attFiles || attFiles.length===0} className="bg-blue-600 text-white px-4 py-1 rounded disabled:opacity-50">Upload</button>
        </div>

        {attachments.length===0 ? <p className="text-sm text-gray-600">No attachments yet.</p> : (
          <table className="text-sm border min-w-full">
            <thead className="bg-gray-100"><tr><th className="border px-2 py-1">Type</th><th className="border px-2 py-1">Uploaded</th><th className="border px-2 py-1">File</th><th className="border px-2 py-1 text-right">Actions</th></tr></thead>
            <tbody>
              {attachments.map(a=> (
                <tr key={a.id}><td className="border px-2 py-1">{a.type}</td><td className="border px-2 py-1">{new Date(a.createdAt).toLocaleDateString()}</td><td className="border px-2 py-1"><a href={a.url} target="_blank" rel="noopener" className="text-blue-600 underline">View</a></td><td className="border px-2 py-1 text-right"><button onClick={async()=>{if(!confirm('Delete file?')) return; const res=await fetch(`/api/project-attachments/${a.id}`,{method:'DELETE', headers: token?{Authorization:`Bearer ${token}`}:{}}); if(res.ok){toast.success('Deleted'); fetchAttachments();} else {toast.error('Delete failed');}}} className="text-red-600 underline text-xs">Delete</button></td></tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Project Task button */}
      <div className="mb-8">
        <button onClick={()=>setShowTaskModal(true)} className="bg-blue-600 text-white px-4 py-1 rounded text-sm">Add Task</button>
      </div>
      import TasksTable from '@/components/TasksTable';
...
<AddTaskButton projectId={project.id} />
<TasksTable projectId={project.id} />
      {showTaskModal && (
        <ProjectTaskModal projectId={projectId} onClose={()=>setShowTaskModal(false)} />
      )}

      {/* Payments table */}
      {loading ? (
        <p>Loading…</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Bank</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Notes</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {payments.map((p) => (
                <tr key={p.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {new Date(p.paidOn).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {p.amount} {p.currency}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {p.accountType === 'TRUST' ? 'Trust' : 'Expense'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {p.bank?.name || '—'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {p.notes || "—"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                    <button
                      className="text-blue-600 hover:underline mr-4 text-xs"
                      onClick={() => {
                        setEditId(p.id);
                        setAmount(String(p.amount));
                        setCurrency(p.currency);
                        setNotes(p.notes || "");
                      }}
                    >
                      Edit
                    </button>
                    <button
                      className="text-red-600 hover:underline text-xs"
                      onClick={async () => {
                        if (!confirm("Delete this payment?")) return;
                        try {
                          const res = await fetch(`/api/advance-payments/${p.id}`, {
                             credentials: 'include',
                            method: "DELETE",
                            headers: token ? { Authorization: `Bearer ${token}` } : undefined,
                          });
                          if (!res.ok) {
                              let msg = "Delete failed";
                              try {
                                const data = await res.json();
                                msg = data.error || JSON.stringify(data);
                              } catch {
                                const txt = await res.text();
                                if (txt) msg = txt;
                              }
                              throw new Error(msg);
                            }
                          toast.success("Deleted");
                          fetchPayments();
                        } catch (err) {
                          console.error(err);
                          const msg = err instanceof Error ? err.message : "Delete error";
                          if (msg === "Unauthorized") {
                            toast.error("Session expired, please log in again");
                            router.push("/login");
                          } else {
                            toast.error(msg);
                          }
                        }
                      }}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
              {payments.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-4 text-sm text-gray-500">
                    No payments yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <p className="mt-6 text-sm text-gray-600">
        <Link href="/projects" className="text-blue-600 underline">
          ← Back to Projects
        </Link>
      </p>
    </div>
  );
}
