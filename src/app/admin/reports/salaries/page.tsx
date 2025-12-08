"use client";

import { useEffect, useState } from "react";
import dayjs from "dayjs";
import Link from "next/link";
import { fetchAuth } from "@/lib/fetchAuth";

interface Row {
  batchId: number;
  period: string;
  status: string;
  employeeId: number;
  employeeName: string;
  grossSalary: number;
  totalDeductions: number;
  netSalary: number;
  createdAt: string;
}

export default function SalariesReportPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [from, setFrom] = useState<string>(dayjs().startOf("year").format("YYYY-MM-DD"));
  const [to, setTo] = useState<string>(dayjs().format("YYYY-MM-DD"));

  async function load() {
    setLoading(true);
    const qs = new URLSearchParams({ from, to }).toString();
    const res = await fetchAuth(`/api/reports/salaries?${qs}`);
    if (res.ok) {
      setRows(await res.json());
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const totals = rows.reduce((acc, r) => {
    acc.totalGross += r.grossSalary;
    acc.totalNet += r.netSalary;
    return acc;
  }, { totalGross: 0, totalNet: 0 });

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Salary Report</h1>

      <div className="mb-4 flex gap-4 items-end">
        <div>
          <label className="block text-sm">From</label>
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="border px-2 py-1 rounded" />
        </div>
        <div>
          <label className="block text-sm">To</label>
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="border px-2 py-1 rounded" />
        </div>
        <button onClick={load} className="bg-blue-600 text-white px-4 py-1 rounded">Search</button>
      </div>

      {loading ? (
        <p>Loading…</p>
      ) : rows.length === 0 ? (
        <p>No salary records found for this period.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="text-sm w-full border-collapse">
            <thead className="bg-gray-100">
              <tr>
                <th className="border px-2 py-1">Date</th>
                <th className="border px-2 py-1">Period</th>
                <th className="border px-2 py-1">Employee</th>
                <th className="border px-2 py-1 text-right">Gross</th>
                <th className="border px-2 py-1 text-right">Deductions</th>
                <th className="border px-2 py-1 text-right">Net</th>
                <th className="border px-2 py-1">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, idx) => (
                <tr key={`${r.batchId}-${r.employeeId}-${idx}`} className="border-t">
                  <td className="px-2 py-1">{dayjs(r.createdAt).format("YYYY-MM-DD")}</td>
                  <td className="px-2 py-1">{r.period}</td>
                  <td className="px-2 py-1">{r.employeeName}</td>
                  <td className="px-2 py-1 text-right">{r.grossSalary.toFixed(2)}</td>
                  <td className="px-2 py-1 text-right">{r.totalDeductions.toFixed(2)}</td>
                  <td className="px-2 py-1 text-right">{r.netSalary.toFixed(2)}</td>
                  <td className="px-2 py-1">{r.status}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="font-semibold">
                <td colSpan={3} className="text-right pr-2">Totals</td>
                <td className="text-right">{totals.totalGross.toFixed(2)}</td>
                <td className="text-right">{(totals.totalGross - totals.totalNet).toFixed(2)}</td>
                <td className="text-right">{totals.totalNet.toFixed(2)}</td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      <Link href="/admin/reports" className="mt-6 inline-block text-blue-600">
         Back to Reports
      </Link>
    </div>
  );
}
