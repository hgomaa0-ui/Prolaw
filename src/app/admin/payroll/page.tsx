"use client";
import { useEffect, useState } from "react";
import { getAuth } from "@/lib/auth";



interface Batch {
  id: number;
  month: number;
  year: number;
  status: string;
  items: { id: number; netSalary: number; employee: { name: string } }[];
}

export default function PayrollPage() {

  const [batches, setBatches] = useState<Batch[]>([]);
  const [role,setRole]=useState<string|null>(null);
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [loading, setLoading] = useState(false);

  const token = getAuth();

  const fetchBatches = async (role:string|null) => {
    const res = await fetch('/api/payroll/batches',{
      headers: token? { Authorization: `Bearer ${token}` } : undefined
    });
    if(res.ok){
      const data:Batch[] = await res.json();
      // filter according to role
      let filtered=data;
      if(!role?.startsWith('ACCOUNTANT')) {
        // غير المحاسبين يرون فقط المسودات
        filtered = data.filter(b=>b.status==='DRAFT');
      }
      setBatches(filtered);
    }
  };

  useEffect(()=>{
    // detect role
    try{ if(token){ setRole(JSON.parse(atob(token.split('.')[1])).role); }}catch{}
  },[]);

  useEffect(() => {
    if(role!==null) fetchBatches(role);
  }, [role]);

  const createBatch = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/payroll/batches',{
        method:'POST',
        headers:{'Content-Type':'application/json', ...(token?{Authorization:`Bearer ${token}`}:{})},
        body:JSON.stringify({year,month})
      });
      if(!res.ok){
        const j=await res.json().catch(()=>({error:'Error'}));
        alert(j.error||'Create failed');
      }
      await fetchBatches(role);
    } finally {
      setLoading(false);
    }
  };

  const hrApprove = async (id: number) => {
    await fetch(`/api/payroll/batches/${id}/hr-approve`,{method:'PUT',headers: token?{Authorization:`Bearer ${token}`}:{} });
    fetchBatches(role);
  };

  const accApprove = async (id: number) => {
    await fetch(`/api/payroll/batches/${id}/acc-approve`,{method:'PUT',headers: token?{Authorization:`Bearer ${token}`}:{} });
    fetchBatches(role);
  };

  const accReverse = async (id: number) => {
    if(!confirm('Undo accountant approval and delete journal?')) return;
    await fetch(`/api/payroll/batches/${id}/acc-reverse`,{method:'DELETE',headers: token?{Authorization:`Bearer ${token}`}:{} });
    fetchBatches(role);
  };

  const deleteDraft = async (id: number) => {
    if (!confirm('Delete this draft payroll batch?')) return;
    try {
      const res = await fetch(`/api/payroll/batches?id=${id}`, {
        method: 'DELETE',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) {
        const text = await res.text();
        alert(text || 'Failed to delete batch');
        return;
      }
      await fetchBatches(role);
    } catch (e) {
      console.error(e);
      alert('Failed to delete batch');
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-4">Payroll Batches</h1>
      <div className="flex gap-2 items-end mb-4">
        <div>
          <label className="block text-sm">Year</label>
          <input
            type="number"
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="border px-2 py-1 rounded w-24"
          />
        </div>
        <div>
          <label className="block text-sm">Month</label>
          <input
            type="number"
            min={1}
            max={12}
            value={month}
            onChange={(e) => setMonth(Number(e.target.value))}
            className="border px-2 py-1 rounded w-16"
          />
        </div>
        <button
          className="bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50"
          onClick={createBatch}
          disabled={loading}
        >
          Create Batch
        </button>
      </div>

      <table className="min-w-full border text-sm">
        <thead className="bg-gray-100">
          <tr>
            <th className="border px-2 py-1">#</th>
            <th className="border px-2 py-1">Period</th>
            <th className="border px-2 py-1">Status</th>
            <th className="border px-2 py-1">Employees</th>
            <th className="border px-2 py-1">Net Total</th>
            <th className="border px-2 py-1">Actions</th>
          </tr>
        </thead>
        <tbody>
          {batches.map((b) => {
            const net = b.items.reduce((acc, i) => acc + Number(i.netSalary), 0);
            return (
              <tr key={b.id}>
                <td className="border px-2 py-1">{b.id}</td>
                <td className="border px-2 py-1">{b.month}/{b.year}</td>
                <td className="border px-2 py-1">{b.status}</td>
                <td className="border px-2 py-1">{b.items.length}</td>
                <td className="border px-2 py-1">{net.toFixed(2)}</td>
                <td className="border px-2 py-1 space-x-2">
                  {!role?.startsWith('ACCOUNTANT') && b.status === "DRAFT" && (
                    <>
                      <button className="text-sm bg-green-600 text-white px-2 py-1 rounded" onClick={() => hrApprove(b.id)}>
                        HR Approve
                      </button>
                      <button
                        className="text-sm bg-red-600 text-white px-2 py-1 rounded ml-2"
                        onClick={() => deleteDraft(b.id)}
                      >
                        Reject
                      </button>
                    </>
                  )}
                  {role?.startsWith('ACCOUNTANT') && b.status === "HR_APPROVED" && (
                    <button className="text-sm bg-purple-600 text-white px-2 py-1 rounded" onClick={() => accApprove(b.id)}>
                      Accountant Approve
                    </button>
                  )}
                  {b.status === "ACC_APPROVED" && (
                    <button className="text-sm bg-red-600 text-white px-2 py-1 rounded" onClick={() => accReverse(b.id)}>
                      Undo
                    </button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
