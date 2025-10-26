"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast, Toaster } from "react-hot-toast";
import Link from "next/link";
import ProjectTaskModal from "../../components/ProjectTaskModal";
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
  const [showTaskModal, setShowTaskModal] = useState<number|null>(null);
  const [error, setError] = useState<string | null>(null);

  const router = useRouter();
  


  // ---------- API helpers ----------
  const fetchProjects = async () => {
    try {
      const res = await fetchAuth("/api/projects");
      if (!res.ok) throw new Error("Failed to fetch projects");
      const data = await res.json();
      setProjects(data);
    } catch (err) {
      console.error(err);
      setError("Failed to load projects");
    } finally {
      setLoading(false);
    }
  };

  const startEdit = (proj: Project) => {
  setEditingId(proj.id);
  setTempName(proj.name);
  setTempStatus(proj.status);
  setTempAmount(proj.advanceAmount !== null ? String(proj.advanceAmount) : "");
  setTempCurrency(proj.advanceCurrency ?? "USD");
    setEditingId(proj.id);
    setTempName(proj.name);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setTempName("");
  };

  const saveEdit = async (id: number) => {
    if (!tempName.trim()) return;
    try {
      const res = await fetch(`/api/projects/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getAuth()}`,
        },
        body: JSON.stringify({
        name: tempName.trim(),
        status: tempStatus,
        advanceAmount: tempAmount ? parseFloat(tempAmount) : null,
        advanceCurrency: tempCurrency,
      }),
      });
      if (!res.ok) throw new Error("Failed to update");
      toast.success("Project updated");
      setProjects((prev) =>
        prev.map((p) =>
          p.id === id
            ? {
                ...p,
                name: tempName.trim(),
                status: tempStatus,
                advanceAmount: tempAmount ? parseFloat(tempAmount) : null,
                advanceCurrency: tempCurrency,
              }
            : p
        )
      );
    } catch (err) {
      console.error(err);
      toast.error("Update failed");
    } finally {
      cancelEdit();
    }
  };

  const handleDeleteProject = async (id: number) => {
    if (!confirm("Delete this project?")) return;
    try {
      const res = await fetchAuth(`/api/projects/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        let msg = "Failed to delete";
        try {
          const data = await res.json();
          if (data?.error) msg = data.error;
        } catch {}
        throw new Error(msg);
      }
      toast.success("Project deleted");
      fetchProjects();
    } catch (err) {
      console.error(err);
      toast.error("Deletion failed");
    }
  };
  // ----------------------------------

  useEffect(() => {
    fetchProjects();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="container mx-auto p-6">
      <Toaster />
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">Projects</h1>
          <p className="text-sm text-gray-600">
            Manage your projects and their details
          </p>
        </div>
        <button
          onClick={() => router.push("/projects/new")}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          New Project
        </button>
      </div>

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

      {!loading && !error && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="p-6 overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Client
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Code
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Project Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Advance Payment
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tasks</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider" />
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {projects.map((p) => (
                  <tr key={p.id}>
                    <td className="px-6 py-4 whitespace-nowrap">{p.client.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap font-mono text-sm text-gray-800">{p.code}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-900">
                      {editingId === p.id ? (
                        <input
                          value={tempName}
                          onChange={(e) => setTempName(e.target.value)}
                          className="border rounded px-2 py-1 text-sm w-full"
                        />
                      ) : (
                        <Link href={`/projects/${p.id}`} className="text-blue-600 hover:underline">{p.name}</Link>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {editingId === p.id ? (
                        <select
                          value={tempStatus}
                          onChange={(e) => setTempStatus(e.target.value)}
                          className="border rounded px-2 py-1 text-xs"
                        >
                          <option value="OPEN">OPEN</option>
                          <option value="IN_PROGRESS">IN_PROGRESS</option>
                          <option value="CLOSED">CLOSED</option>
                        </select>
                      ) : (
                        <span
                          className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            p.status === "OPEN"
                              ? "bg-green-100 text-green-800"
                              : p.status === "CLOSED"
                              ? "bg-red-100 text-red-800"
                              : "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {p.status}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {editingId === p.id ? (
                        <div className="flex gap-2 items-center">
                          <input
                            type="number"
                            step="0.01"
                            value={tempAmount}
                            onChange={(e) => setTempAmount(e.target.value)}
                            className="border rounded px-2 py-1 w-24 text-sm"
                          />
                          <select
                            value={tempCurrency}
                            onChange={(e) => setTempCurrency(e.target.value)}
                            className="border rounded px-1 py-1 text-xs"
                          >
                            {["USD","EUR","GBP","SAR","EGP","AED","QAR","KWD","OMR","JPY","CNY","INR"].map((c)=>(
                              <option key={c} value={c}>{c}</option>
                            ))}
                          </select>
                        </div>
                      ) : (
                        p.advanceTotals && p.advanceTotals.length
                          ? p.advanceTotals.map(t => `${t.total} ${t.currency}`).join(', ')
                          : (p.advanceAmount !== null ? `${p.advanceAmount} ${p.advanceCurrency ?? ''}` : '—')
                      )}
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button onClick={()=>setShowTaskModal(p.id)} className="text-indigo-600 hover:underline text-sm">Add Task</button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                      {editingId === p.id ? (
                        <>
                          <button
                            onClick={() => saveEdit(p.id)}
                            className="text-green-600 hover:text-green-800 mr-2"
                          >
                            Save
                          </button>
                          <button
                            onClick={cancelEdit}
                            className="text-gray-600 hover:text-gray-800 mr-4"
                          >
                            Cancel
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => startEdit(p)}
                            className="text-blue-600 hover:text-blue-900 mr-4"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteProject(p.id)}
                            className="text-red-600 hover:text-red-900"
                          >
                            Delete
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {projects.length === 0 && (
              <p className="text-center py-6 text-sm text-gray-600">
                No projects found.
              </p>
            )}
          </div>
        </div>
      )}

      <p className="mt-6 text-sm text-gray-600">
        <Link href="/dashboard" className="text-blue-600 underline">
          ← Back to Dashboard
        </Link>
      </p>
    {showTaskModal && (
      <ProjectTaskModal
        projectId={showTaskModal}
        onClose={()=>setShowTaskModal(null)}
        onSaved={fetchProjects}
      />
    )}
    </div>
  );
}