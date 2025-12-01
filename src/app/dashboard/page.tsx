'use client';

import { useEffect, useState } from 'react';
import { fetchAuth } from '@/lib/fetchAuth';
import { Toaster } from 'react-hot-toast';

interface Company {
  name: string;
  address?: string;
  email?: string;
  phone?: string;
}

export default function DashboardHome() {
  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCompany = async () => {
      try {
        const res = await fetchAuth("/api/company");
        if (res.status === 404) {
          setCompany(null);
          return;
        }
        if (!res.ok) throw new Error("Failed to load company");
        const data = await res.json();
        setCompany(data);
      } catch (err: any) {
        console.error(err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchCompany();
  }, []);

  return (
    <main
      className="min-h-screen flex items-start justify-center pt-20 pb-12 px-4 sm:px-6 lg:px-8 bg-cover bg-top bg-no-repeat bg-gray-900/80"
      style={{ backgroundImage: "url('/prolaw-bg.jpg')" }}
    >
      <div className="w-full max-w-4xl bg-white/95 backdrop-blur-sm rounded-lg p-6 shadow-lg">
        <Toaster position="top-right" />
        <h1 className="mb-4 text-3xl font-bold">Welcome to Your Dashboard</h1>
        <p className="mb-8 text-gray-700">
          Manage your legal practice from here. Use the navigation bar to access clients, projects,
          time entries, and invoices.
        </p>

        {loading && (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
          </div>
        )}

        {error && (
          <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-4">
            <h3 className="font-medium text-red-800">Error</h3>
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {!loading && !error && company && (
          <section className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Company Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="font-medium text-gray-600">Name</p>
                <p className="text-gray-900">{company.name}</p>
              </div>
              {company.email && (
                <div>
                  <p className="font-medium text-gray-600">Email</p>
                  <p className="text-gray-900">{company.email}</p>
                </div>
              )}
              {company.phone && (
                <div>
                  <p className="font-medium text-gray-600">Phone</p>
                  <p className="text-gray-900">{company.phone}</p>
                </div>
              )}
              {company.address && (
                <div className="md:col-span-2">
                  <p className="font-medium text-gray-600">Address</p>
                  <p className="text-gray-900">{company.address}</p>
                </div>
              )}
            </div>
          </section>
        )}

        {!loading && !error && !company && (
          <p className="text-sm text-gray-600">No company data available yet.</p>
        )}
      </div>
    </main>
  );
}