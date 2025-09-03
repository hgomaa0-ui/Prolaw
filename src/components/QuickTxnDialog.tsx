'use client';
import React, { useState } from 'react';
import { getAuth } from '@/lib/auth';

const CURRENCY_CODES = [
  'USD','EUR','GBP','AED','SAR','EGP','JPY','CNY','INR','CAD','AUD','CHF','SEK','NOK','DKK','KWD','BHD','QAR','OMR','JOD'
];

interface Props {
  open: boolean;
  onClose: () => void;
  defaultType: 'SALARY' | 'OFFICE_EXPENSE' | 'GENERAL_EXPENSE';
  defaultAccountOptions: { id: number; code: string; name: string }[];
  onSuccess?: ()=>void;
}

export default function QuickTxnDialog({ open, onClose, defaultType, defaultAccountOptions, onSuccess }: Props) {
  const token = getAuth();
  const [date, setDate] = useState(new Date().toISOString().substring(0, 10));
  const [accountId, setAccountId] = useState<number>(defaultAccountOptions[0]?.id || 0);

  // update selected expense account when options fetched later
  React.useEffect(() => {
    if (!accountId && defaultAccountOptions.length) {
      setAccountId(defaultAccountOptions[0].id);
    }
  }, [defaultAccountOptions]);
  const [amount, setAmount] = useState('');
  const [payAccountId, setPayAccountId] = useState<number>(0);
  const [assetOpts,setAssetOpts]=useState<{id:number;code:string;name:string}[]>([]);

  // fetch asset accounts once
  React.useEffect(()=>{
    (async()=>{
      if(!token) return;
      const res=await fetch('/api/accounts', {headers:{Authorization:`Bearer ${token}`}});
      if(res.ok){
        const all=await res.json();
        const assets = all.filter((a:any)=> (a.type==='ASSET'||a.type==='TRUST'));
        setAssetOpts(assets);
        const opCash = assets.find((a:any)=>a.code==='1000');
        const bankDefault = assets.find((a:any)=>a.code==='1010');
        const trustCash = assets.find((a:any)=>a.code==='1020');

        let chosen:number|undefined;
        if(['SALARY','OFFICE_EXPENSE','GENERAL_EXPENSE'].includes(defaultType)){
          chosen = opCash?.id ?? bankDefault?.id;
        }else{
          chosen = trustCash?.id;
        }
        setPayAccountId((chosen ?? assets[0]?.id) || 0);
      }
    })();
  },[token]);
  const [currency, setCurrency] = useState('USD');
  const [memo, setMemo] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!token) return;
    if (!accountId || !payAccountId) {
      setError('Choose valid expense and payment accounts');
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const endpoint = ['SALARY','OFFICE_EXPENSE'].includes(defaultType) ? '/api/quick-expense' : '/api/transactions';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(
          endpoint === '/api/quick-expense'
            ? {
                date,
                memo,
                amount: parseFloat(amount),
                currency,
                expenseAccountId: accountId,
                payAccountId,
              }
            : {
                date,
                memo,
                lines: [
                  { accountId, debit: parseFloat(amount), credit: 0, currency },
                  { accountId: payAccountId, debit: 0, credit: parseFloat(amount), currency },
                ],
              }
        ),
      });
      if (!res.ok) {
        let msg = 'Failed to post';
        try {
          const data = await res.json();
          msg = data?.error ? `${data.error}${data.invalid ? ' ('+data.invalid.join(', ')+')' : ''}` : msg;
        } catch {}
        throw new Error(msg);
      }
      onClose();
      onSuccess?.();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded bg-white p-6 shadow-lg">
        <h3 className="mb-4 text-lg font-bold">{defaultType === 'SALARY' ? 'Record Salary' : 'Record Expense'}</h3>
        <div className="mb-3 flex flex-col gap-2">
          <label className="text-sm font-semibold">Date</label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="rounded border px-2 py-1" />
        </div>
        <div className="mb-3 flex flex-col gap-2">
          <label className="text-sm font-semibold">Expense Account</label>
          <select value={accountId} onChange={(e) => setAccountId(parseInt(e.target.value))} className="rounded border px-2 py-1">
            {defaultAccountOptions.map((a) => (
              <option key={a.id} value={a.id}>
                {a.code} – {a.name}
              </option>
            ))}
          </select>
        </div>
        <div className="mb-3 flex flex-col gap-2">
          <label className="text-sm font-semibold">Amount</label>
          <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} className="rounded border px-2 py-1" />
        </div>
        <div className="mb-3 flex flex-col gap-2">
          <label className="text-sm font-semibold">Payment Account (Cash/Trust)</label>
          <select value={payAccountId} onChange={(e)=>setPayAccountId(parseInt(e.target.value))} className="rounded border px-2 py-1">
            {assetOpts.map(a=>(
              <option key={a.id} value={a.id}>{a.code} – {a.name}</option>
            ))}
          </select>
        </div>
        <div className="mb-3 flex flex-col gap-2">
          <label className="text-sm font-semibold">Currency</label>
          <select value={currency} onChange={(e)=>setCurrency(e.target.value)} className="rounded border px-2 py-1">
            {CURRENCY_CODES.map(c=>(
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
        <div className="mb-3 flex flex-col gap-2">
          <label className="text-sm font-semibold">Memo</label>
          <input value={memo} onChange={(e) => setMemo(e.target.value)} className="rounded border px-2 py-1" />
        </div>
        {error && <p className="mb-2 text-red-600 text-sm">{error}</p>}
        <div className="mt-4 flex justify-end gap-3">
          <button onClick={onClose} className="rounded bg-gray-200 px-4 py-1 text-sm hover:bg-gray-300">
            Cancel
          </button>
          <button onClick={submit} disabled={loading} className="rounded bg-blue-600 px-4 py-1 text-sm text-white hover:bg-blue-700">
            {loading ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}
