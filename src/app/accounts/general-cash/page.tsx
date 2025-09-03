'use client';

import Link from 'next/link';

export default function CashLedgersPage() {
  return (
    <div className="p-8 space-y-6">
      <h1 className="mb-6 text-2xl font-bold">Cash Ledgers</h1>

      <div className="flex flex-wrap gap-4">
      <Link
        href="/accounts/project-trust"
        className="block rounded-lg border border-gray-300 p-4 shadow-sm transition-transform hover:-translate-y-1 hover:shadow-md"
      >
        <h2 className="text-lg font-semibold text-blue-600">Project Trust Cash</h2>
        <p className="text-sm text-gray-600">View trust funds held for projects.</p>
      </Link>

      <Link
        href="/accounts/income-cash"
        className="block rounded-lg border border-gray-300 p-4 shadow-sm transition-transform hover:-translate-y-1 hover:shadow-md"
      >
        <h2 className="text-lg font-semibold text-blue-600">Income Cash Ledger</h2>
        <p className="text-sm text-gray-600">View cash movements for office income.</p>
      </Link>
    </div>
    </div>
  );
}
