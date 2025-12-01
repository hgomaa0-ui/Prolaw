"use client";

import React, { useEffect, useState } from "react";
import { getAuth } from "@/lib/auth";
import { useTranslation, initReactI18next } from "react-i18next";
import i18n from "i18next";

// ensure i18n initialised once (client side)
if (typeof window !== 'undefined' && !i18n.isInitialized) {
  i18n.use(initReactI18next).init({
    lng: 'en',
    resources: {},
  });
}

interface Expense {
  id: number;
  projectId: number;
  amount: number;
  currency: string;
  description: string;
  incurredOn: string;
  project?: { name: string; client?: { name: string } };
  receiptUrl?: string;
}

export default function ExpensesPage() {
  const { t } = useTranslation("expenses");
  const token = getAuth();
  // helper to decode userId from JWT
  const getUserIdFromToken = () => {
    if (!token) return null;
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return Number(payload.sub);
    } catch {
      return null;
    }
  };
  const currentUserId = getUserIdFromToken();
  // decode role to know if admin
  const getRoleFromToken = () => {
    if (!token) return null;
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.role ?? null;
    } catch {
      return null;
    }
  };
  const role = getRoleFromToken();
  const isAdmin = ["OWNER","ADMIN","MANAGING_PARTNER","HR_MANAGER","LAWYER_MANAGER"].includes(String(role));
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [lawyers, setLawyers] = useState<{id:number;name:string}[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<number|"">("");

  // form state
  const [clientId, setClientId] = useState("");
  const [projectId, setProjectId] = useState("");
  const [type, setType] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [loading, setLoading] = useState(false);
  const [receiptFile,setReceiptFile]=useState<File|null>(null);
  const [editingId,setEditingId]=useState<number|null>(null);
  const [editAmount,setEditAmount]=useState("");
  const [editDescription,setEditDescription]=useState("");

  const headers = token ? { Authorization: `Bearer ${token}` } : undefined;

  const loadLists = async () => {
    const [cRes, pRes, aRes, lRes] = await Promise.all([
      fetch("/api/clients", { headers }),
      fetch("/api/projects", { headers }),
      fetch("/api/assignments", { headers }),
      isAdmin ? fetch("/api/lawyers", { headers }) : Promise.resolve(new Response(JSON.stringify([]), { headers: { 'Content-Type':'application/json' } })),
    ]);

    const allClients = cRes.ok ? await cRes.json() : [];
    if (aRes.ok) {
      const asn = await aRes.json();
      setAssignments(asn);
      // build unique projects list from assignments
      const uniqProjects = Array.from(new Map(asn.map((a:any)=>{
        const proj = { ...a.project, clientId: a.project.client?.id };
        return [proj.id, proj];
      })).values());
      setProjects(uniqProjects);

      // for non-admin users, restrict clients to those they have assignments for
      if (!isAdmin) {
        const clientMap = new Map<number, any>();
        asn.forEach((a:any)=>{
          const c = a.project?.client;
          if (c && !clientMap.has(c.id)) clientMap.set(c.id, c);
        });
        setClients(Array.from(clientMap.values()));
      } else {
        setClients(allClients);
      }
    } else {
      // fallback: no assignments API, use full projects/clients
      if (pRes.ok) setProjects(await pRes.json());
      setClients(allClients);
    }

    if (isAdmin && lRes.ok) {
      const ls = await lRes.json();
      setLawyers(Array.isArray(ls) ? ls : []);
    }
  };

  const loadExpenses = async () => {
    const res = await fetch("/api/expenses", { headers });
    if (res.ok) setExpenses(await res.json());
  };

  useEffect(() => {
    loadLists();
    loadExpenses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const resetForm = () => {
    setClientId("");
    setProjectId("");
    setType("");
    setDescription("");
    setAmount("");
    setReceiptFile(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectId || !amount) return;
    setLoading(true);
      let receiptUrl: string | undefined;
      if(receiptFile){
        const fd = new FormData();
        fd.append('file', receiptFile);
        const upRes = await fetch('/api/upload/receipt', { method: 'POST', body: fd, headers });
        if(upRes.ok){
          const j = await upRes.json();
          receiptUrl = j.url;
        }
      }
    try {
      const isAdminMode = isAdmin && selectedUserId !== "";
      const url = isAdminMode ? "/api/admin/expenses" : "/api/expenses";
      const payload:any = { projectId: Number(projectId), amount: Number(amount), currency, type: type || 'OTHER', description, receiptUrl };
      if (isAdminMode) payload.userId = Number(selectedUserId);
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...headers,
        },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        resetForm();
        loadExpenses();
      } else {
        const err = await res.json().catch(()=>({error:'Error'}));
        alert(err.error || 'Save failed');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto max-w-4xl p-6">
      <h1 className="mb-6 text-3xl font-bold">{t("title", { defaultValue: "Expenses" })}</h1>

      {/* form */}
      <form onSubmit={handleSubmit} className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-3">
        {isAdmin && (
          <select
            className="rounded border px-3 py-2"
            value={selectedUserId}
            onChange={(e)=>setSelectedUserId(e.target.value? Number(e.target.value):"")}
            required
          >
            <option value="">Select Lawyer</option>
            {lawyers.map(l=> (
              <option key={l.id} value={l.id}>{l.name}</option>
            ))}
          </select>
        )}
        <select
          className="rounded border px-3 py-2"
          value={clientId}
          onChange={(e) => {
            setClientId(e.target.value);
            setProjectId("");
          }}
        >
          <option value="">{t("allClients", { defaultValue: "Select Client" })}</option>
          {clients.map((c: any) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <select
          className="rounded border px-3 py-2"
          value={projectId}
          onChange={(e) => setProjectId(e.target.value)}
          disabled={!clientId}
        >
          <option value="">{t("allProjects", { defaultValue: "Select Project" })}</option>
          {projects
            .filter((p: any) => {
              const projClientId = (p.clientId ?? (p.client?.id)) as number | undefined;
              const clientOk = !clientId || projClientId === Number(clientId);
              const targetUser = isAdmin && selectedUserId !== "" ? Number(selectedUserId) : currentUserId;
              const assignedOk = assignments.some((a:any)=>a.projectId===p.id && (!targetUser || a.userId===targetUser));
              return clientOk && assignedOk;
            })
            .map((p: any) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
        </select>
        <input type="file" onChange={e=>setReceiptFile(e.target.files?.[0]||null)} className="md:col-span-2" />
        <input
          className="rounded border px-3 py-2"
          placeholder={t("type", { defaultValue: "Expense Type" })}
          value={type}
          onChange={(e) => setType(e.target.value)}
        />
        <input
          className="md:col-span-2 rounded border px-3 py-2"
          placeholder={t("description", { defaultValue: "Description" })}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        <div className="flex gap-2">
          <input
            type="number"
            className="w-full rounded border px-3 py-2"
            placeholder={t("amount", { defaultValue: "Amount" })}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
          <select
            className="rounded border px-2"
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
          >
            {[
              "USD",
              "EUR",
              "GBP",
              "SAR",
              "EGP",
              "AED",
              "QAR",
              "KWD",
              "OMR",
              "JPY",
              "CNY",
              "INR",
            ].map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <button
          type="submit"
          disabled={loading || !projectId || !amount}
          className="rounded bg-green-600 px-4 py-2 font-semibold text-white hover:bg-green-700"
        >
          {t("add", { defaultValue: loading ? "Saving..." : "Add" })}
        </button>
      </form>


    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-gray-100 text-left">
            <th className="border px-3 py-2">{t("headers.client", { defaultValue: "Client" })}</th>
            <th className="border px-3 py-2">{t("headers.project", { defaultValue: "Project" })}</th>
            <th className="border px-3 py-2 text-right">{t("headers.amount", { defaultValue: "Amount" })}</th>
            <th className="border px-3 py-2">{t("headers.description", { defaultValue: "Description" })}</th>
            <th className="border px-3 py-2">{t("headers.date", { defaultValue: "Date" })}</th>
            <th className="border px-3 py-2">Actions</th>
          </tr>
        </thead>
        <tbody>
          {expenses.map((e) => (
            <tr key={e.id}>
              <td className="border px-3 py-1 text-sm">{e.project?.client?.name}</td>
              <td className="border px-3 py-1 text-sm">{e.project?.name}</td>
              {editingId === e.id ? (
                <>
                  <td className="border px-3 py-1 text-sm text-right">
                    <input value={editAmount} onChange={(ev) => setEditAmount(ev.target.value)} className="border rounded px-1 w-24" /> {e.currency}
                  </td>
                  <td className="border px-3 py-1 text-sm"><input value={editDescription} onChange={(ev) => setEditDescription(ev.target.value)} className="border rounded px-1 w-full" /></td>
                  <td className="border px-3 py-1 text-sm">{new Date(e.incurredOn).toLocaleDateString()}</td>
                  <td className="border px-3 py-1 text-sm">
                    <button className="text-green-600 mr-2" onClick={async () => { await fetch(`/api/expenses/${e.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify({ amount: Number(editAmount), description: editDescription }) }); setEditingId(null); loadExpenses(); }}>{t('save', { defaultValue: 'Save' })}</button>
                    <button className="text-gray-600" onClick={() => setEditingId(null)}>{t('cancel', { defaultValue: 'Cancel' })}</button>
                  </td>
                </>
              ) : (
                <>
                  <td className="border px-3 py-1 text-sm text-right">{Number(e.amount).toFixed(2)} {e.currency}</td>
                  <td className="border px-3 py-1 text-sm">{e.description} {e.receiptUrl && (<a href={e.receiptUrl} target="_blank" rel="noopener" className="text-blue-600 ml-1">📎</a>)}</td>
                  <td className="border px-3 py-1 text-sm">{new Date(e.incurredOn).toLocaleDateString()}</td>
                  <td className="border px-3 py-1 text-sm">
                    <button className="text-blue-600 mr-2" onClick={() => { setEditingId(e.id); setEditAmount(String(e.amount)); setEditDescription(e.description); }}>{t('edit', { defaultValue: 'Edit' })}</button>
                    <button className="text-red-600" onClick={async () => { if (confirm('Delete?')) { await fetch(`/api/expenses/${e.id}`, { method: 'DELETE', headers }); loadExpenses(); } }}>{t('delete', { defaultValue: 'Delete' })}</button>
                  </td>
                </>
              )}
            </tr>
          ))}
          {expenses.length === 0 && (
            <tr>
              <td colSpan={6} className="border px-3 py-4 text-center text-sm text-gray-500">
                {t('noData', { defaultValue: 'No expenses yet.' })}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  </div>
);
}
