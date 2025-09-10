"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Client {
  id: number;
  name: string;
}
interface Project {
  id: number;
  name: string;
}
interface Entry {
  id: number;
  createdAt: string;
  amount: string;
  notes: string | null;
  client: Client | null;
  project: Project | null;
}

export default function ExpenseCashPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [clientId, setClientId] = useState<string>("");
  const [projectId, setProjectId] = useState<string>("");
  const [entries, setEntries] = useState<Entry[]>([]);
  const [balance, setBalance] = useState<number>(0);

  useEffect(() => {
    fetch("/api/clients").then(r => r.json()).then(setClients);
  }, []);

  useEffect(() => {
    if (clientId) {
      fetch(`/api/projects?clientId=${clientId}`).then(r => r.json()).then(setProjects);
    } else {
      setProjects([]);
    }
  }, [clientId]);

  useEffect(() => {
    const url = new URL(`/api/expense-cash-ledger`, window.location.origin);
    if (clientId) url.searchParams.set("clientId", clientId);
    if (projectId) url.searchParams.set("projectId", projectId);
    fetch(url.toString())
      .then(r => r.json())
      .then(({ balance, entries }) => {
        setBalance(balance);
        setEntries(entries);
      });
  }, [clientId, projectId]);

  return (
    <div className="p-8 space-y-6">
      <Link href="/accounts/general-cash" className="text-blue-500 hover:underline">← Back to Cash Ledgers</Link>
      <h1 className="text-2xl font-bold">Project Expense Cash</h1>

      <div className="flex gap-4 items-end flex-wrap">
        <div>
          <label className="block text-sm font-medium">Client</label>
          <select
            value={clientId}
            onChange={e => {
              setClientId(e.target.value);
              setProjectId("");
            }}
            className="mt-1 border rounded px-2 py-1"
          >
            <option value="">All</option>
            {clients.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium">Project</label>
          <select
            value={projectId}
            onChange={e => setProjectId(e.target.value)}
            className="mt-1 border rounded px-2 py-1"
          >
            <option value="">All</option>
            {projects.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>

        <div className="ml-auto text-lg font-semibold">
          Balance: <span className={balance >= 0 ? "text-green-600" : "text-red-600"}>{balance.toFixed(2)}</span>
        </div>
      </div>

      <table className="w-full mt-6 border">
        <thead className="bg-gray-100 text-sm">
          <tr>
            <th className="p-2 border">Date</th>
            <th className="p-2 border">Client</th>
            <th className="p-2 border">Project</th>
            <th className="p-2 border">Amount</th>
            <th className="p-2 border">Notes</th>
          </tr>
        </thead>
        <tbody>
          {entries.map(e => (
            <tr key={e.id} className="text-sm">
              <td className="p-2 border">{new Date(e.createdAt).toLocaleDateString()}</td>
              <td className="p-2 border">{e.client?.name ?? '-'}</td>
              <td className="p-2 border">{e.project?.name ?? '-'}</td>
              <td className="p-2 border text-right">{Number(e.amount).toFixed(2)}</td>
              <td className="p-2 border">{e.notes ?? ''}</td>
            </tr>
          ))}
          {!entries.length && (
            <tr><td colSpan={5} className="p-4 text-center text-gray-500">No entries</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
