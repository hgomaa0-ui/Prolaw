'use client';

import useSWR from 'swr';
import { mutate } from 'swr';
import { useState, useEffect } from 'react';
import Link from 'next/link';

const fetcher = async (url: string) => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  const res = await fetch(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  return res.json();
};

function BanksSection() {
  const { data, isLoading } = useSWR('/api/banks', fetcher);
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  const headers = token ? { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` } : { 'Content-Type': 'application/json' };
  const [name, setName] = useState('');
  const [currency, setCurrency] = useState('EGP');
  if (isLoading) return null;
  const banks = Array.isArray(data) ? data : [];
  return (
    <div className="mt-8 max-w-lg border p-4 rounded bg-gray-50">
      <h3 className="font-semibold mb-2">Banks</h3>
      {banks.length > 0 && (
        <table className="text-sm border min-w-full mb-4">
          <thead className="bg-gray-100"><tr><th className="border px-3 py-1">Name</th><th className="border px-3 py-1">Currency</th><th className="border px-3 py-1 text-right">Balance</th></tr></thead>
          <tbody>
            {banks.map((b:any)=>(
              <tr key={b.id}><td className="border px-3 py-1">{b.name}</td><td className="border px-3 py-1">{b.currency}</td><td className="border px-3 py-1 text-right">{Number(b.balance).toFixed(2)}</td></tr>
            ))}
          </tbody>
        </table>
      )}
      <form className="flex gap-2 items-center" onSubmit={async(e)=>{e.preventDefault();if(!name)return;const res=await fetch('/api/banks',{method:'POST',headers,body:JSON.stringify({companyId:1,name,currency})});if(res.ok){mutate('/api/banks');setName('');}else{alert('Save failed');}}}>
        <input value={name} onChange={(e)=>setName(e.target.value)} placeholder="Bank name" className="border px-2 py-1" />
        <select value={currency} onChange={(e)=>setCurrency(e.target.value)} className="border px-2 py-1">
          {['EGP','USD','EUR','SAR','GBP'].map(c=>(<option key={c}>{c}</option>))}
        </select>
        <button type="submit" className="bg-blue-600 text-white px-3 py-1 rounded">Add</button>
      </form>
    </div>
  );
}

function ClientSummary({ clientId, projectId }: { clientId: number | null; projectId: number | null }) {
  const params = [] as string[];
  if (clientId !== null) params.push(`clientId=${clientId}`);
  if (projectId !== null) params.push(`projectId=${projectId}`);
  const url = params.length ? `/api/trust-accounts?${params.join('&')}` : '/api/trust-accounts';
  const { data, isLoading, error } = useSWR(url, fetcher);
  if (isLoading) return null;
  if (error) return null;
  const rows: Record<string, Record<string, number>> = {};
  (Array.isArray(data) ? data : []).forEach((acct: any) => {
    const client = acct.client?.name || '—';
    rows[client] ??= {};
    rows[client][acct.currency] = (rows[client][acct.currency] || 0) + Number(acct.balance);
  });
  const clientNames = Object.keys(rows);
  if (clientNames.length === 0) return null;
  return (
    <div className="mt-8 max-w-lg">
      <h3 className="font-semibold mb-2">Client Balances</h3>
      <table className="text-sm border min-w-full">
        <thead className="bg-gray-100">
          <tr>
            <th className="border px-3 py-1">Client</th>
            <th className="border px-3 py-1">Currency</th>
            <th className="border px-3 py-1 text-right">Balance</th>
          </tr>
        </thead>
        <tbody>
          {clientNames.map((client) => Object.entries(rows[client]).map(([cur, bal]) => (
            <tr key={client+cur}>
              <td className="border px-3 py-1">{client}</td>
              <td className="border px-3 py-1">{cur}</td>
              <td className={`border px-3 py-1 text-right ${bal<0?'text-red-600':''}`}>{bal.toFixed(2)}</td>
            </tr>
          )))}
        </tbody>
      </table>
    </div>
  );
}

function Table({ clientId, projectId, onSelect }: { clientId: number | null; projectId: number | null; onSelect: (accountId: number) => void }) {
      const params = [] as string[];
  if (clientId !== null) params.push(`clientId=${clientId}`);
  if (projectId !== null) params.push(`projectId=${projectId}`);
  const url = params.length ? `/api/trust-accounts?${params.join('&')}` : '/api/trust-accounts';
  const { data, isLoading, error } = useSWR(url, fetcher);

  if (isLoading) return <p>Loading...</p>;
  if (error) return <p className="text-red-600">Failed to load</p>;

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm text-left border">
        <thead className="bg-gray-100">
          <tr>
            <th className="px-4 py-2 border">Client</th>
            <th className="px-4 py-2 border">Project</th>
            <th className="px-4 py-2 border text-right">Balance</th>
            <th className="px-4 py-2 border">Actions</th>
          </tr>
        </thead>
        <tbody>
          {Array.isArray(data) && data.length > 0 ? data.map((acct: any) => (
            <tr key={acct.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => onSelect(acct.id)}>
              <td className="px-4 py-2 border">{acct.client?.name || '—'}</td>
              <td className="px-4 py-2 border">
                {acct.project ? (
                  <Link href={`/projects/${acct.project.id}`}>{acct.project.name}</Link>
                ) : '—'}
              </td>
              <td className={`px-4 py-2 border text-right ${acct.balance < 0 ? 'text-red-600' : ''}`}>{acct.balance.toFixed(2)} {acct.currency}</td>
              <td className="px-4 py-2 border">
                <button
                  className="text-red-600 hover:underline"
                  onClick={async (e) => {
                    e.stopPropagation();
                    if (!confirm('Delete trust account?')) return;
                    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
                    const headers = token ? { Authorization: `Bearer ${token}` } : {};
                    const res = await fetch(`/api/trust-accounts/${acct.id}`, { method: 'DELETE', headers });
                    if (res.ok) {
                      mutate(url);
                    } else {
                      const err = await res.json().catch(()=>({}));
                      alert(err.error || 'Delete failed');
                    }
                  }}
                >Delete</button>
              </td>
            </tr>
          )) : (
            <tr>
              <td colSpan={3} className="px-4 py-2 text-center text-gray-600">No data</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}


function AddAdvanceForm({ projectId, onSaved }: { projectId: number; onSaved: () => void }) {
  const { data: banks } = useSWR('/api/banks', fetcher);
  const [bankId, setBankId] = useState<number | ''>('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('EGP');

  const banksForCurrency = Array.isArray(banks) ? banks.filter((b:any)=>b.currency===currency) : [];
  // Reset bank when currency changes
  useEffect(()=>{
    if(bankId && !banksForCurrency.find((b:any)=>b.id===bankId)) {
      setBankId('');
    }
  }, [currency]);
  const [loading, setLoading] = useState(false);
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  const headers = token ? { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` } : { 'Content-Type': 'application/json' };

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        if (!amount) return;
        setLoading(true);
        try {
          const res = await fetch('/api/advance-payments', {
            method: 'POST',
            headers,
            body: JSON.stringify({ projectId, amount: Number(amount), currency, bankId: bankId || null, accountType: 'TRUST' }),
          });
          if (res.ok) {
            setAmount('');
            onSaved();
          } else {
            const err = await res.json().catch(() => ({}));
            alert(err.error || 'Save failed');
          }
        } finally {
          setLoading(false);
        }
      }}
      className="flex gap-2 items-center"
    >
      <input
        type="number"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        placeholder="Amount"
        className="border px-2 py-1 w-32"
      />
      <select value={bankId} onChange={(e)=>setBankId(e.target.value?Number(e.target.value):'')} className="border px-2 py-1">
        <option value="">{banksForCurrency.length===0 ? 'No bank for currency' : 'Select Bank'}</option>
        {banksForCurrency.map((b:any)=>(
          <option key={b.id} value={b.id}>{b.name}</option>
        ))}
      </select>
      <select value={currency} onChange={(e) => setCurrency(e.target.value)} className="border px-2 py-1 mr-2">
        {['EGP','USD','EUR','SAR','GBP'].map((c) => (
          <option key={c}>{c}</option>
        ))}
      </select>
      <button type="submit" disabled={loading || !amount || !bankId || banksForCurrency.length===0} className="bg-green-600 text-white px-3 py-1 rounded">
        {loading ? 'Saving...' : 'Add'}
      </button>
    </form>
  );
}

function AdvancesList({ projectId }: { projectId: number }) {
  const { data, isLoading, error } = useSWR(`/api/advance-payments?projectId=${projectId}`, fetcher);
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  const headers = token ? { Authorization: `Bearer ${token}` } : {};

  if (isLoading) return <p>Loading advances...</p>;
  if (error) return <p className="text-red-600">Failed to load advances</p>;

  const items = Array.isArray(data) ? data : [];
  if (items.length === 0) return <p className="text-sm text-gray-600 mt-2">No advances yet.</p>;

  return (
    <table className="mt-4 text-sm border min-w-full">
      <thead className="bg-gray-100">
        <tr>
          <th className="border px-3 py-1 text-right">Amount</th>
          <th className="border px-3 py-1">Date</th>
          <th className="border px-3 py-1">Actions</th>
        </tr>
      </thead>
      <tbody>
        {items.map((ap: any) => (
          <tr key={ap.id} className="hover:bg-gray-50">
            <td className="border px-3 py-1 text-right">{Number(ap.amount).toFixed(2)} {ap.currency}</td>
            <td className="border px-3 py-1">{new Date(ap.paidOn ?? ap.createdAt).toLocaleDateString()}</td>
            <td className="border px-3 py-1">
              <button
                className="text-red-600 hover:underline"
                onClick={async () => {
                  if (!confirm('Delete advance payment?')) return;
                  const res = await fetch(`/api/advance-payments/${ap.id}`, { method: 'DELETE', headers });
                  if (res.ok) {
                    mutate(`/api/advance-payments?projectId=${projectId}`);
                    mutate(key => typeof key === 'string' && key.startsWith('/api/trust-accounts') ? undefined : null, { revalidate: true });
                  } else {
                    const err = await res.json().catch(()=>({}));
                    alert(err.error || 'Delete failed');
                  }
                }}
              >Delete</button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function TransactionsList({ accountId }: { accountId: number | null }) {
  const { data, isLoading, error } = useSWR(accountId ? `/api/trust-transactions?accountId=${accountId}` : null, fetcher);
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  if (!accountId) return null;
  if (isLoading) return <p>Loading transactions...</p>;
  if (error) return <p className="text-red-600">Failed to load transactions</p>;
  const items = Array.isArray(data) ? data : [];
  return (
    <div className="mt-4">
      <h3 className="font-medium mb-2">Transactions</h3>
      {items.length === 0 ? (
        <p className="text-sm text-gray-600">No transactions.</p>
      ) : (
        <table className="text-sm border min-w-full">
          <thead className="bg-gray-100">
            <tr>
              <th className="border px-2 py-1">Type</th>
              <th className="border px-2 py-1">Description</th>
              <th className="border px-2 py-1 text-right">Amount</th>
              <th className="border px-2 py-1">Receipt</th>
              <th className="border px-2 py-1">Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map((t: any) => (
              <tr key={t.id} className="hover:bg-gray-50">
                <td className="border px-2 py-1">{t.txnType}</td>
                <td className="border px-2 py-1">{t.description || '—'}</td>
                <td className={`border px-2 py-1 text-right ${t.txnType==='DEBIT' ? 'text-red-600':''}`}>{Number(t.amount).toFixed(2)}</td>
                <td className="border px-2 py-1">{t.receiptUrl ? <a href={t.receiptUrl} target="_blank" rel="noopener" className="text-blue-600 underline">View</a> : '—'}</td>
                <td className="border px-2 py-1">
                  <button
                    className="text-red-600 hover:underline"
                    onClick={async () => {
                      if (!confirm('Delete transaction?')) return;
                      const res = await fetch(`/api/trust-transactions/${t.id}`, { method: 'DELETE', headers });
                      if (res.ok) {
                        mutate(`/api/trust-transactions?accountId=${accountId}`);
                        mutate(key => typeof key === 'string' && key.startsWith('/api/trust-accounts') ? undefined : null, { revalidate: true });
                      } else {
                        const err = await res.json().catch(()=>({}));
                        alert(err.error || 'Delete failed');
                      }
                    }}
                  >Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default function ProjectTrustPage() {
  const [selectedClient, setSelectedClient] = useState<number | null>(null);
  const [selectedProject, setSelectedProject] = useState<number | null>(null);
  const [selectedAccount, setSelectedAccount] = useState<number | null>(null);

  const { data: clients } = useSWR('/api/clients', fetcher);
  const projEndpoint = selectedClient !== null ? `/api/projects?clientId=${selectedClient}` : '/api/projects';
  const { data: projects } = useSWR(projEndpoint, fetcher);
    return (
    <div className="p-8 space-y-6">
      <h1 className="text-2xl font-bold">Project Trust Cash</h1>

      {/* Client & Project filters */}
      <div>
        <label className="mr-2 font-medium">Client:</label>
        <select
          className="border px-2 py-1"
          value={selectedClient ?? ''}
          onChange={(e) => {
            const val = e.target.value;
            setSelectedClient(val ? Number(val) : null);
          }}
        >
          <option value="">All</option>
          {Array.isArray(clients) && clients.map((c: any) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>

        <label className="mx-4 font-medium">Project:</label>
        <select
          className="border px-2 py-1"
          value={selectedProject ?? ''}
          onChange={(e) => {
            const val = e.target.value;
            setSelectedProject(val ? Number(val) : null);
          }}
        >
          <option value="">All</option>
          {Array.isArray(projects) && projects.map((p: any) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </div>

      {/* Add Advance form */}
      {selectedProject !== null && (
        <div className="mt-6 border p-4 rounded bg-gray-50 max-w-md">
          <h2 className="font-semibold mb-2">Add Trust Advance</h2>
          <AddAdvanceForm projectId={selectedProject} onSaved={() => {
            mutate(`/api/advance-payments?projectId=${selectedProject}`);
            mutate(key => typeof key === 'string' && key.startsWith('/api/trust-accounts') ? undefined : null, { revalidate: true });
          }} />
          <AdvancesList projectId={selectedProject} />
        </div>
      )}

      <Table clientId={selectedClient} projectId={selectedProject} onSelect={(id)=>setSelectedAccount(id)} />
      <ClientSummary clientId={selectedClient} projectId={selectedProject} />
      <TransactionsList accountId={selectedAccount} />
    </div>
  );
}
