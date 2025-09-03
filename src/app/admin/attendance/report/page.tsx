"use client";
import React, { useState, useEffect } from "react";
import { getAuth } from "@/lib/auth";

interface Row {
  employeeId: number;
  name: string;
  totalHours: number;
  lates: number;
}

export default function AttendanceReport() {
  const [rows, setRows] = useState<Row[]>([]);
  const [filter, setFilter] = useState({ from: "", to: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const token = getAuth();

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const url = `/api/reports/attendance?from=${filter.from}&to=${filter.to}`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(await res.text());
      const json = await res.json();
      setRows(json);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const grandHours = rows.reduce((s, r) => s + r.totalHours, 0);
  const grandLates = rows.reduce((s, r) => s + r.lates, 0);

  return (
    <div className="container mx-auto max-w-5xl p-8 space-y-6">
      <h1 className="text-3xl font-bold">Attendance Report</h1>

      <div className="flex flex-wrap items-end gap-4 border p-4 rounded">
        <div>
          <label className="block text-sm">From</label>
          <input
            type="date"
            value={filter.from}
            onChange={(e) => setFilter({ ...filter, from: e.target.value })}
            className="rounded border px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-sm">To</label>
          <input
            type="date"
            value={filter.to}
            onChange={(e) => setFilter({ ...filter, to: e.target.value })}
            className="rounded border px-3 py-2"
          />
        </div>
        <button
          onClick={fetchData}
          className="rounded bg-gray-700 px-4 py-2 text-white"
        >
          Apply
        </button>
        <div className="ml-auto text-sm font-medium">
          Total Hours: {grandHours.toFixed(2)} | Total Lates: {grandLates}
        </div>
      </div>

      {loading && <p>Loading…</p>}
      {error && <p className="text-red-600">{error}</p>}

      <table className="min-w-full border-collapse">
        <thead>
          <tr className="bg-gray-100 text-left">
            <th className="border px-4 py-2">Employee</th>
            <th className="border px-4 py-2">Total Hours</th>
            <th className="border px-4 py-2">Late Days</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.employeeId} className="hover:bg-gray-50">
              <td className="border px-4 py-2">{r.name}</td>
              <td className="border px-4 py-2">{r.totalHours.toFixed(2)}</td>
              <td className="border px-4 py-2">{r.lates}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
