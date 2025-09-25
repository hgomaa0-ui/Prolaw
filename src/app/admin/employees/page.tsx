"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { getAuth } from "@/lib/auth";

interface Salary {
  amount: string;
  currency: string;
  effectiveFrom: string;
}
interface Employee {
  email?: string;
  id: number;
  name: string;
  status: string;
  department?: string;
  hireDate?: string;
  leaveBalanceDays?: number;
  salaries: Salary[];
  user?: { role: string };
}

export default function EmployeesPage() {
  const [data, setData] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentRole,setCurrentRole]=useState<string|null>(null);

  useEffect(() => {
    const tokenLocal = typeof window!=='undefined'?localStorage.getItem('token'):null;
    if(tokenLocal){
      try{ setCurrentRole(JSON.parse(atob(tokenLocal.split('.')[1])).role);}catch{}
    }
    const fetchData = async () => {
      try {
        const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
        const res = await fetch("/api/employees", {
          headers: { ...(token ? { ...(token ? { Authorization: `Bearer ${token}` } : {}) } : {}) },
        });
        if (!res.ok) throw new Error(await res.text());
        const json = await res.json();
        setData(json);
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  return (
    <div className="container mx-auto max-w-5xl p-8">
      <h1 className="mb-6 text-3xl font-bold">Employees</h1>
      {loading && <p>Loading…</p>}
      {error && <p className="text-red-600">{error}</p>}
      {currentRole!=='ADMIN_VIEWER' ? (
      <div className="mb-4 flex gap-3">
        <Link
          href="/admin/employees/new"
          className="rounded bg-blue-600 px-4 py-2 text-white"
        >
          Add Employee
        </Link>
        <button
          onClick={() => {
            const rows = [
              ["ID","Name","Email","Department","Status","Role","Leave Balance","Salary","Currency"]
            ].concat(
              data.map(e=>{
                const latest=e.salaries[0];
                return [e.id,e.name,e.email??"",e.department??"",e.status,e.user?.role??"",e.leaveBalanceDays??0,latest?latest.amount:"",latest?latest.currency:""];
              })
            );
            const csv = rows.map(r=>r.map(f=>`"${String(f).replace(/"/g,'""')}"`).join(',')).join('\n');
            const blob = new Blob([csv],{type:'text/csv'});
            const url = URL.createObjectURL(blob);
            const a=document.createElement('a');
            a.href=url; a.download='employees.csv'; a.click(); URL.revokeObjectURL(url);
          }}
          className="rounded bg-green-600 px-4 py-2 text-white"
        >
          Export CSV
        </button>
      </div>
      ) : null }
      <table className="min-w-full border-collapse">
        <thead>
          <tr className="bg-gray-100 text-left">
            <th className="border px-4 py-2">ID</th>
            <th className="border px-4 py-2">Name</th>
            <th className="border px-4 py-2">Email</th>
            <th className="border px-4 py-2">Department</th>
            <th className="border px-4 py-2">Status</th>
            <th className="border px-4 py-2">Role</th>
            <th className="border px-4 py-2">Leave Balance</th>
            <th className="border px-4 py-2">Latest Salary</th>
            <th className="border px-4 py-2">Actions</th>
          </tr>
        </thead>
        <tbody>
          {data.map((e) => {
            const latest = e.salaries[0];
            return (
              <tr key={e.id} className="hover:bg-gray-50">
                <td className="border px-4 py-2">{e.id}</td>
                <td className="border px-4 py-2">
                  {currentRole==='ADMIN_VIEWER'? (
                    <span>{e.name}</span>
                  ) : (
                    <Link className="text-blue-600" href={`/admin/employees/${e.id}`}>{e.name}</Link>
                  )}
                </td>
                <td className="border px-4 py-2">{e.email || "—"}</td>
                <td className="border px-4 py-2">{e.department || "—"}</td>
                <td className="border px-4 py-2">{e.status}</td>
                <td className="border px-4 py-2">{e.user?.role ?? "—"}</td>
                <td className="border px-4 py-2">
                  {currentRole==='ADMIN_VIEWER' ? (
                    <span>{e.leaveBalanceDays??0}</span>
                  ) : (
                  <input
                    type="number"
                    className="w-20 border rounded px-1 py-0.5"
                    defaultValue={e.leaveBalanceDays ?? 0}
                    onBlur={async (ev) => {
                      const val = Number((ev.target as HTMLInputElement).value);
                      if (isNaN(val)) return;
                      try {
                        const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
                        const res = await fetch(`/api/employees/${e.id}/balance`, {
                          method: "PUT",
                          headers: {
                            "Content-Type": "application/json",
                            ...(token ? { ...(token ? { Authorization: `Bearer ${token}` } : {}) } : {}),
                          },
                          body: JSON.stringify({ leaveBalanceDays: val }),
                        });
                        if (!res.ok) throw new Error(await res.text());
                      } catch (err) {
                        alert("Failed to update balance");
                      }
                    }}
                  />
                  )}
                </td>
                <td className="border px-4 py-2">
                  {latest ? `${latest.amount} ${latest.currency}` : "—"}
                </td>
                <td className="border px-4 py-2">
                  {currentRole!=='ADMIN_VIEWER' && (
                  <button
                    onClick={async () => {
                      if (!confirm(`Delete ${e.name}?`)) return;
                      try {
                        const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
                        const res = await fetch(`/api/employees/${e.id}`, {
                          method: "DELETE",
                          headers: { ...(token ? { ...(token ? { Authorization: `Bearer ${token}` } : {}) } : {}) },
                        });
                        if (!res.ok) throw new Error(await res.text());
                        setData(data.filter((emp) => emp.id !== e.id));
                      } catch (err) {
                        alert("Failed to delete: " + (err as any).message);
                      }
                    }}
                    className="rounded bg-red-600 px-3 py-1 text-white text-sm"
                  >
                    Delete
                  </button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
