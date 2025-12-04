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
  const [nameFilter, setNameFilter] = useState("");
  const [empOptions, setEmpOptions] = useState<{ id: number; name: string }[]>(
    []
  );
  const [form, setForm] = useState({
    employeeId: "",
    clockIn: "",
    clockOut: "",
  });

  const token = getAuth();

  /* ---------- helpers ---------- */
  const fetchData = async () => {
    try {
      const url = `/api/attendance?from=${filter.from}&to=${filter.to}`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(await res.text());
      setRecords(await res.json());
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  /* initial load */
  useEffect(() => {
    fetchData();
    fetch("/api/employees", {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then((r) => r.json())
      .then((arr) =>
        setEmpOptions(arr.map((e: any) => ({ id: e.id, name: e.name })))
      )
      .catch(() => {});
  }, []);

  const hoursDiff = (start: string, end?: string) => {
    if (!end) return "—";
    const diffMs = new Date(end).getTime() - new Date(start).getTime();
    return (diffMs / 36e5).toFixed(2);
  };

  const totalHours = records.reduce((sum, r) => {
    if (r.clockOut) {
      return sum + (new Date(r.clockOut).getTime() - new Date(r.clockIn).getTime()) / 36e5;
    }
    return sum;
  }, 0);

  const filteredRecords = records.filter((r) =>
    !nameFilter
      ? true
      : r.employee.name.toLowerCase().includes(nameFilter.toLowerCase())
  );

  /* -------------------------------- */

  return (
    <div className="container mx-auto max-w-6xl p-8 space-y-6">
      <h1 className="text-3xl font-bold">Attendance</h1>

      {/* filter */}
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
          className="rounded bg-gray-600 px-4 py-2 text-white"
        >
          Apply
        </button>
        <div>
          <label className="block text-sm">Employee Name</label>
          <input
            type="text"
            value={nameFilter}
            onChange={(e) => setNameFilter(e.target.value)}
            className="rounded border px-3 py-2"
            placeholder="Filter by name"
          />
        </div>
        <button
          onClick={async () => {
            try {
              const q = `from=${filter.from}&to=${filter.to}`;
              const res = await fetch(`/api/attendance/export?${q}` , {
                headers: token ? { Authorization: `Bearer ${token}` } : {},
              });
              if (!res.ok) {
                alert(await res.text());
                return;
              }
              const blob = await res.blob();
              const url = window.URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = "attendance.csv";
              document.body.appendChild(a);
              a.click();
              a.remove();
              window.URL.revokeObjectURL(url);
            } catch (e) {
              console.error(e);
              alert("Failed to export CSV");
            }
          }}
          className="rounded bg-blue-600 px-4 py-2 text-white"
        >
          Export CSV
        </button>
        <label className="inline-flex items-center gap-2 cursor-pointer text-white bg-green-600 px-4 py-2 rounded">
          Import CSV
          <input
            type="file"
            accept=".csv"
            className="hidden"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              const fd = new FormData();
              fd.append("file", file);
              const res = await fetch("/api/attendance/import", {
                method: "POST",
                body: fd,
              });
              if (res.ok) {
                alert("Imported");
                fetchData();
              } else {
                alert(await res.text());
              }
              e.target.value = "";
            }}
          />
        </label>
        <div className="ml-auto text-sm font-medium">
          Total Hours: {totalHours.toFixed(2)}
        </div>
      </div>

      {/* manual add form */}
      <div className="border p-4 rounded mb-6 space-y-3 bg-gray-50">
        <h2 className="font-medium">Add Record (manual)</h2>
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="block text-sm">Employee</label>
            <select
              value={form.employeeId}
              onChange={(e) =>
                setForm({ ...form, employeeId: e.target.value })
              }
              className="border rounded px-3 py-2"
            >
              <option value="">Select…</option>
              {empOptions.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name} (#{o.id})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm">Clock In</label>
            <input
              type="datetime-local"
              value={form.clockIn}
              onChange={(e) =>
                setForm({ ...form, clockIn: e.target.value })
              }
              className="border rounded px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm">Clock Out</label>
            <input
              type="datetime-local"
              value={form.clockOut}
              onChange={(e) =>
                setForm({ ...form, clockOut: e.target.value })
              }
              className="border rounded px-3 py-2"
            />
          </div>
          <button
            onClick={async () => {
              if (!form.employeeId || !form.clockIn) {
                alert("Select employee and clock in");
                return;
              }
              const body = {
                employeeId: Number(form.employeeId),
                clockIn: new Date(form.clockIn).toISOString(),
                ...(form.clockOut
                  ? { clockOut: new Date(form.clockOut).toISOString() }
                  : {}),
              };
              const res = await fetch("/api/attendance", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
                body: JSON.stringify(body),
              });
              if (res.ok) {
                setForm({ employeeId: "", clockIn: "", clockOut: "" });
                fetchData();
              } else {
                alert(await res.text());
              }
            }}
            className="rounded bg-green-600 px-4 py-2 text-white"
          >
            Save
          </button>
        </div>
      </div>

      {loading && <p>Loading…</p>}
      {error && <p className="text-red-600">{error}</p>}

      {/* table */}
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
          {filteredRecords.map((r) => (
            <tr key={r.id} className="hover:bg-gray-50">
              <td className="border px-4 py-2">{r.employee.name}</td>
              <td className="border px-4 py-2">
                {new Date(r.clockIn).toLocaleString()}
              </td>
              <td className="border px-4 py-2">
                {r.clockOut
                  ? new Date(r.clockOut).toLocaleString()
                  : "—"}
              </td>
              <td className="border px-4 py-2">
                {hoursDiff(r.clockIn, r.clockOut)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}