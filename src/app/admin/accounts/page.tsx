'use client';
import React from 'react';

export default function AccountsPage() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Chart of Accounts</h1>
      <p>No accounts configured yet.</p>
    </div>
  );
}

import React from 'react';

export default function AccountsPage() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Chart of Accounts</h1>
      <p>No accounts configured yet.</p>
    </div>
  );
}
  const [role,setRole]=useState<string|null>(null);
  useEffect(()=>{
    if(token){ try{ setRole(JSON.parse(atob(token.split('.')[1])).role||null);}catch{} }
  },[token]);
  const assistant = role==='ACCOUNTANT_ASSISTANT';

  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [type, setType] = useState('ASSET');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Account | null>(null);
  const [dialogType, setDialogType] = useState<'SALARY'|'OFFICE_EXPENSE'|'GENERAL_EXPENSE'|null>(null);
  const [showLedger, setShowLedger] = useState(false);
  const [accountOpts, setAccountOpts] = useState<{id:number;code:string;name:string}[]>([]);

  const openDialog = async (type: 'SALARY'|'OFFICE_EXPENSE'|'GENERAL_EXPENSE') => {
    setDialogType(type);
    // fetch expense accounts
    const res = await fetch('/api/accounts', { headers:{ Authorization:`Bearer ${token}` }});
    if(res.ok){
      const all = await res.json();
      const opts = all.filter((a: any)=> a.type==='EXPENSE');
      setAccountOpts(opts);
    }
  };

    const fetchAccounts = async () => {
    if (!token) return;
    const res = await fetch('/api/accounts?withBalances=1', {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) setAccounts(await res.json());
  };

  useEffect(() => {
    fetchAccounts();
  }, [token]);

  const handleDeleteAccount = async (id: number) => {
    if (!token) return;
    if (!confirm('Delete this account?')) return;
    try {
      const res = await fetch(`/api/accounts/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Delete failed');
      setAccounts((prev) => prev.filter((a) => a.id !== id));
    } catch (err) {
      console.error(err);
      alert('Deletion failed');
    }
  };

  const addAccount = async () => {
    if (!token) return;
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/accounts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ code, name, type }),
      });
      if (!res.ok) throw new Error('Create failed');
      setCode('');
      setName('');
      setType('ASSET');
      fetchAccounts();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  if(assistant){
    return (
      <div className="container mx-auto max-w-4xl p-8">
        <h1 className="mb-6 text-3xl font-bold">Office Expenses</h1>
        <button onClick={()=>openDialog('OFFICE_EXPENSE')} className="rounded bg-yellow-600 px-4 py-2 text-white hover:bg-yellow-700 text-sm">Record Office Expense</button>
        {dialogType && (
          <QuickTxnDialog open={true} defaultType={dialogType} defaultAccountOptions={accountOpts} onClose={()=>setDialogType(null)} onSuccess={fetchAccounts} />
        )}
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-5xl p-8">
      <h1 className="mb-6 text-3xl font-bold">Chart of Accounts</h1>

      {/* Quick Actions */}
      <div className="mb-6 flex flex-wrap gap-4">
        <button onClick={()=>openDialog('SALARY')} className="rounded bg-green-600 px-4 py-2 text-white hover:bg-green-700 text-sm">Record Salaries</button>
        <button onClick={()=>openDialog('OFFICE_EXPENSE')} className="rounded bg-yellow-600 px-4 py-2 text-white hover:bg-yellow-700 text-sm">Record Office Expense</button>
        <button onClick={()=>openDialog('GENERAL_EXPENSE')} className="rounded bg-purple-600 px-4 py-2 text-white hover:bg-purple-700 text-sm">Record General Expense</button>
        <button onClick={()=>setShowLedger(true)} className="rounded bg-gray-700 px-4 py-2 text-white hover:bg-gray-800 text-sm">Cash Ledger</button>
        <Link href="/admin/invoices" className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 text-sm">Invoices</Link>
        <Link href="/admin/payments" className="rounded bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700 text-sm">Payments</Link>
        <Link href="/admin/trust-transfers" className="rounded bg-teal-600 px-4 py-2 text-white hover:bg-teal-700 text-sm">Trust Transfers</Link>
              </div>

      {/* Add form (متقدم) */}
      <form
        className="mb-8 flex flex-wrap gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          addAccount();
        }}
      >
        <input
          required
          placeholder="Code"
          className="rounded border px-2 py-1"
          value={code}
          onChange={(e) => setCode(e.target.value)}
        />
        <input
          required
          placeholder="Name"
          className="flex-1 rounded border px-2 py-1"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <select
          className="rounded border px-2 py-1"
          value={type}
          onChange={(e) => setType(e.target.value)}
        >
          {ACCOUNT_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <button
          type="submit"
          disabled={loading}
          className="rounded bg-blue-600 px-4 py-1 font-semibold text-white hover:bg-blue-700"
        >
          {loading ? 'Saving…' : 'Add'}
        </button>
        {error && <span className="text-red-600">{error}</span>}
      </form>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-gray-100">
              <th className="border px-3 py-2 text-left">Code</th>
              <th className="border px-3 py-2 text-left">Name</th>
              <th className="border px-3 py-2 text-left">Type</th>
              <th className="border px-3 py-2 text-right">Balance</th>
              <th className="border px-3 py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {accounts.map((a) => {
              const balStr = (a.balances && a.balances.length)
                ? a.balances.map(b => `${b.currency} ${b.balance.toFixed(2)}`).join(', ')
                : '-';
              const neg = a.balances?.some(b=>b.balance<0);
              return (
                <tr
                  key={a.id}
                  className="cursor-pointer odd:bg-white even:bg-gray-50 hover:bg-blue-50"
                  onClick={() => setSelected(a as any)}
                >
                  <td className="border px-3 py-2 whitespace-nowrap">{a.code}</td>
                  <td className="border px-3 py-2">{a.name}</td>
                  <td className="border px-3 py-2">{a.type}</td>
                  <td className={`border px-3 py-2 text-right font-mono ${neg ? 'text-red-600' : ''}`}>{balStr}</td>
                  <td className="border px-3 py-2 text-right">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteAccount(a.id);
                      }}
                      className="text-red-600 hover:text-red-900 text-xs"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        </div>
      {dialogType && (
        <QuickTxnDialog open={true} defaultType={dialogType} defaultAccountOptions={accountOpts} onClose={()=>setDialogType(null)} onSuccess={fetchAccounts} />
      )}
      {showLedger && <CashLedgerDialog open={showLedger} onClose={()=>setShowLedger(false)} />}
          </div>
  );
}
