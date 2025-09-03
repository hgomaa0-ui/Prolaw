"use client";
import useSWR from 'swr';
import Link from 'next/link';

const fetcher = (url: string) => fetch(url, { headers: { 'cache-control': 'no-store' } }).then(res => res.json());

export default function InvoicesPage() {
  const { data, error, isLoading } = useSWR('/api/invoices', fetcher);

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div className="text-red-500">Failed: {error.message}</div>;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Invoices</h1>
      <table className="min-w-full border">
        <thead>
          <tr className="bg-gray-100">
            <th className="px-2 py-1 border">#</th>
            <th className="px-2 py-1 border">Client</th>
            <th className="px-2 py-1 border">Project</th>
            <th className="px-2 py-1 border">Total</th>
            <th className="px-2 py-1 border">Status</th>
            <th className="px-2 py-1 border">Actions</th>
          </tr>
        </thead>
        <tbody>
          {(Array.isArray(data) ? data : []).map((inv: any) => (
            <tr key={inv.id} className="border-b hover:bg-gray-50">
              <td className="px-2 py-1 border">{inv.invoiceNumber}</td>
              <td className="px-2 py-1 border">{inv.client?.name}</td>
              <td className="px-2 py-1 border">{inv.project?.name || '-'}</td>
              <td className="px-2 py-1 border">{inv.total} {inv.currency}</td>
              <td className="px-2 py-1 border">{inv.status}</td>
              <td className="px-2 py-1 border">
                <Link className="text-blue-600" href={`/admin/invoices/${inv.id}`}>View</Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
