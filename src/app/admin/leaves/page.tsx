"use client";
import React, { useEffect, useState } from "react";
import { getAuth } from "@/lib/auth";
function decodeToken(token:string){ try{return JSON.parse(atob(token.split(".")[1]));}catch{return {};}}

interface Employee { id: number; name: string; }
interface Leave {
  id: number;
  employeeId: number;
  employee: { name: string };
  startDate: string;
  endDate: string;
  type: string;
  status: string;
  reason?: string;
  createdAt: string;
}

export default function LeavesPage() {
  const [data, setData] = useState<Leave[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    employeeId: "",
    startDate: "",
    endDate: "",
    type: "ANNUAL",
    reason: "",
  });
  const [saving, setSaving] = useState(false);

  const [token, setToken] = useState<string | null>(null);
  const [isHR, setIsHR] = useState(false);
  useEffect(() => {
    const t = getAuth();
    setToken(t);
    const decoded: any = t ? decodeToken(t) : {};
    setIsHR(decoded.role === "ADMIN" || decoded.role === "HR_MANAGER" || decoded.role === "OWNER");
  }, []);

  const [filter, setFilter] = useState({ from: "", to: "" });

  const computeStats = (items: Leave[]) => {
    const total = items.length;
    const pending = items.filter((l) => l.status === "PENDING").length;
    const approved = items.filter((l) => l.status === "APPROVED").length;
    const rejected = items.filter((l) => l.status === "REJECTED").length;
    const byType: Record<string, number> = {};
    items.forEach((l) => {
      byType[l.type] = (byType[l.type] || 0) + 1;
    });
    return { total, pending, approved, rejected, byType };
  };

  const [stats, setStats] = useState<any | null>(null);

  const fetchData = async () => {
    if(!token) return;
    try {
      const leavesRes = await fetch(`/api/leaves?from=${filter.from}&to=${filter.to}`, { headers: { Authorization: `Bearer ${token}` } });
      if (!leavesRes.ok) throw new Error(await leavesRes.text());
      const leavesJson = await leavesRes.json();
      setData(leavesJson);
      setStats(computeStats(leavesJson));

      if (isHR) {
        const empRes = await fetch("/api/employees", { headers: { Authorization: `Bearer ${token}` } });
        if (!empRes.ok) throw new Error(await empRes.text());
        setEmployees(await empRes.json());
      } else {
        setEmployees([]);
      }

    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [token, isHR, filter.from, filter.to]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    if(!token) return;
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/leaves", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(isHR ? form : { ...form, employeeId: undefined }),
      });
      if (!res.ok) throw new Error(await res.text());
      setForm({ employeeId: "", startDate: "", endDate: "", type: "ANNUAL", reason: "" });
      fetchData();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const editLeave = async (l: Leave)=>{
    if(!token) return;
    const start = prompt('Start Date (yyyy-mm-dd)', l.startDate.slice(0,10));
    if(!start) return;
    const end = prompt('End Date (yyyy-mm-dd)', l.endDate.slice(0,10));
    if(!end) return;
    const type = prompt('Type (ANNUAL/SICK/UNPAID)', l.type) || l.type;
    const reason = prompt('Reason', l.reason||'') || l.reason;
    try{
      const res = await fetch(`/api/leaves/${l.id}`,{
        method:'PUT',
        headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},
        body: JSON.stringify({ startDate:start, endDate:end, type, reason })
      });
      if(!res.ok) throw new Error(await res.text());
      fetchData();
    }catch(e:any){alert(e.message);}  
  };

  const deleteLeave = async (id: number)=>{
    if(!token) return;
    if(!confirm('Delete this leave request?')) return;
    try{
      const res = await fetch(`/api/leaves/${id}`,{method:'DELETE',headers:{Authorization:`Bearer ${token}`}});
      if(!res.ok) throw new Error(await res.text());
      fetchData();
    }catch(e:any){alert(e.message);}  
  };

  const updateStatus = async (id: number, status: string) => {
    try {
      const res = await fetch(`/api/leaves/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error(await res.text());
      fetchData();
    } catch (e: any) {
      alert(e.message);
    }
  };

  return (
    <div className="container mx-auto max-w-6xl p-8 space-y-6">
      <h1 className="text-3xl font-bold">Leave Requests</h1>
      {stats && (
          <div className="flex gap-6 text-sm">
            <span>Total: {stats.total}</span>
            <span className="text-yellow-600">Pending: {stats.pending}</span>
            <span className="text-green-600">Approved: {stats.approved}</span>
            <span className="text-red-600">Rejected: {stats.rejected}</span>
          </div>
        )}
        {loading && <p>Loading…</p>}
      {error && <p className="text-red-600">{error}</p>}

      {/* Filters */}
      <div className="flex flex-wrap items-end gap-4 border p-4 rounded">
        <div>
          <label className="block text-sm">From</label>
          <input type="date" name="from" value={filter.from} onChange={(e)=>setFilter({...filter,from:e.target.value})} className="rounded border px-3 py-2" />
        </div>
        <div>
          <label className="block text-sm">To</label>
          <input type="date" name="to" value={filter.to} onChange={(e)=>setFilter({...filter,to:e.target.value})} className="rounded border px-3 py-2" />
        </div>
        <button onClick={fetchData} className="rounded bg-gray-600 px-4 py-2 text-white">Apply</button>
      </div>

      {/* Add Leave */}
      <form onSubmit={handleSubmit} className="grid grid-cols-6 gap-4 items-end border p-4 rounded">
        {isHR ? (
          <select
            required
            name="employeeId"
            value={form.employeeId}
            onChange={handleChange}
            className="col-span-2 rounded border px-3 py-2"
          >
            <option value="">Select Employee</option>
            {employees.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name}
              </option>
            ))}
          </select>
        ) : null}
        <input
          type="date"
          required
          name="startDate"
          value={form.startDate}
          onChange={handleChange}
          className="rounded border px-3 py-2"
        />
        <input
          type="date"
          required
          name="endDate"
          value={form.endDate}
          onChange={handleChange}
          className="rounded border px-3 py-2"
        />
        <select name="type" value={form.type} onChange={handleChange} className="rounded border px-3 py-2">
          <option value="ANNUAL">ANNUAL</option>
          <option value="SICK">SICK</option>
          <option value="UNPAID">UNPAID</option>
        </select>
        <button disabled={saving} className="rounded bg-blue-600 px-4 py-2 text-white disabled:opacity-50">
          {saving ? "Saving…" : "Add"}
        </button>
      </form>

      <table className="min-w-full border-collapse">
        <thead>
          <tr className="bg-gray-100 text-left">
            <th className="border px-4 py-2">Employee</th>
            <th className="border px-4 py-2">Dates</th>
            <th className="border px-4 py-2">Type</th>
            <th className="border px-4 py-2">Status</th>
            <th className="border px-4 py-2">Reason</th>
            <th className="border px-4 py-2">Actions</th>
          </tr>
        </thead>
        <tbody>
          {data.map((l) => (
            <tr key={l.id} className="hover:bg-gray-50">
              <td className="border px-4 py-2">{l.employee.name}</td>
              <td className="border px-4 py-2">
                {new Date(l.startDate).toLocaleDateString()} – {new Date(l.endDate).toLocaleDateString()}
              </td>
              <td className="border px-4 py-2">{l.type}</td>
              <td className="border px-4 py-2">{l.status}</td>
              <td className="border px-4 py-2">{l.reason || "—"}</td>
              <td className="border px-4 py-2 space-x-2">
                {isHR && l.status === "PENDING" && (
                  <>
                    <button
                      onClick={() => updateStatus(l.id, "APPROVED")}
                      className="rounded bg-green-600 px-2 py-1 text-white text-sm"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => updateStatus(l.id, "REJECTED")}
                      className="rounded bg-red-600 px-2 py-1 text-white text-sm"
                    >
                      Reject
                    </button>
                  </>
                 )}
                 {!isHR && l.status === "PENDING" && (
                  <>
                    <button
                      onClick={() => editLeave(l)}
                      className="rounded bg-yellow-600 px-2 py-1 text-white text-sm"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => deleteLeave(l.id)}
                      className="rounded bg-red-600 px-2 py-1 text-white text-sm"
                    >
                      Delete
                    </button>
                  </>
                 )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
