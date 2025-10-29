"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast, Toaster } from "react-hot-toast";
import Link from "next/link";
import { getAuth } from "@/lib/auth";
import { fetchAuth } from "@/lib/fetchAuth";

interface Client {
  id: number;
  name: string;
}

interface Project {
  id: number;
  code: string;
  name: string;
  status: string;
  advanceAmount: number | null;
  advanceCurrency: string | null;
  advanceTotals?: { currency: string; total: number }[];
  client: Client;
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [tempName, setTempName] = useState("");
  const [tempStatus, setTempStatus] = useState("OPEN");
  const [tempAmount, setTempAmount] = useState("");
  const [tempCurrency, setTempCurrency] = useState("USD");
  const [error, setError] = useState<string | null>(null);

  const router = useRouter();

  /* -------- helpers -------- */
  const fetchProjects = async () => {
    try {
      const res = await fetchAuth("/api/projects");
      if (!res.ok) throw new Error("Failed to fetch");
      setProjects(await res.json());
    } catch {
      setError("Failed to load projects");
    } finally {
      setLoading(false);
    }
  };
  /* … startEdit / saveEdit / delete handlers كما كانت … */

  useEffect(() => { fetchProjects(); }, []);

  return (
    <div className="container mx-auto p-6">
      <Toaster />

      {/* header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">Projects</h1>
          <p className="text-sm text-gray-600">Manage your projects</p>
        </div>
        <button
          onClick={() => router.push("/projects/new")}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          New Project
        </button>
      </div>

      {/* states */}
      {loading && <p>Loading…</p>}
      {error && <p className="text-red-600">{error}</p>}

      {/* table */}
      {!loading && !error && (
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Client</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Code</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Project Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Advance Payment</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase" />
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {projects.map((p) => (
                  <tr key={p.id}>
                    <td className="px-6 py-4">{p.client.name}</td>
                    <td className="px-6 py-4 font-mono text-sm">{p.code}</td>
                    <td className="px-6 py-4">
                      {editingId === p.id ? (
                        <input value={tempName} onChange={(e)=>setTempName(e.target.value)} className="border rounded px-2 py-1 text-sm w-full" />
                      ) : (
                        <Link href={`/projects/${p.id}`} className="text-blue-600 hover:underline">{p.name}</Link>
                      )}
                    </td>
                    {/* status cell */}
                    {/* advance payment cell */}
                    {/* actions cell كما كانت (Edit / Delete) */}
                  </tr>
                ))}
              </tbody>
            </table>
            {projects.length === 0 && <p className="text-center py-6 text-sm">No projects found.</p>}
          </div>
        </div>
      )}

      <p className="mt-6 text-sm text-gray-600">
        <Link href="/dashboard" className="text-blue-600 underline">← Back to Dashboard</Link>
      </p>
    </div>
  );
}