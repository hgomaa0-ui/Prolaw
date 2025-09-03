"use client";
import useSWR from 'swr';

const fetcher = (url:string)=>fetch(url).then(r=>r.json());

export default function PaymentsPage(){
  const { data, error, isLoading } = useSWR('/api/payments?all=1', fetcher);
  if(isLoading) return <div>Loading...</div>;
  if(error) return <div className="text-red-500">Failed to load</div>;
  return(
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Payments</h1>
      <table className="min-w-full border">
        <thead>
          <tr className="bg-gray-100"><th className="px-2 py-1 border">Invoice</th><th className="px-2 py-1 border">Amount</th><th className="px-2 py-1 border">Gateway</th><th className="px-2 py-1 border">Date</th></tr>
        </thead>
        <tbody>
          {(Array.isArray(data)?data:[]).map((p:any)=>(
            <tr key={p.id} className="border-b"><td className="px-2 py-1 border">{p.invoice?.invoiceNumber}</td><td className="px-2 py-1 border">{p.amount}</td><td className="px-2 py-1 border">{p.gateway}</td><td className="px-2 py-1 border">{new Date(p.paidOn).toLocaleDateString()}</td></tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
