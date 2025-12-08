"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { getAuth } from "@/lib/auth";

export default function AdminReportsPage() {
  const baseTiles = [
    {
      href: "/admin/reports/costs",
      title: "Cost Report",
      description: "View costs (hours, rates, expenses) per project/lawyer.",
      key: "costs"
    },
    {
      href: "/admin/reports/profit-loss",
      title: "Profit & Loss",
      description: "See advance payments, costs, and profit per project/client.",
      key: "profit"
    },
    {
      href: "/admin/reports/bank-accounts",
      title: "Bank Accounts Report",
      description: "View bank account transactions and balances.",
      key: "bank-accounts"
    },
    {
      href: "/admin/reports/salaries",
      title: "Salary Report",
      description: "View all office salaries by employee and period.",
      key: "salaries"
    },
    {
      href: "/admin/reports/office-expenses",
      title: "Office Expenses",
      description: "All office expense transactions and totals.",
      key: "office"
    },
    {
      href: "/admin/reports/lawyers",
      title: "Lawyers Performance",
      description: "Weekly hours, utilisation and rating per lawyer.",
      key: "lawyers"
    }
  ];

  const [role, setRole] = useState<string | null>(null);
  useEffect(() => {
    const token = getAuth();
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        setRole(payload.role || null);
      } catch {}
    }
  }, []);

  const tiles = React.useMemo(()=>{
    if(role==='LAWYER_MANAGER'){
      return baseTiles.filter(t=>t.key!=='profit');
    }
    return baseTiles;
  },[role]);

  return (
    <div className="container mx-auto max-w-4xl p-8">
      <h1 className="mb-8 text-3xl font-bold">Reports</h1>
      <div className="grid gap-6 sm:grid-cols-2">
        {tiles.map((tile) => (
          <Link
            key={tile.href}
            href={tile.href}
            className="rounded-lg border border-gray-300 p-6 shadow-sm transition-transform hover:-translate-y-1 hover:shadow-md"
          >
            <h2 className="mb-2 text-xl font-semibold text-blue-600">{tile.title}</h2>
            <p className="text-sm text-gray-600">{tile.description}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
