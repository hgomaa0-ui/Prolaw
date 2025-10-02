"use client";
import { useState, useEffect } from "react";
import { getAuth } from "@/lib/auth";
import { useTranslation } from "react-i18next";

interface LawyerRow {
  userId: number;
  userName: string;
  totalHours: number;
  billableHours: number;
  utilisationPct: number;
  cost: number;
  currency: string;
  rating: string;
  targetHours: number;
}

export default function LawyersReportPage() {
  const { t } = useTranslation("reports");
  const [data, setData] = useState<LawyerRow[]>([]);
  const [projects, setProjects] = useState<{id:number,name:string}[]>([]);
  const [lawyers, setLawyers] = useState<{id:number,name:string}[]>([]);
  const [lawyerId, setLawyerId] = useState<string>("");
  const [projectId, setProjectId] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [start, setStart] = useState<string>("");
  const [end, setEnd] = useState<string>("");

  async function load() {
    setLoading(true);
    if(!projectId){ setData([]); setLoading(false); return; }
    const params = new URLSearchParams();
    params.set("projectId", projectId);
    if(lawyerId) params.set("userId", lawyerId);
    if (start) params.set("start", start);
    if (end) params.set("end", end);
    const res = await fetch(`/api/reports/lawyers?${params.toString()}`);
    const json = await res.json();
    setData(json.results ?? []);
    setLoading(false);
  }

  useEffect(() => {
    // fetch projects list
    fetch('/api/projects').then(r=>r.json()).then((arr)=>{
      setProjects(arr);
      if(arr.length>0) setProjectId(String(arr[0].id));
    });
    // fetch lawyers list
    const token = getAuth();
    fetch('/api/employees', { headers: token ? { Authorization: `Bearer ${token}` } : {} })
      .then(r=>r.ok?r.json():[]).then((arr:any[])=> setLawyers(arr));
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-4">{t("lawyerReport", { defaultValue: "Lawyers Report" })}</h1>

      {/* Filters */}
      <div className="flex gap-4 mb-4 items-end flex-wrap">
        <div>
          <label className="block text-sm font-medium mb-1">Project</label>
          <select value={projectId} onChange={e=>setProjectId(e.target.value)} className="border rounded px-2 py-1 min-w-[200px]">
            {projects.map(p=> <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">{t("startDate", { defaultValue: "Start" })}</label>
          <input type="date" value={start} onChange={(e)=>setStart(e.target.value)} className="border rounded px-2 py-1" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">{t("endDate", { defaultValue: "End" })}</label>
          <input type="date" value={end} onChange={(e)=>setEnd(e.target.value)} className="border rounded px-2 py-1" />
        </div>
        <button onClick={load} disabled={loading} className="bg-blue-600 text-white rounded px-4 py-2 h-fit">
          {loading ? t("loading", { defaultValue: "Loading..." }) : t("applyFilters", { defaultValue: "Apply" })}
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-100 text-left">
              <th className="border px-3 py-2">{t("lawyer", { defaultValue: "Lawyer" })}</th>
              <th className="border px-3 py-2 text-right">{t("hours", { defaultValue: "Hours" })}</th>
              <th className="border px-3 py-2 text-right">{t("billableHours", { defaultValue: "Billable" })}</th>
              <th className="border px-3 py-2 text-right">{t("utilisation", { defaultValue: "Utilisation %" })}</th>
              <th className="border px-3 py-2 text-right">{t("cost", { defaultValue: "Cost" })}</th>
              <th className="border px-3 py-2">{t("rating", { defaultValue: "Rating" })}</th>
            </tr>
          </thead>
          <tbody>
            {data.map((r) => (
              <tr key={r.userId}>
                <td className="border px-3 py-1 text-sm">{r.userName}</td>
                <td className="border px-3 py-1 text-sm text-right">{r.totalHours.toFixed(2)}</td>
                <td className="border px-3 py-1 text-sm text-right">{r.billableHours.toFixed(2)}</td>
                <td className="border px-3 py-1 text-sm text-right">{r.utilisationPct.toFixed(1)}%</td>
                <td className="border px-3 py-1 text-sm text-right">{r.cost.toFixed(2)} {r.currency}</td>
                <td className="border px-3 py-1 text-sm">{t(r.rating.toLowerCase(), { defaultValue: r.rating })}</td>
              </tr>
            ))}
            {data.length === 0 && !loading && (
              <tr>
                <td colSpan={6} className="border px-3 py-4 text-center text-sm text-gray-500">
                  {t("noData", { defaultValue: "No data" })}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
