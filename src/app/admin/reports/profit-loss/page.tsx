"use client";

import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { fetchAuth } from "@/lib/fetchAuth";
import { toast, Toaster } from "react-hot-toast";

interface ClientOption { id:number; name:string }
interface ProjectOption { id:number; name:string; clientId:number }

interface ResultRow {
  projectId: number;
  projectName: string;
  clientId: number;
  clientName: string;
  advance: number;
  labor: number;
  expenses: number;
  cost: number;
  profit: number;
  currency: string;
}

export default function ProfitLossReportPage() {
  const { t, i18n } = useTranslation(['reports','common']);
  const [results, setResults] = useState<ResultRow[]>([]);
  const [totalsByCurrency, setTotalsByCurrency] = useState<Record<string, any> | null>(null);
  const [loading, setLoading] = useState(false);
  const [clientId, setClientId] = useState("");
  const [projectId, setProjectId] = useState("");
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  

  const fetchReport = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (clientId) params.append("clientId", clientId);
      if (projectId) params.append("projectId", projectId);
      if (start) params.append("start", start);
      if (end) params.append("end", end);
      const res = await fetchAuth(`/api/reports/profit-loss?${params.toString()}`);
      if (!res.ok) throw new Error("Failed fetch");
      const data = await res.json();
      setResults(data.results);
      setTotalsByCurrency(data.totalsByCurrency);
    } catch (err) {
      console.error(err);
      toast.error("Error loading report");
    } finally {
      setLoading(false);
    }
  };

  useEffect(()=>{
    // preload clients & projects for dropdowns
    const load = async () => {
      try{
        const [cRes,pRes] = await Promise.all([
          fetchAuth('/api/clients'),
          fetchAuth('/api/projects')
        ]);
        if(cRes.ok) setClients(await cRes.json());
        if(pRes.ok) setProjects(await pRes.json());
      }catch(e){console.error(e)}
    };
    load();
    fetchReport();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[]);

  const handlePrint = () => window.print();
  const handlePdf = async () => {
    const element = document.getElementById('pl-table');
    if (!element) return;
    const html2pdf = (await import('html2pdf.js')).default;
    //@ts-ignore
    html2pdf().from(element).set({margin:0,filename:'profit-loss.pdf',html2canvas:{scale:2},jsPDF:{unit:'pt',format:'a4',orientation:'landscape'}}).save();
  };

  const handleCsv = () => {
    const rows = [
      ['Client','Project','Advance','Labor','Expenses','Cost','Profit','Currency'],
      ...results.map(r=>[
        r.clientName,
        r.projectName,
        r.advance,
        r.labor,
        r.expenses,
        r.cost,
        r.profit,
        r.currency
      ])
    ];
    const csv = rows.map(r=>r.join(',')).join('\n');
    const blob = new Blob([csv],{type:'text/csv'});
    const url = URL.createObjectURL(blob);
    const a=document.createElement('a');
    a.href=url;a.download='profit-loss.csv';a.click();URL.revokeObjectURL(url);
  };

  return (
    <div className={`p-6 max-w-6xl mx-auto ${i18n.language==='ar'?'rtl text-right':''}`}>
      <Toaster />
      <h1 className="text-2xl font-semibold mb-4">{t('profitLoss.title','Profit & Loss Report')}</h1>
      <div className="flex gap-3 mb-4 print:hidden">
        <button onClick={handlePrint} className="bg-gray-700 text-white px-3 py-1 rounded">{t('common.print','Print')}</button>
        <button onClick={handlePdf} className="bg-green-700 text-white px-3 py-1 rounded">PDF</button>
        <button onClick={handleCsv} className="bg-gray-500 text-white px-3 py-1 rounded">CSV</button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 mb-6 items-end">
        <div>
          <label className="block text-sm mb-1">{t('filters.client','Client')}</label>
          <select value={clientId} onChange={e=>setClientId(e.target.value)} className="border rounded px-2 py-1 text-sm">
            <option value="">All</option>
            {clients.map(c=> (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm mb-1">{t('filters.project','Project')}</label>
          <select value={projectId} onChange={e=>setProjectId(e.target.value)} className="border rounded px-2 py-1 text-sm">
            <option value="">All</option>
            {projects.filter(p=> !clientId || p.clientId===Number(clientId)).map(p=> (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm mb-1">{t('filters.start','Start')}</label>
          <input
            type="date"
            value={start}
            onChange={(e) => setStart(e.target.value)}
            className="border rounded px-2 py-1 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm mb-1">{t('filters.end','End')}</label>
          <input
            type="date"
            value={end}
            onChange={(e) => setEnd(e.target.value)}
            className="border rounded px-2 py-1 text-sm"
          />
        </div>
        <button
          onClick={fetchReport}
          className="bg-blue-600 text-white px-4 py-1 rounded hover:bg-blue-700"
        >
          {t('common.apply','Apply')}
        </button>
      </div>

      {/* Table */}
      {loading ? (
        <p>Loading…</p>
      ) : (
        <div className="overflow-x-auto">
          <table id="pl-table" className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {[
                  "Client",
                  "Project",
                  "Advance",
                  "Labor",
                  "Expenses",
                  "Cost",
                  "Profit",
                ].map((h) => (
                  <th
                    key={h}
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {results.map((r) => (
                <tr key={`${r.projectId}-${r.currency}`}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">{r.clientName}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">{r.projectName}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">{r.advance} {r.currency}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">{r.labor.toFixed(2)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">{r.expenses.toFixed(2)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">{r.cost.toFixed(2)}</td>
                  <td className={`px-6 py-4 whitespace-nowrap text-sm font-semibold ${r.profit>=0?'text-green-600':'text-red-600'}`}>
                    {r.profit.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
            {totalsByCurrency && (
              <tfoot>
                {Object.entries(totalsByCurrency).map(([cur,t])=> (
                  <tr key={cur} className="bg-gray-100 font-semibold">
                    <td className="px-6 py-2" colSpan={2}>Totals ({cur})</td>
                    <td className="px-6 py-2">{t.advance.toFixed(2)}</td>
                    <td className="px-6 py-2">{t.labor.toFixed(2)}</td>
                    <td className="px-6 py-2">{t.expenses.toFixed(2)}</td>
                    <td className="px-6 py-2">{t.cost.toFixed(2)}</td>
                    <td className="px-6 py-2">{t.profit.toFixed(2)}</td>
                  </tr>
                ))}
              </tfoot>
            )}
          </table>
        </div>
      )}
    </div>
  );
}
