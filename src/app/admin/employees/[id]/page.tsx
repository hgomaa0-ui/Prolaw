"use client";
import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getAuth } from "@/lib/auth";
import Link from "next/link";

interface Salary {
  id: number;
  amount: string;
  currency: string;
  effectiveFrom: string;
}
interface Employee {
  id: number;
  name: string;
  status: string;
  email?: string;
  department?: string;
  hireDate?: string;
  leaveBalanceDays?: number;
  salaries: Salary[];
  user?: { positionId?: number; role?: string };
}

interface Penalty {
  id: number;
  date: string;
  amount: string;
  currency: string;
  reason: string | null;
}

interface Position {
  id: number;
  name: string;
}

const ROLE_OPTIONS = [
  "LAWYER",
  "LAWYER_MANAGER",
  "LAWYER_PARTNER",
  "MANAGING_PARTNER",
  "ACCOUNTANT_MASTER",
  "ACCOUNTANT_ASSISTANT",
  "HR_MANAGER",
  "HR",
  "ADMIN",
  "OWNER",
];

export default function EmployeeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [emp, setEmp] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(true);
  const [penalties, setPenalties] = useState<Penalty[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [newSalary, setNewSalary] = useState({ amount: "", currency: "USD" });
  const [emailEdit, setEmailEdit] = useState<string>("");
  const [statusEdit, setStatusEdit] = useState<string>("ACTIVE");
  const [balanceEdit, setBalanceEdit] = useState<number>(0);
  const [positions, setPositions] = useState<Position[]>([]);
  const [positionEdit, setPositionEdit] = useState<number | null>(null);
  const [roleEdit, setRoleEdit] = useState<string | null>(null);
  const [projects,setProjects]=useState<{id:number;name:string}[]>([]);
  const [lawyers,setLawyers]=useState<{id:number;name:string}[]>([]);
  const [projectIds,setProjectIds]=useState<number[]>([]);
  const [lawyerIds,setLawyerIds]=useState<number[]>([]);
  const [isHR,setIsHR]=useState(false);

  const fetchEmp = async () => {
    // fetch employee details
    try {
      const token = getAuth();
      const res = await fetch(`/api/employees/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setEmp(data);
      setProjectIds(data.projectIds ?? []);
      setLawyerIds(data.lawyerIds ?? []);
      setEmailEdit(data.email || "");
      setStatusEdit(data.status);
      setBalanceEdit(Number(data.leaveBalanceDays||0));
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchPens = async () => {
    setError(null);
    try {
      const token = getAuth();
      const res = await fetch(`/api/penalties?employeeId=${id}`, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok){
        setPenalties([]);
        return; // silently ignore
      }
      const data = await res.json();
      setPenalties(data);
    } catch (err:any) {
      console.error(err);
      setError(err.message || 'Failed to load penalties');
    }
  };

  useEffect(() => {
    fetchEmp();
    fetchPens();
    // fetch dropdown data
    const token=getAuth();
    fetch('/api/projects',{headers:{Authorization:`Bearer ${token}`}}).then(r=>r.json()).then(d=>Array.isArray(d)?setProjects(d):setProjects([]));
    fetch('/api/lawyers',{headers:{Authorization:`Bearer ${token}`}}).then(r=>r.json()).then(d=>Array.isArray(d)?setLawyers(d):setLawyers([]));
    const fetchPositions = async () => {
      try {
        const token = getAuth();
        const res = await fetch('/api/positions', { headers: { Authorization: `Bearer ${token}` } });
        if (!res.ok) return;
        const data = await res.json();
        setPositions(data);
      } catch {}
    };
    fetchPositions();
    const tok=getAuth();
    const dec:any = tok ? JSON.parse(atob(tok.split('.')[1])):{};
    setIsHR(dec.role==='ADMIN'||dec.role==='HR_MANAGER'||dec.role==='OWNER');
  }, [id]);

  const handleUpdateEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdding(true);
    setError(null);
    try {
      const token = getAuth();
      const res = await fetch(`/api/employees/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ email: emailEdit }),
      });
      if (!res.ok) throw new Error(await res.text());
      await fetchEmp();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setAdding(false);
    }
  };

  const handleUpdateStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdding(true);
    setError(null);
    try {
      const token = getAuth();
      const res = await fetch(`/api/employees/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status: statusEdit }),
      });
      if (!res.ok) throw new Error(await res.text());
      await fetchEmp();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setAdding(false);
    }
  };

  const handleAddSalary = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdding(true);
    setError(null);
    try {
      const token = getAuth();
      const res = await fetch(`/api/employees/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ salaryAmount: newSalary.amount, salaryCurrency: newSalary.currency }),
      });
      if (!res.ok) throw new Error(await res.text());
      await fetchEmp();
      setNewSalary({ amount: "", currency: newSalary.currency });
    } catch (e: any) {
      setError(e.message);
    } finally {
      setAdding(false);
    }
  };

  const handleUpdatePosition = async (e: React.FormEvent) => {
    e.preventDefault();
    if (positionEdit === null) return;
    setAdding(true);
    setError(null);
    try {
      const token = getAuth();
      const res = await fetch(`/api/employees/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ positionId: positionEdit })
      });
      if (!res.ok) throw new Error(await res.text());
      await fetchEmp();
    } catch (e:any) {
      setError(e.message);
    } finally {
      setAdding(false);
    }
  };

  const handleUpdateRole = async (e: React.FormEvent) => {
    e.preventDefault();
    // allow saving even if role not changed
  const roleToSend = roleEdit ?? emp?.user?.role;
  if(!roleToSend) return;
    setAdding(true);
    setError(null);
    try {
      const token = getAuth();
      const res = await fetch(`/api/employees/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ role: roleToSend, projectIds, lawyerIds })
      });
      if (!res.ok) throw new Error(await res.text());
      await fetchEmp();
    } catch (e:any) {
      setError(e.message);
    } finally {
      setAdding(false);
    }
  };

  const handleSaveBalance = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdding(true);
    setError(null);
    try {
      const token = getAuth();
      const res = await fetch(`/api/employees/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ leaveBalanceDays: balanceEdit })
      });
      if (!res.ok) throw new Error(await res.text());
      await fetchEmp();
    } catch (e:any) {
      setError(e.message);
    } finally {
      setAdding(false);
    }
  };

  if (loading) return <p className="p-8">Loading…</p>;
  if (error) return <p className="p-8 text-red-600">{error}</p>;
  if (!emp) return <p className="p-8">Not found</p>;

  return (
    <div className="container mx-auto max-w-4xl p-8 space-y-6">
      <div>
        <Link href="/admin/employees" className="text-blue-600">← Back to list</Link>
      </div>
      <h1 className="text-3xl font-bold">{emp.name}</h1>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <strong>Email:</strong> {emp.email || "—"}
        </div>
        <div>
          <strong>Department:</strong> {emp.department || "—"}
        </div>
        <div>
          <strong>Status:</strong> {emp.status}
        </div>
        <div>
          <strong>Hire Date:</strong> {emp.hireDate ? new Date(emp.hireDate).toLocaleDateString() : "—"}
        </div>
        {/* Update status */}
        <div className="mt-4">
          <form onSubmit={handleUpdateStatus} className="flex items-end gap-4">
            <select value={statusEdit} onChange={(e)=>setStatusEdit(e.target.value)} className="rounded border px-3 py-2">
              {['ACTIVE','INACTIVE'].map(s=><option key={s}>{s}</option>)}
            </select>
            <button disabled={adding} className="rounded bg-blue-600 px-4 py-2 text-white disabled:opacity-50">
              {adding? 'Saving…':'Save Status'}
            </button>
          </form>
        </div>
        {/* Position */}
        <div className="mt-4">
          <form onSubmit={handleUpdatePosition} className="flex items-end gap-4">
            <select
              value={positionEdit ?? emp?.user?.positionId ?? ''}
              onChange={(e)=>setPositionEdit(Number(e.target.value) || null)}
              className="rounded border px-3 py-2"
            >
              <option value="">— Select Position —</option>
              {positions.map(p=>(<option key={p.id} value={p.id}>{p.name}</option>))}
            </select>
            <button disabled={adding || positionEdit===null} className="rounded bg-blue-600 px-4 py-2 text-white disabled:opacity-50">
              {adding? 'Saving…':'Save Position'}
            </button>
          </form>
        </div>
        {/* Leave Balance */}
        {isHR && (
          <div className="mt-4">
            <form onSubmit={handleSaveBalance} className="flex items-end gap-4">
              <div>
                <label className="block text-sm">Leave Balance (days)</label>
                <input type="number" step="0.1" className="rounded border px-3 py-2 w-24" value={balanceEdit} onChange={(e)=>setBalanceEdit(Number(e.target.value))} />
              </div>
              <button disabled={adding} className="rounded bg-blue-600 px-4 py-2 text-white disabled:opacity-50">{adding? 'Saving…':'Save Balance'}</button>
            </form>
          </div>
        )}
        {/* Role */}
        <div className="mt-4">
          <form onSubmit={handleUpdateRole} className="flex items-end gap-4">
            <select
              value={roleEdit ?? emp?.user?.role ?? ''}
              onChange={(e)=>setRoleEdit(e.target.value)}
              className="rounded border px-3 py-2"
            >
              <option value="">— Select Role —</option>
              {ROLE_OPTIONS.map(r=>(<option key={r} value={r}>{r}</option>))}
            </select>
            <button disabled={adding} className="rounded bg-blue-600 px-4 py-2 text-white disabled:opacity-50">
              {adding? 'Saving…':'Save Role'}
            </button>
          </form>
        </div>
      </div>

      {(['LAWYER_MANAGER','LAWYER_PARTNER','MANAGING_PARTNER'].includes(roleEdit ?? emp?.user?.role as string)) && (
        <section className="border rounded p-4 mb-6 space-y-4">
          <h2 className="text-lg font-semibold">Managed Scope</h2>
          <details className="border rounded p-3 bg-white">
            <summary className="cursor-pointer select-none font-medium">Projects ({projectIds.length})</summary>
            <div className="max-h-40 overflow-y-auto mt-2 space-y-1 text-sm">
              {projects.map(p => (
                <label key={p.id} className="flex items-center gap-2">
                  <input type="checkbox" checked={projectIds.includes(p.id)} onChange={e=>{
                    const next = e.target.checked ? [...projectIds,p.id] : projectIds.filter(id=>id!==p.id);
                    setProjectIds(next);
                  }}/>
                  {p.name}
                </label>
              ))}
            </div>
          </details>
          <details className="border rounded p-3 bg-white">
            <summary className="cursor-pointer select-none font-medium">Lawyers ({lawyerIds.length})</summary>
            <div className="max-h-40 overflow-y-auto mt-2 space-y-1 text-sm">
              {lawyers.map(l => (
                <label key={l.id} className="flex items-center gap-2">
                  <input type="checkbox" checked={lawyerIds.includes(l.id)} onChange={e=>{
                    const next = e.target.checked ? [...lawyerIds,l.id] : lawyerIds.filter(id=>id!==l.id);
                    setLawyerIds(next);
                  }}/>
                  {l.name}
                </label>
              ))}
            </div>
          </details>
        </section>
      )}

      <section>
        <h2 className="mb-2 text-xl font-semibold">Salary History</h2>
        <table className="min-w-full border-collapse mb-4">
          <thead>
            <tr className="bg-gray-100 text-left">
              <th className="border px-4 py-2">Effective From</th>
              <th className="border px-4 py-2">Amount</th>
            </tr>
          </thead>
          <tbody>
            {emp.salaries.map((s) => (
              <tr key={s.id} className="hover:bg-gray-50">
                <td className="border px-4 py-2">{new Date(s.effectiveFrom).toLocaleDateString()}</td>
                <td className="border px-4 py-2">{s.amount} {s.currency}</td>
              </tr>
            ))}
            {emp.salaries.length === 0 && (
              <tr>
                <td colSpan={2} className="border px-4 py-2 text-center text-gray-500">
                  No salary records
                </td>
              </tr>
            )}
          </tbody>
        </table>
        <form onSubmit={handleAddSalary} className="flex flex-wrap items-end gap-4">
          <div>
            <label className="block text-sm">Amount*</label>
            <input
              type="number"
              required
              step="0.01"
              className="rounded border px-3 py-2"
              value={newSalary.amount}
              onChange={(e) => setNewSalary({ ...newSalary, amount: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm">Currency</label>
            <select
              className="rounded border px-3 py-2"
              value={newSalary.currency}
              onChange={(e) => setNewSalary({ ...newSalary, currency: e.target.value })}
            >
              {["USD", "EUR", "EGP", "SAR", "AED", "QAR", "KWD", "OMR", "JPY", "CNY", "INR"].map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </div>
          <button disabled={adding} className="rounded bg-blue-600 px-4 py-2 text-white disabled:opacity-50">
            {adding ? "Adding…" : "Add Salary"}
          </button>
        </form>
      </section>

      {/* Penalties */}
      <section>
        <h2 className="mb-2 text-xl font-semibold">Penalties</h2>
        <table className="min-w-full border-collapse mb-4">
          <thead>
            <tr className="bg-gray-100 text-left">
              <th className="border px-4 py-2">Date</th>
              <th className="border px-4 py-2">Amount</th>
              <th className="border px-4 py-2">Currency</th>
              <th className="border px-4 py-2">Reason</th>
            </tr>
          </thead>
          <tbody>
            {penalties.map((p) => (
              <tr key={p.id} className="hover:bg-gray-50">
                <td className="border px-4 py-2">{new Date(p.date).toLocaleDateString()}</td>
                <td className="border px-4 py-2">{p.amount}</td>
                <td className="border px-4 py-2">{p.currency}</td>
                <td className="border px-4 py-2">{p.reason ?? "-"}</td>
              </tr>
            ))}
            {penalties.length === 0 && (
              <tr>
                <td colSpan={4} className="border px-4 py-2 text-center text-gray-500">No penalties</td>
              </tr>
            )}
          </tbody>
        </table>
      </section>

      <section>
        <h2 className="mb-2 text-xl font-semibold">Update Email</h2>
        <form onSubmit={handleUpdateEmail} className="flex items-end gap-4">
          <input
            type="email"
            required
            className="rounded border px-3 py-2"
            value={emailEdit}
            onChange={(e) => setEmailEdit(e.target.value)}
          />
          <button disabled={adding} className="rounded bg-blue-600 px-4 py-2 text-white disabled:opacity-50">
            {adding ? "Saving…" : "Save Email"}
          </button>
        </form>
      </section>
    </div>
  );
}
