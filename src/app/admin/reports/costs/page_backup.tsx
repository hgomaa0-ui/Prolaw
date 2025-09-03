"use client";

import React, { useEffect, useState, useCallback } from "react";
import { getAuth } from "@/lib/auth";
import Link from "next/link";
import { useTranslation } from "react-i18next";

interface CostRow {
  projectId: number;
  projectName: string;
  lawyerId: number;
  lawyerName: string;
  hours: number;
  rate: number;
  currency: string | null;
  expenses?: number;
  laborTotal?: number;
  total: number;
}

const findAssignment = (projectId:number, lawyerId:number, assignments:any[]) => assignments.find((a:any)=>a.projectId===projectId && a.userId===lawyerId);

export default function CostsReportPage() {
  const { t, i18n } = useTranslation('reports');
  const token = getAuth();
  const [rows, setRows] = useState<CostRow[]>([]);
  const [totals, setTotals] = useState<Record<string, { labor: number; expenses: number; total: number }>>({});
  const [clientFilter, setClientFilter] = useState<string>("");
  const [projectFilter, setProjectFilter] = useState<string>("");
  const [lawyerFilter, setLawyerFilter] = useState<string>("");
  const [clients, setClients] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [lawyers, setLawyers] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [drafts, setDrafts] = useState<Record<number, number>>({});
  const [from, setFrom] = useState<string>("");
  const [to, setTo] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
  }, [token]);

  // load dropdown data
  useEffect(() => {
    if (!token) return;
    const load = async () => {
      const headers = { Authorization: `Bearer ${token}` } as any;
    
    // fetch assignments too
    const aRes = await fetch("/api/assignments", { headers });
    if (aRes.ok) setAssignments(await aRes.json());
      const [cRes, pRes, lRes] = await Promise.all([
        fetch("/api/clients", { headers }),
        fetch("/api/projects", { headers }),
        fetch("/api/lawyers", { headers }),
      ]);
      if (cRes.ok) setClients(await cRes.json());
      if (pRes.ok) setProjects(await pRes.json());
      if (lRes.ok) setLawyers(await lRes.json());
    };
    load();
  }, [token]);

  const fetchData = async (signal?: AbortSignal) => {
    if (!token) return;
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      if (clientFilter) params.append("clientId", clientFilter);
      if (projectFilter) params.append("projectId", projectFilter);
      if (lawyerFilter) params.append("userId", lawyerFilter);
      if (from) params.append("from", new Date(from).toISOString());
      if (to) params.append("to", new Date(to).toISOString());
      const res = await fetch(`/api/reports/costs?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
        signal,
      });
      if (!res.ok) throw new Error("Failed to load report");
      const data = await res.json();
      setRows(data.rows || []);
      setTotals(data.totals || {});
    } catch (err: any) {
      if (err.name !== "AbortError") setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const controller = new AbortController();
  useEffect(() => {
    fetchData(controller.signal);
    return () => controller.abort();
  }, [token]);

  // group rows by project+currency
  const grouped = rows.reduce((acc: any, r: any) => {
    const key = `${r.projectName}|${r.currency ?? ''}`;
    (acc[key] = acc[key] || []).push(r);
    return acc;
  }, {});

  // grand totals per currency
  const currencyTotals: Record<string, number> = {};
  Object.entries(totals).forEach(([cur, val]) => {
    currencyTotals[cur] = val.total;
  });

  return (
    <div className="container mx-auto max-w-5xl p-8">
      <h1 className="mb-6 text-3xl font-bold">{t('title')}</h1>
      {/* Filter form */}
      <form
        className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-5"
        onSubmit={(e) => {
          e.preventDefault();
          fetchData();
        }}
      >
        <select
          className="w-full rounded border px-2 py-1"
          value={clientFilter}
          onChange={(e) => {
            setClientFilter(e.target.value);
            // reset project when client changes
            setProjectFilter("");
          }}
        >
          <option value="">{t('filters.allClients')}</option>
          {clients.map((c: any) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <select
          className="w-full rounded border px-2 py-1"
          value={projectFilter}
          onChange={(e) => setProjectFilter(e.target.value)}
        >
          <option value="">{t('filters.allProjects')}</option>
          {projects
            .filter((p: any) => !clientFilter || p.clientId === Number(clientFilter))
            .map((p: any) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
        </select>
        <select
          className="w-full rounded border px-2 py-1"
          value={lawyerFilter}
          onChange={(e) => setLawyerFilter(e.target.value)}
        >
          <option value="">{t('filters.allLawyers')}</option>
          {lawyers.map((l: any) => (
            <option key={l.id} value={l.id}>
              {l.name}
            </option>
          ))}
        </select>
        <input
          type="date"
          className="w-full rounded border px-2 py-1"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
        />
        <input
          type="date"
          className="w-full rounded border px-2 py-1"
          value={to}
          onChange={(e) => setTo(e.target.value)}
        />
        <button
          type="submit"
          className="rounded bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700 sm:col-span-2 lg:col-span-1"
        >
          {t('buttons.applyFilters')}
        </button>
        <button
          type="button"
          className="rounded bg-gray-300 px-4 py-2 font-semibold text-gray-800 hover:bg-gray-400 sm:col-span-2 lg:col-span-1"
          onClick={() => {
            setProjectFilter("");
            setLawyerFilter("");
            setFrom("");
            setTo("");
            fetchData();
          }}
        >
          {t('buttons.reset')}
        </button>
      </form>
        <button
          type="button"
          className="rounded bg-green-600 px-4 py-2 font-semibold text-white hover:bg-green-700 sm:col-span-2 lg:col-span-1"
          onClick={() => {
            if (rows.length === 0) return;
            const csvRows = [
              ["Project","Lawyer","Hours","Rate","Currency","Total"],
              ...rows.map(r=>[
                r.projectName,
                r.lawyerName,
                r.hours.toFixed(2),
                r.rate.toFixed(2),
                r.currency??"",
                r.total.toFixed(2)
              ])
            ];
            const csv = "\uFEFF" + csvRows.map(a=>a.map(v=>`"${String(v).replace(/"/g,'""')}"`).join(",")).join("\r\n");
            const blob = new Blob([csv],{type:"text/csv;charset=utf-8;"});
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href=url;
            link.download="cost_report.csv";
            link.click();
            URL.revokeObjectURL(url);
          }}
        >
          {t('buttons.exportCSV')}
        </button>
        <button
          type="button"
          className="rounded bg-purple-600 px-4 py-2 font-semibold text-white hover:bg-purple-700 sm:col-span-2 lg:col-span-1"
          onClick={async () => {
            if (rows.length === 0) return;
            const { jsPDF } = await import("jspdf");
            // @ts-ignore – dynamic import may lack types
            const autoTable = (await import("jspdf-autotable")).default;
            const doc = new jsPDF({ orientation: "landscape" });
            doc.setFontSize(16);
            doc.text("Cost Report", 14, 15);
            doc.setFontSize(10);
            doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 22);
            const head = [["Project","Lawyer","Hours","Rate","Currency","Total"]];
            const body = rows.map(r=>[
              r.projectName,
              r.lawyerName,
              r.hours.toFixed(2),
              r.rate.toFixed(2),
              r.currency??"",
              r.total.toFixed(2)
            ]);
            autoTable(doc, {
              head,
              body,
              startY: 28,
              styles: { halign: 'left' },
              headStyles: { fillColor: [52,73,94], textColor: 255 },
              theme: 'grid',
            });
            doc.save("cost_report.pdf");
          }}
        >
          {t('buttons.exportPDF')}
        </button>
      </form>

      {loading ? (
        <p>Loading…</p>
      ) : error ? (
        <p className="text-red-600">{error}</p>
      ) : (
        <>
        {assignments.some((a:any)=>a.readyForInvoicing) && (
          <button
            className="mb-4 rounded bg-green-600 px-4 py-2 font-semibold text-white hover:bg-green-700"
            onClick={async ()=>{
              const ready = assignments.filter((a:any)=>a.readyForInvoicing);
              if(ready.length===0) return;
              const byProject: Record<number, any[]> = {};
              ready.forEach((a:any)=>{
                if(!byProject[a.projectId]) byProject[a.projectId]=[];
                byProject[a.projectId].push(a);
              });
              for(const [projectId, list] of Object.entries(byProject)){
                const project = projects.find((p:any)=>p.id===Number(projectId));
                if(!project) continue;
                const clientId = project.clientId || project.client?.id;
                const items = list.map((a:any)=>{
                  const row = rows.find(r=>r.projectId===a.projectId && r.lawyerId===a.userId);
                  return {
                    description: `${project.name} - ${a.user.name}`,
                    quantity: row?.hours || 0,
                    unitPrice: row?.rate || a.hourlyRate || 0
                  }
                });
                const res = await fetch('/api/invoices',{
                  method:'POST',
                  headers:{'Content-Type':'application/json', Authorization:`Bearer ${token}`},
                  body: JSON.stringify({ clientId, projectId:Number(projectId), items, status:'DRAFT', currency: rows.find(r=>r.projectId===Number(projectId))?.currency || 'USD' })
                });
                if(res.ok){
                  const inv = await res.json();
                  window.open(`/invoices/${inv.id}`,'_blank');
                  setDrafts(prev=>({...prev,[Number(projectId)]:inv.id}));
                  // mark related assignments as invoiced / not ready
                  for(const asn of list){
                    await fetch(`/api/assignments/${asn.id}`,{
                      method:'PUT',
                      headers:{'Content-Type':'application/json', Authorization:`Bearer ${token}`},
                      body: JSON.stringify({ readyForInvoicing:false })
                    });
                  }
                }
              }
            }}
          >
            {t('buttons.generateInvoice')}
          </button>
        )}
        <div className="overflow-x-auto">
          <table className="min-w-full table-auto border-collapse text-sm" id="costs-table">
            <thead>
              <tr className="bg-gray-100 text-left">
                <th className="border px-3 py-2">{t('headers.project')}</th>
                <th className="border px-3 py-2">{t('headers.lawyer')}</th>
                <th className="border px-3 py-2 text-right">{t('headers.hours')}</th>
                <th className="border px-3 py-2 text-left">{t('table.rate')}</th>
                <th className="border px-3 py-2 text-left">{t('table.expenses')}</th>
                <th className="border px-3 py-2 text-right">{t('headers.total')}</th>
                <th className="border px-3 py-2 text-right">{t('headers.ready')}</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(grouped).map(([key, list]) => {
                const [project, curKey] = key.split('|');
                const currency = curKey || (list[0]?.currency ?? '');

                const projectHours = list.reduce((s: number, r: any) => s + r.hours, 0);
                const projectExpenses = list.reduce((s: number, r: any) => s + (r.expenses || 0), 0);
                const subtotal = list.reduce((s: number, r: any) => s + r.total, 0);

                return (
                  <React.Fragment key={key}>
                    <tr className="bg-blue-50 font-semibold">
                      <td className="border px-3 py-2">{project}</td>
                      <td className="border px-3 py-2">
                        {drafts[list[0].projectId] && (
                          <Link
                            href={`/invoices/${drafts[list[0].projectId]}`}
                            target="_blank"
                            className="text-blue-600 underline"
                          >
                            View Invoice
                          </Link>
                        )}
                      </td>
                      <td className="border px-3 py-2 text-right">{projectHours.toFixed(2)}</td>
                      <td className="border px-3 py-2 text-right">
                        {currency} {projectExpenses.toFixed(2)}
                      </td>
                      <td className="border px-3 py-2 text-right">
                        {currency} {subtotal.toFixed(2)}
                      </td>
                      <td className="border px-3 py-2 text-right"></td>
                    </tr>
                    {list.map((r: any) => {
                      const asn = findAssignment(r.projectId, r.lawyerId, assignments);
                      const ready = asn?.readyForInvoicing ?? false;

                      const toggle = async () => {
                        if (!asn) return;
                        const res = await fetch(`/api/assignments/${asn.id}`, {
                          method: 'PUT',
                          headers: {
                            'Content-Type': 'application/json',
                            Authorization: `Bearer ${token}`,
                          },
                          body: JSON.stringify({ readyForInvoicing: !ready }),
                        });
                        if (res.ok) {
                          setAssignments((prev) =>
                            prev.map((a: any) =>
                              a.id === asn.id ? { ...a, readyForInvoicing: !ready } : a
                            )
                          );
                        }
                      };
                      return (
                        <tr key={`${r.projectId}-${r.lawyerId}`} className="odd:bg-white even:bg-gray-50">
                          <td className="border px-3 py-2"></td>
                          <td className="border px-3 py-2">{r.lawyerName}</td>
                          <td className="border px-3 py-2 text-right">{r.hours.toFixed(2)}</td>
                          <td className="border px-3 py-2 text-right">
                            {r.currency ?? ''} {(Number(r.rate) || 0).toFixed(2)}
                          </td>
                          <td className="border px-3 py-2 text-right">{r.expenses?.toFixed(2) ?? '0.00'}</td>
                          <td className="border px-3 py-2 text-right font-semibold">
                            {r.currency ?? ''} {(Number(r.total) || 0).toFixed(2)}
                          </td>
                          <td className="border px-3 py-2 text-right">
                            <input type="checkbox" checked={ready} onChange={toggle} />
                          </td>
                        </tr>
                      );
                    })}
                  </React.Fragment>
                );
              })}
              {Object.entries(currencyTotals)
                .filter(([, total]) => total > 0)
                .map(([cur, total]) => (
                  <tr key={cur} className="bg-gray-200 font-bold">
                    <td colSpan={4}></td>
                    <td className="border px-3 py-2 text-right">Grand Total ({cur || '―'})</td>
                    <td className="border px-3 py-2 text-right">
                      {cur} {total.toFixed(2)}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
            <table className="min-w-full table-auto border-collapse text-sm" id="costs-table">
            <thead>
              <tr className="bg-gray-100 text-left">
                <th className="border px-3 py-2">{t('headers.project')}</th>
                <th className="border px-3 py-2">{t('headers.lawyer')}</th>
                <th className="border px-3 py-2 text-right">{t('headers.hours')}</th>
                <th className="border px-3 py-2 text-left">{t('table.rate')}</th>
                <th className="border px-3 py-2 text-left">{t('table.expenses')}</th>
                <th className="border px-3 py-2 text-right">{t('headers.total')}</th>
                <th className="border px-3 py-2 text-right">{t('headers.ready')}</th>
              </tr>
            </thead>
            <tbody>
                         {drafts[list[0].projectId] && (
                           <Link href={`/invoices/${drafts[list[0].projectId]}`} target="_blank" className="text-blue-600 underline">
                             View Invoice
                           </Link>
                         )}
                       </td>
                       <td className="border px-3 py-2 text-right">{projectHours.toFixed(2)}</td>
                      <td className="border px-3 py-2 text-right">{currency} {projectExpenses.toFixed(2)}</td>
                      <td className="border px-3 py-2 text-right">{currency} {subtotal.toFixed(2)}</td>
                      <td className="border px-3 py-2 text-right"></td>
                    </tr>
                    {list.map((r) => {
                      const asn = findAssignment(r.projectId, r.lawyerId, assignments);
                      const ready = asn?.readyForInvoicing ?? false;
                      const toggle = async () => {
                        if (!asn) return;
                        const res = await fetch(`/api/assignments/${asn.id}`, {
                          method: "PUT",
                          headers: {
                            "Content-Type": "application/json",
                            Authorization: `Bearer ${token}`,
                          },
                          body: JSON.stringify({ readyForInvoicing: !ready }),
                        });
                        if (res.ok) {
                          setAssignments((prev) => prev.map((a:any)=>a.id===asn.id?{...a,readyForInvoicing:!ready}:a));
                        }
                      };
                      return (
                        <tr key={`${r.projectId}-${r.lawyerId}`} className="odd:bg-white even:bg-gray-50">
                          <td className="border px-3 py-2"></td>
                          <td className="border px-3 py-2">{r.lawyerName}</td>
                          <td className="border px-3 py-2 text-right">{r.hours.toFixed(2)}</td>
                          <td className="border px-3 py-2 text-right">
                            {r.rate === 0 ? (
                              <span className="text-red-600">Missing Rate</span>
                            ) : (
                              <>
                                {r.currency ?? ""} {(Number(r.rate) || 0).toFixed(2)}
                              </>
                            )}
                            {/* keep warning icon if rate 0 */}
                            {r.rate === 0 && (
                              <span className="ml-1 text-xs text-orange-600">Missing Rate</span>
                            )}
                          </td>
                          <td className="border px-3 py-2 text-right">{r.expenses?.toFixed(2) ?? "0.00"}</td>
                          <td className="border px-3 py-2 text-right font-semibold">
                            {r.currency ?? ""} {(Number(r.total) || 0).toFixed(2)}
                          </td>
                          <td className="border px-3 py-2 text-right">
                            <input
                              type="checkbox"
                              checked={ready}
                              onChange={toggle}
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </React.Fragment>
                );
              })}
              {/* grand totals per currency */}
              {Object.entries(currencyTotals).filter(([,total])=>total>0).map(([cur, total]) => (
                <tr key={cur} className="bg-gray-200 font-bold">
                  <td colSpan={4}></td>
                  <td className="border px-3 py-2 text-right">Grand Total ({cur || "―"})</td>
                  <td></td>
                  <td className="border px-3 py-2 text-right">
                    {cur} {total.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
           </table>
           {/* Totals footer per currency */}
           <div className="mt-4">
             <table className="min-w-full table-auto text-sm">
               <tbody>
                 {Object.entries(currencyTotals).map(([cur, total]) => (
                   <tr key={cur} className="font-semibold bg-gray-100">
                     <td className="px-3 py-2" colSpan={4}>{`Totals (${cur})`}</td>
                     <td className="px-3 py-2 text-right" colSpan={2}>{total.toFixed(2)}</td>
                   </tr>
                 ))}
               </tbody>
             </table>
           </div>
        </div>
        </>
      )}
    </div>
  );
}
