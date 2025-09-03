"use client";

import { useEffect, useState, FormEvent } from "react";
import { getAuth } from "@/lib/auth";
import Link from "next/link";

interface TrustAccount {
  id: number;
  client: { id: number; name: string };
  project?: { id: number; name: string } | null;
  balance: string | number;
  accountType: 'TRUST' | 'EXPENSE';
  currency: string;
}

interface TrustTxn {
  id: number;
  txnType: "CREDIT" | "DEBIT";
  amount: string;
  description: string | null;
  txnDate: string;
}

export default function TrustAdminPage() {
  const token = getAuth();
  const [accounts, setAccounts] = useState<TrustAccount[]>([]);
  const [accountType, setAccountType] = useState<'TRUST' | 'EXPENSE'>('TRUST');
  const [loading, setLoading] = useState(true);
  const [sel, setSel] = useState<TrustAccount | null>(null);
  const [txns, setTxns] = useState<TrustTxn[]>([]);
  const [txnLoading, setTxnLoading] = useState(false);
  const [form, setForm] = useState({ txnType: "CREDIT" as "CREDIT" | "DEBIT", amount: "", description: "" });
  const [submitting, setSubmitting] = useState(false);

  const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};

  const fetchAccounts = async () => {
    setLoading(true);
    const res = await fetch(`/api/trust-accounts?type=${accountType}`, { headers });
    let data: any[] = [];
    try {
      const ct = res.headers.get("content-type") || "";
      if (res.ok && ct.includes("application/json")) {
        data = await res.json();
      } else {
        console.warn("Non-JSON or error response", res.status);
      }
    } catch (err) {
      console.error("parse error", err);
    }
    setAccounts(data);
    setLoading(false);
  };

  const openAccount = async (acct: TrustAccount) => {
    setSel(acct);
    setTxnLoading(true);
    const res = await fetch(`/api/trust-transactions?accountId=${acct.id}`, { headers });
    setTxns(await res.json());
    setTxnLoading(false);
  };

  const addTxn = async (e: FormEvent) => {
    e.preventDefault();
    if (!sel) return;
    setSubmitting(true);
    const res = await fetch("/api/trust-transactions", {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({
        trustAccountId: sel.id,
        txnType: form.txnType,
        amount: form.amount,
        description: form.description,
      }),
    });
    const created = await res.json();
    if (res.ok) {
      setTxns((prev) => [created, ...prev]);
      // refresh accounts list to update balance
      fetchAccounts();
      setForm({ txnType: "CREDIT", amount: "", description: "" });
    } else {
      alert(created.error || res.statusText);
    }
    setSubmitting(false);
  };

  useEffect(() => {
    fetchAccounts();
  }, [accountType]);

  return (
    <div className="mx-auto max-w-5xl p-4">
      <h1 className="mb-4 text-2xl font-bold">Trust Accounts</h1>
      <div className="mb-4 space-x-2">
        {(['TRUST', 'EXPENSE'] as const).map((t) => (
          <button
            key={t}
            className={`rounded px-3 py-1 text-sm ${accountType===t? 'bg-blue-600 text-white':'bg-gray-200'}`}
            onClick={() => setAccountType(t)}
          >
            {t}
          </button>
        ))}
      </div>
      {loading ? (
        <p>Loading...</p>
      ) : (
        <table className="w-full table-auto border-collapse text-sm">
          <thead>
            <tr className="bg-gray-100 text-left">
              <th className="border p-2">Client</th>
              <th className="border p-2">Balance</th>
              <th className="border p-2">Project</th>
              <th className="border p-2">Type</th>
              <th className="border p-2">Currency</th>
              <th className="border p-2"></th>
            </tr>
          </thead>
          <tbody>
            {accounts.map((a) => (
              <tr key={`${a.client.id}-${a.currency}-${a.project?.id ?? 'all'}-${a.accountType}`} className="hover:bg-gray-50">
                <td className="border p-2">{a.client.name}</td>
                <td className="border p-2">{a.balance}</td>
                <td className="border p-2">{a.project?.name || '-'}</td>
                <td className="border p-2">{a.accountType}</td>
                <td className="border p-2">{a.currency}</td>
                <td className="border p-2">
                  <button
                    className="rounded bg-blue-600 px-2 py-1 text-white hover:bg-blue-500"
                    onClick={() => openAccount(a)}
                  >
                    View
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Drawer */}
      {sel && (
        <div className="fixed inset-0 z-20 flex">
          <div className="absolute inset-0 bg-black/30" onClick={() => setSel(null)} />
          <div className="ml-auto h-full w-full max-w-md bg-white p-4 shadow-lg dark:bg-gray-800 dark:text-gray-100">
            <h2 className="mb-4 text-lg font-semibold">{sel.client.name}{sel.project ? ` / ${sel.project.name}` : ''} – Balance: {sel.balance} {sel.currency}</h2>
            <form onSubmit={addTxn} className="mb-4 space-y-2">
              <div>
                <label className="mr-2 text-sm">Type</label>
                <select
                  className="rounded border p-1 text-sm"
                  value={form.txnType}
                  onChange={(e) => setForm((f) => ({ ...f, txnType: e.target.value as any }))}
                >
                  <option value="CREDIT">Deposit</option>
                  <option value="DEBIT">Debit</option>
                </select>
              </div>
              <div>
                <input
                  type="number"
                  step="0.01"
                  placeholder="Amount"
                  className="w-full rounded border p-1"
                  value={form.amount}
                  onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                  required
                />
              </div>
              <div>
                <input
                  type="text"
                  placeholder="Description"
                  className="w-full rounded border p-1"
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                />
              </div>
              <button
                disabled={submitting}
                className="rounded bg-green-600 px-3 py-1 text-white hover:bg-green-500 disabled:opacity-50"
              >
                {submitting ? "Saving..." : "Add"}
              </button>
            </form>
            <h3 className="mb-2 font-medium">Transactions</h3>
            {txnLoading ? (
              <p>Loading...</p>
            ) : txns.length === 0 ? (
              <p className="text-sm italic">No transactions.</p>
            ) : (
              <table className="w-full text-xs max-h-[60vh] overflow-y-auto">
                <thead>
                  <tr className="bg-gray-100 text-left">
                    <th className="border p-1">ID</th>
                    <th className="border p-1">Date</th>
                    <th className="border p-1">Type</th>
                    <th className="border p-1">Amount</th>
                    <th className="border p-1">Description</th>
                  </tr>
                </thead>
                <tbody className="overflow-y-auto">
                  {txns.map((t) => (
                    <tr key={t.id} className="border-b hover:bg-gray-50">
                      <td className="border p-1">{t.id}</td>
                      <td className="border p-1">{new Date(t.txnDate).toLocaleDateString()}</td>
                      <td className="border p-1">{t.txnType}</td>
                      <td className="border p-1">{t.amount}</td>
                      <td className="border p-1 truncate max-w-[120px]">{t.description}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
