"use client";
import useSWR from 'swr';

const fetcher=(u:string)=>fetch(u).then(r=>r.json());

export default function TrustTransfers(){
  const { data, error, isLoading } = useSWR('/api/trust-transfer', fetcher);
  if(isLoading) return <div>Loading...</div>;
  if(error) return <div className='text-red-500'>Failed</div>;
  return(
    <div className='p-6'>
      <h1 className='text-2xl font-bold mb-4'>Trust Transfers</h1>
      <table className='min-w-full border'>
        <thead><tr className='bg-gray-100'><th className='px-2 py-1 border'>Client</th><th className='px-2 py-1 border'>Project</th><th className='px-2 py-1 border'>Amount</th><th className='px-2 py-1 border'>Date</th></tr></thead>
        <tbody>
          {(Array.isArray(data)?data:[]).map((t:any)=>(<tr key={t.id} className='border-b'><td className='px-2 py-1 border'>{t.trustAccount?.client?.name}</td><td className='px-2 py-1 border'>{t.trustAccount?.project?.name||'-'}</td><td className='px-2 py-1 border'>{t.amount} {t.currency}</td><td className='px-2 py-1 border'>{new Date(t.txnDate).toLocaleDateString()}</td></tr>))}
        </tbody>
      </table>
    </div>
  );
}
