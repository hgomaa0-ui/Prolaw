"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { CurrencyCode } from "@prisma/client";
import { fetchAuth } from "@/lib/fetchAuth";
import Link from "next/link";

interface EmployeeOption {
  id: number;
  name: string;
}

interface Penalty {
  id: number;
  employeeId: number;
  employee: { name: string };
  amount: string;
  currency: CurrencyCode;
  date: string;
  reason: string | null;
}

export default function PenaltiesPage() {
  const [penalties, setPenalties] = useState<Penalty[]>([]);
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);

  // add form
  const [employeeId, setEmployeeId] = useState<string>("");
  const [amount, setAmount] = useState<string>("");
  const [currency, setCurrency] = useState<CurrencyCode>("USD" as CurrencyCode);
  const [reason, setReason] = useState<string>("");

  async function fetchData() {
    const [penRes, empRes] = await Promise.all([
      fetchAuth("/api/penalties"),
      fetchAuth("/api/employees"),
    ]);
    const penJson = await penRes.json();
    const empJson = await empRes.json();
    setPenalties(penJson);
    setEmployees(empJson.map((e: any) => ({ id: e.id, name: e.name })));
  }

  useEffect(() => {
    fetchData();
  }, []);

  async function addPenalty() {
    if (!employeeId || !amount) return toast.error("All fields required");
    const res = await fetchAuth("/api/penalties", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ employeeId: Number(employeeId), amount: parseFloat(amount), currency, reason }),
    });
    if (!res.ok) return toast.error("Failed");
    toast.success("Penalty added");
    setEmployeeId("");
    setAmount("");
    setReason("");
    fetchData();
  }

  async function deletePenalty(id: number) {
    if (!confirm("Delete penalty?")) return;
    const res = await fetchAuth(`/api/penalties/${id}`, { method: "DELETE" });
    if (!res.ok) return toast.error("Failed");
    toast.success("Deleted");
    setPenalties(penalties.filter((p) => p.id !== id));
  }

  return (
    <div className="container mx-auto p-6 max-w-5xl">
      <h1 className="text-2xl font-bold mb-4">Penalties</h1>

      {/* add form */}
      <div className="flex gap-3 flex-wrap items-end mb-6">
        <div>
          <label className="block text-sm">Employee</label>
          <select value={employeeId} onChange={(e)=>setEmployeeId(e.target.value)} className="border rounded px-2 py-1">
            <option value="">-- select --</option>
            {employees.map(emp=> <option key={emp.id} value={emp.id}>{emp.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm">Amount</label>
          <input type="number" value={amount} onChange={(e)=>setAmount(e.target.value)} className="border rounded px-2 py-1 w-28" />
        </div>
        <div>
          <label className="block text-sm">Currency</label>
          <select value={currency} onChange={(e)=>setCurrency(e.target.value as CurrencyCode)} className="border rounded px-2 py-1">
            {Object.values(CurrencyCode).map(c=> <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm">Reason</label>
          <input value={reason} onChange={(e)=>setReason(e.target.value)} className="border rounded px-2 py-1 w-48" />
        </div>
        <button onClick={addPenalty} className="bg-blue-600 text-white px-4 py-2 rounded h-9">Add</button>
      </div>

      {/* table */}
      <table className="w-full bg-white shadow rounded">
        <thead className="bg-gray-100 text-left">
          <tr>
            <th className="px-4 py-2">Date</th>
            <th className="px-4 py-2">Employee</th>
            <th className="px-4 py-2">Amount</th>
            <th className="px-4 py-2">Currency</th>
            <th className="px-4 py-2">Reason</th>
            <th className="px-4 py-2">Actions</th>
          </tr>
        </thead>
        <tbody>
          {penalties.map(p=> (
            <tr key={p.id} className="border-t">
              <td className="px-4 py-2">{new Date(p.date).toLocaleDateString()}</td>
              <td className="px-4 py-2">
                <Link href={`/admin/employees/${p.employeeId}`} className="text-blue-600">{p.employee?.name}</Link>
              </td>
              <td className="px-4 py-2">{p.amount}</td>
              <td className="px-4 py-2">{p.currency}</td>
              <td className="px-4 py-2">{p.reason ?? "-"}</td>
              <td className="px-4 py-2">
                <button onClick={()=>deletePenalty(p.id)} className="text-red-600">Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
