"use client";

import { useEffect, useState } from "react";
import { getAuth } from "@/lib/auth";
import toast from "react-hot-toast";

interface Position {
  id: number;
  defaultRate?: number | null;
  currency?: string | null;
}
interface Lawyer {
  id: number;
  name: string;
  position?: Position;
}
interface Client {
  id: number;
  name: string;
}
interface Project {
  id: number;
  name: string;
  client?: Client;
}
interface Assignment {
  id: number;
  user: Lawyer;
  project: Project;
  canLogTime: boolean;
  hourlyRate?: number | null;
  currency?: string | null;
}

export default function AssignmentsPage() {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [lawyers, setLawyers] = useState<Lawyer[]>([]);
  const [groups, setGroups] = useState<{ id: number; name: string }[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);

  // modal state
  const [showModal, setShowModal] = useState(false);
  const [mode, setMode] = useState<"lawyer" | "group">("lawyer");
  const [selectedLawyer, setSelectedLawyer] = useState<number | "">("");
  const [selectedGroup, setSelectedGroup] = useState<number | "">("");
  const [selectedClient, setSelectedClient] = useState<number | "">("");
  const [selectedProject, setSelectedProject] = useState<number | "">("");
  const [canLogTime, setCanLogTime] = useState(true);
  const [hourlyRate, setHourlyRate] = useState<string>("");
  const [currency, setCurrency] = useState<string>("");
  const currencies = ["USD", "SAR", "EUR", "EGP"];

  // auto-fill rate when lawyer changes
  useEffect(() => {
    if (selectedLawyer && typeof selectedLawyer === "number") {
      const l = lawyers.find((x) => x.id === selectedLawyer);
      if (l?.position) {
        setHourlyRate(l.position.defaultRate?.toString() || "");
        setCurrency(l.position.currency || "");
      }
    } else {
      setHourlyRate("");
      setCurrency("");
    }
  }, [selectedLawyer, lawyers]);

  useEffect(() => {
    fetchAll();
  }, []);

  async function fetchAll() {
    const token = getAuth();
    const headers = token ? { Authorization: `Bearer ${token}` } : undefined;
    const [aRes, lRes, pRes, gRes] = await Promise.all([
      fetch("/api/assignments", { headers }),
      fetch("/api/lawyers", { headers }),
      fetch("/api/projects", { headers }),
      fetch("/api/groups", { headers }),
    ]);
    const aData = await aRes.json();
    const lData = await lRes.json();
    const pData = await pRes.json();
    const gData = await gRes.json();
    setAssignments(Array.isArray(aData) ? aData : []);
    setLawyers(Array.isArray(lData) ? lData : []);
    setProjects(Array.isArray(pData) ? pData : []);
    setGroups(Array.isArray(gData) ? gData : []);
  }

  async function addAssignment() {
    if (!selectedClient || !selectedProject)
      return toast.error("Select project");
    if (mode === "lawyer" && !selectedLawyer)
      return toast.error("Select lawyer");
    if (mode === "group" && !selectedGroup) return toast.error("Select group");

    const res = await fetch("/api/assignments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        projectId: selectedProject,
        canLogTime,
        hourlyRate: hourlyRate ? Number(hourlyRate) : undefined,
        currency: currency || undefined,
        ...(mode === "lawyer"
          ? { userId: selectedLawyer }
          : { groupId: selectedGroup }),
      }),
    });

    if (res.ok) {
      toast.success("Assigned");
      setShowModal(false);
      setSelectedLawyer("");
      setSelectedGroup("");
      setSelectedProject("");
      fetchAll();
    } else {
      const err = await res.json();
      toast.error(err.error || "Failed");
    }
  }

  async function toggleCanLog(a: Assignment) {
    const res = await fetch(`/api/assignments/${a.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ canLogTime: !a.canLogTime }),
    });
    if (res.ok) fetchAll();
  }

  async function deleteAssignment(id: number) {
    if (!confirm("Remove this assignment?")) return;
    const res = await fetch(`/api/assignments/${id}`, { method: "DELETE" });
    if (res.ok) fetchAll();
  }

  /* ---------- JSX ---------- */
  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Project Assignments</h1>
      <button
        onClick={() => setShowModal(true)}
        className="mb-4 bg-blue-600 text-white px-4 py-2 rounded"
      >
        Assign
      </button>

      {/* table */}
      <table className="w-full bg-white shadow rounded">
        <thead className="bg-gray-100 text-left">
          <tr>
            <th className="px-4 py-2">Lawyer / Group</th>
            <th className="px-4 py-2">Client</th>
            <th className="px-4 py-2">Project</th>
            <th className="px-4 py-2">Rate</th>
            <th className="px-4 py-2">Curr.</th>
            <th className="px-4 py-2">Can Log Time</th>
            <th className="px-4 py-2">Actions</th>
          </tr>
        </thead>
        <tbody>
          {assignments.map((a) => (
            <tr key={a.id} className="border-t">
              <td className="px-4 py-2">{a.user.name}</td>
              <td className="px-4 py-2">{a.project.client?.name ?? "-"}</td>
              <td className="px-4 py-2">{a.project.name}</td>
              <td className="px-4 py-2">{a.hourlyRate ?? "-"}</td>
              <td className="px-4 py-2">{a.currency ?? "-"}</td>
              <td className="px-4 py-2">
                <input
                  type="checkbox"
                  checked={a.canLogTime}
                  onChange={() => toggleCanLog(a)}
                />
              </td>
              <td className="px-4 py-2">
                <button
                  onClick={() => deleteAssignment(a.id)}
                  className="text-red-600 text-sm"
                >
                  Remove
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* modal */}
      {showModal && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
          onClick={() => setShowModal(false)}
        >
          <div
            className="bg-white w-full max-w-md p-6 rounded shadow"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-xl font-semibold mb-4">Assign Project</h2>

            {/* mode switch */}
            <div className="flex gap-2 mb-4">
              <button
                type="button"
                onClick={() => setMode("lawyer")}
                className={`px-3 py-1 rounded border ${
                  mode === "lawyer"
                    ? "bg-blue-600 text-white"
                    : "bg-white text-black"
                }`}
              >
                Lawyer
              </button>
              <button
                type="button"
                onClick={() => setMode("group")}
                className={`px-3 py-1 rounded border ${
                  mode === "group"
                    ? "bg-blue-600 text-white"
                    : "bg-white text-black"
                }`}
              >
                Group
              </button>
            </div>

            {/* form */}
            <div className="space-y-3">
              {mode === "lawyer" && (
                <div>
                  <label className="block text-sm">Lawyer</label>
                  <select
                    className="border px-2 py-1 rounded w-full"
                    value={selectedLawyer}
                    onChange={(e) =>
                      setSelectedLawyer(
                        e.target.value ? Number(e.target.value) : ""
                      )
                    }
                  >
                    <option value="">Select</option>
                    {lawyers.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {mode === "group" && (
                <div>
                  <label className="block text-sm">Group</label>
                  <select
                    className="border px-2 py-1 rounded w-full"
                    value={selectedGroup}
                    onChange={(e) =>
                      setSelectedGroup(
                        e.target.value ? Number(e.target.value) : ""
                      )
                    }
                  >
                    <option value="">Select</option>
                    {groups.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* client */}
              <div>
                <label className="block text-sm">Client</label>
                <select
                  className="border px-2 py-1 rounded w-full"
                  value={selectedClient}
                  onChange={(e) => {
                    const val = e.target.value ? Number(e.target.value) : "";
                    setSelectedClient(val);
                    setSelectedProject("");
                  }}
                >
                  <option value="">Select</option>
                  {[...new Map(
                    projects
                      .filter((p) => p.client)
                      .map((p) => [p.client!.id, p.client!])
                  ).values()].map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* project */}
              <div>
                <label className="block text-sm">Project</label>
                <select
                  className="border px-2 py-1 rounded w-full"
                  value={selectedProject}
                  disabled={!selectedClient}
                  onChange={(e) =>
                    setSelectedProject(
                      e.target.value ? Number(e.target.value) : ""
                    )
                  }
                >
                  <option value="">Select</option>
                  {projects
                    .filter((p) =>
                      selectedClient ? p.client?.id === selectedClient : true
                    )
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                </select>
              </div>

              {/* hourly */}
              <div className="flex items-center gap-2">
                <label className="block text-sm w-32">Hourly Rate</label>
                <input
                  type="number"
                  className="border px-2 py-1 rounded w-full"
                  value={hourlyRate}
                  onChange={(e) => setHourlyRate(e.target.value)}
                />
              </div>

              {/* currency */}
              <div className="flex items-center gap-2">
                <label className="block text-sm w-32">Currency</label>
                <select
                  className="border px-2 py-1 rounded w-full"
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                >
                  <option value="">Default</option>
                  {currencies.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              {/* can log */}
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={canLogTime}
                  onChange={(e) => setCanLogTime(e.target.checked)}
                />
                <span>Can Log Time</span>
              </div>
            </div>

            {/* actions */}
            <div className="pt-4 text-right space-x-2">
              <button
                onClick={() => setShowModal(false)}
                className="px-3 py-1 border rounded"
              >
                Cancel
              </button>
              <button
                onClick={addAssignment}
                className="px-3 py-1 bg-green-600 text-white rounded"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}