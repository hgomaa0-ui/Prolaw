"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { CurrencyCode } from "@prisma/client";

interface Position {
  id: number;
  name: string;
  defaultRate: string | null;
  currency: CurrencyCode | null;
}

import { fetchAuth } from "@/lib/fetchAuth";

export default function PositionsPage() {
  const [positions, setPositions] = useState<Position[]>([]);
  const [editingId, setEditingId] = useState<number|null>(null);
  const [tempName, setTempName] = useState("");
  const [tempRate, setTempRate] = useState("");
  const [tempCurrency, setTempCurrency] = useState<CurrencyCode>("USD" as CurrencyCode);
  const [newName, setNewName] = useState("");
  const [newRate, setNewRate] = useState("");
  const [newCurrency, setNewCurrency] = useState<CurrencyCode>("USD" as CurrencyCode);
  const router = useRouter();

  function startEdit(p: Position) {
    setEditingId(p.id);
    setTempName(p.name);
    setTempRate(p.defaultRate ?? "");
    setTempCurrency(p.currency ?? "USD" as CurrencyCode);
  }

  function cancelEdit() {
    setEditingId(null);
    setTempName("");
    setTempRate("");
  }

  async function saveEdit(id: number) {
    try {
      const res = await fetchAuth(`/api/positions/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: tempName, defaultRate: tempRate ? parseFloat(tempRate) : null, currency: tempCurrency }),
      });
      if (!res.ok) throw new Error("Failed");
      toast.success("Saved");
      fetchPositions();
    } catch (err:any) {
      toast.error(err.message || "Error");
    } finally {
      cancelEdit();
    }
  }

  async function deletePosition(id: number) {
    if (!confirm("Delete position?")) return;
    try {
      const res = await fetchAuth(`/api/positions/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed");
      toast.success("Deleted");
      fetchPositions();
    } catch (err:any) {
      toast.error(err.message || "Error");
    }
  }

  useEffect(() => {
    fetchPositions();
  }, []);

  async function fetchPositions() {
    const res = await fetchAuth("/api/positions");
    const data = await res.json();
    setPositions(data);
  }

  async function addPosition() {
    if (!newName) return toast.error("Name required");
    const res = await fetchAuth("/api/positions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName, defaultRate: newRate ? parseFloat(newRate) : null, currency: newCurrency }),
    });
    if (res.ok) {
      toast.success("Position added");
      setNewName("");
      setNewRate("");
      fetchPositions();
    } else {
      const err = await res.json();
      toast.error(err.error || "Failed");
    }
  }

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Positions</h1>

      {/* Add form */}
      <div className="flex gap-2 mb-6 flex-wrap items-end">
        <div>
          <label className="block text-sm">Name</label>
          <input value={newName} onChange={(e) => setNewName(e.target.value)} className="border px-2 py-1 rounded" />
        </div>
        <div>
          <label className="block text-sm">Default Rate</label>
          <input
            type="number"
            value={newRate}
            onChange={(e) => setNewRate(e.target.value)}
            className="border px-2 py-1 rounded w-28"
          />
        </div>
        <div>
          <label className="block text-sm">Currency</label>
          <select value={newCurrency ?? "USD"} onChange={(e) => setNewCurrency(e.target.value as CurrencyCode)} className="border px-2 py-1 rounded">
            {Object.values(CurrencyCode).map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <button onClick={addPosition} className="bg-blue-600 text-white px-4 py-2 rounded h-9">
          Add
        </button>
      </div>

      {/* Table */}
      <table className="w-full bg-white shadow rounded">
        <thead className="bg-gray-100 text-left">
          <tr>
            <th className="px-4 py-2">ID</th>
            <th className="px-4 py-2">Name</th>
            <th className="px-4 py-2">Default Rate</th>
            <th className="px-4 py-2">Currency</th>
            <th className="px-4 py-2">Actions</th>
          </tr>
        </thead>
        <tbody>
          {positions.map((p) => (
            <tr key={p.id} className="border-t">
              <td className="px-4 py-2 text-sm text-gray-600">{p.id}</td>
              <td className="px-4 py-2">
                {editingId === p.id ? (
                  <input value={tempName} onChange={e=>setTempName(e.target.value)} className="border px-1 rounded" />
                ) : (
                  p.name
                )}
              </td>
              <td className="px-4 py-2">
                {editingId === p.id ? (
                  <input type="number" value={tempRate} onChange={e=>setTempRate(e.target.value)} className="border px-1 rounded w-24" />
                ) : (
                  p.defaultRate ?? "-"
                )}
              </td>
              <td className="px-4 py-2">
                {editingId === p.id ? (
                  <select value={tempCurrency} onChange={e=>setTempCurrency(e.target.value as CurrencyCode)} className="border rounded px-1">
                    {Object.values(CurrencyCode).map(c=>(<option key={c} value={c}>{c}</option>))}
                  </select>
                ) : (
                  p.currency ?? "-"
                )}
              </td>
              <td className="px-4 py-2 space-x-2">
                {editingId === p.id ? (
                  <>
                    <button onClick={()=>saveEdit(p.id)} className="text-green-600">Save</button>
                    <button onClick={cancelEdit} className="text-gray-500">Cancel</button>
                  </>
                ) : (
                  <>
                    <button onClick={()=>startEdit(p)} className="text-blue-600">Edit</button>
                    <button onClick={()=>deletePosition(p.id)} className="text-red-600">Delete</button>
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
