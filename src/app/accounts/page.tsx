'use client';

import Link from 'next/link';

export default function AccountsHome() {
  const tiles = [
    {
      href: '/accounts/banks',
      title: 'Banks',
      description: 'Manage bank accounts and balances.'
    },
    {
      href: '/accounts/salaries',
      title: 'Salaries',
      description: 'Approve processed salary batches and pay from banks.'
    },
    {
      href: '/accounts/general-cash',
      title: 'General Cash Ledger',
      description: 'View all cash inflows and outflows for the office and projects.'
    },
    {
      href: '/admin/settings',
      title: 'Exchange Rate',
      description: 'Set default USD↔EGP exchange rate.'
    },
    {
      href: '/admin/expenses/pending',
      title: 'Pending Expenses',
      description: 'Approve submitted expenses.'
    },
    {
      href: '/accountant/time/pending',
      title: 'Pending Time (Accountant)',
      description: 'Final approval for time entries.'
    },
    {
      href: '/accounts/office-expenses',
      title: 'Office Expenses',
      description: 'Record and view office operating expenses deducted from banks.'
    }
  ];

  return (
    <div className="container mx-auto max-w-4xl p-8">
      <h1 className="mb-8 text-3xl font-bold">Accounts</h1>
      <div className="grid gap-6 grid-cols-1">
        {tiles.map(tile => (
          <Link key={tile.href} href={tile.href} className="rounded-lg border border-gray-300 p-6 shadow-sm transition-transform hover:-translate-y-1 hover:shadow-md">
            <h2 className="mb-2 text-xl font-semibold text-blue-600">{tile.title}</h2>
            <p className="text-sm text-gray-600">{tile.description}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
