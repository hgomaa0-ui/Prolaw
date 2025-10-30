"use client";
import { useEffect, useState } from "react";
import toast, { Toaster } from "react-hot-toast";
import { getAuth } from "@/lib/auth";

interface Task {
  id: number;
  title: string;
  status: string;
  dueDate: string;
  client?: { id: number; name: string } | null;
  project?: { id: number; name: string } | null;
  assignee: { id: number; name: string };
}

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    title: "",
    assigneeId: "",
    dueDate: "",
    clientId: "",
    projectId: "",
    description: "",
  });

  // reference lists
  const [clients, setClients] = useState<{ id: number; name: string }[]>([]);
  const [projects, setProjects] = useState<{ id: number; name: string; clientId: number }[]>([]);
  const [lawyers, setLawyers] = useState<{ id: number; name: string }[]>([]);

  useEffect(() => {
    Promise.all([
      fetch('/api/list/clients', { headers: buildAuth() }).then(r => r.json()),
      fetch('/api/list/projects', { headers: buildAuth() }).then(r => r.json()),
    ])
      .then(([c, p]) => {
        setClients(c);
        setProjects(p);
              })
      .catch(() => {});
  }, []);

  // Load lawyers when project is selected
  useEffect(() => {
    if (form.projectId) {
      fetch(`/api/list/lawyers?projectId=${form.projectId}`, { headers: buildAuth() })
        .then(r => r.json())
        .then(setLawyers)
        .catch(() => {}); // Removed setLawyers call here
    } else {
      setLawyers([]);
    }
  }, [form.projectId]);

  const load = () => {
    setLoading(true);
    fetch("/api/tasks", { headers: buildAuth() })
      .then((r) => r.json())
      .then(setTasks)
      .catch(() => toast.error("Error"))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const addTask = async () => {
    try {
            const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...buildAuth() },
        body: JSON.stringify({
          ...form,
          assigneeId: parseInt(form.assigneeId || "0"),
          clientId: form.clientId ? parseInt(form.clientId) : undefined,
          projectId: form.projectId ? parseInt(form.projectId) : undefined,
        }),
      });
      if (!res.ok) throw new Error();
      toast.success("Task created");
      setShowModal(false);
      setForm({
        title: "",
        assigneeId: "",
        dueDate: "",
        clientId: "",
        projectId: "",
        description: "",
      });
      load();
    } catch {
      toast.error("Creation failed");
    }
  };

  function buildAuth(): { [key: string]: string } {
    const t = getAuth();
    return t ? { Authorization: `Bearer ${t}` } : {};
  }

  const updateStatus = async (id: number, status: string) => {
    try {
      await fetch(`/api/tasks/${id}`, {
        method: "PATCH",
                headers: { "Content-Type": "application/json", ...buildAuth() },
        body: JSON.stringify({ status }),
      });
      toast.success("Updated");
      load();
    } catch {
      toast.error("Update failed");
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <Toaster />
      <div className="flex justify-between items-center mb-4">
        <button onClick={()=>setShowModal(true)} className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">Add Task</button>
        <h1 className="text-2xl font-semibold">Tasks</h1>
      </div>

      {loading ? (
        <p>Loading...</p>
      ) : (
        <div className="overflow-x-auto border rounded-lg">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                {[
                  "Title",
                  "Client",
                  "Project",
                  "Assignee",
                  "Due Date",
                  "Status",
                  "Actions",
                ].map((h) => (
                  <th
                    key={h}
                    className="px-3 py-2 text-left font-medium text-gray-500 uppercase tracking-wider"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {tasks.map((t) => (
                <tr key={t.id} className="hover:bg-gray-50">
                  <td className="px-3 py-2">{t.title}</td>
                  <td className="px-3 py-2">{t.client?.name || "-"}</td>
                  <td className="px-3 py-2">{t.project?.name || "-"}</td>
                  <td className="px-3 py-2">{t.assignee.name}</td>
                  <td className="px-3 py-2">
                    {new Date(t.dueDate).toLocaleDateString()}
                  </td>
                  <td className="px-3 py-2 capitalize">
                    {t.status.toLowerCase()}
                  </td>
                  <td className="px-3 py-2 space-x-1">
                    <button
                      className="text-green-600 hover:underline"
                      onClick={() => updateStatus(t.id, "DONE")}
                    >
                      Done
                    </button>
                    <button
                      className="text-red-600 hover:underline"
                      onClick={() => updateStatus(t.id, "REJECTED")}
                    >
                      Reject
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white w-full max-w-lg rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Add Task</h2>
            <div className="space-y-3">
              <input
                className="w-full border p-2"
                placeholder="Title"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
              <textarea
                className="w-full border p-2"
                placeholder="Description"
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
              ></textarea>
              <select
                className="w-full border p-2"
                value={form.clientId}
                onChange={e => setForm({ ...form, clientId: e.target.value, projectId: '' })}
              >
                <option value="">Select Client</option>
                {clients.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              <select
                className="w-full border p-2"
                value={form.projectId}
                onChange={e => setForm({ ...form, projectId: e.target.value })}
                disabled={!form.clientId}
              >
                <option value="">Select Project</option>
                {projects.filter(p => !form.clientId || p.clientId === parseInt(form.clientId)).map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
              <select
                className="w-full border p-2"
                value={form.assigneeId}
                onChange={e => setForm({ ...form, assigneeId: e.target.value })}
              >
                <option value="">Select Lawyer</option>
                {lawyers.map(l => (
                  <option key={l.id} value={l.id}>{l.name}</option>
                ))}
              </select>
              <input
                type="date"
                className="w-full border p-2"
                value={form.dueDate}
                onChange={e => setForm({ ...form, dueDate: e.target.value })}
              />
            </div>
            <div className="mt-4 flex justify-end space-x-2">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 border rounded"
              >
                Cancel
              </button>
              <button
                onClick={addTask}
                className="px-4 py-2 bg-blue-600 text-white rounded"
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