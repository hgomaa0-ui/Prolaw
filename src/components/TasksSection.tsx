"use client";
import { useEffect, useState } from "react";
import toast, { Toaster } from "react-hot-toast";
import { getAuth } from "@/lib/auth";

interface Task {
  id: number;
  title: string;
  status: string;
  dueDate: string;
  assignee: { id: number; name: string };
}

interface Props {
  projectId: number;
}

export default function TasksSection({ projectId }: Props) {
  const token = getAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [lawyers, setLawyers] = useState<{ id: number; name: string }[]>([]);
  const [form, setForm] = useState({
    title: "",
    description: "",
    assigneeId: "",
    dueDate: "",
  });

  const load = () => {
    setLoading(true);
    fetch(`/api/tasks?projectId=${projectId}`, {
      credentials: 'include',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then(async (r) => {
        if (!r.ok) {
          throw new Error(`HTTP ${r.status}`);
        }
        return r.json();
      })
      .then(setTasks)
      .catch((err) => {
        if (err.message.includes('401')) {
          toast.error('Session expired – please log in');
        } else {
          toast.error('Failed to load tasks');
        }
        setTasks([]);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    fetch("/api/list/lawyers", { credentials: 'include', headers: token ? { Authorization: `Bearer ${token}` } : {} }).then((r) => r.json()).then(setLawyers).catch(()=>{});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const addTask = async () => {
    if (!form.title || !form.assigneeId || !form.dueDate) return;
    try {
      const res = await fetch("/api/tasks", {
        credentials: 'include',
        method: "POST",
        headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
        body: JSON.stringify({
          ...form,
          projectId,
          assigneeId: parseInt(form.assigneeId),
        }),
      });
      if (!res.ok) throw new Error();
      toast.success("Task added");
      setShowModal(false);
      setForm({ title: "", description: "", assigneeId: "", dueDate: "" });
      load();
    } catch {
      toast.error("Add failed");
    }
  };

  const updateStatus = async (id: number, status: string) => {
    try {
      await fetch(`/api/tasks/${id}`, {
        credentials: 'include',
        method: "PATCH",
        headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
        body: JSON.stringify({ status }),
      });
      load();
    } catch {
      toast.error("Update failed");
    }
  };

  return (
    <div className="bg-gray-50 p-4 rounded border mb-8">
      <Toaster />
      <div className="flex justify-between items-center mb-2">
        <h2 className="font-semibold">Project Tasks</h2>
              </div>
      {loading ? (
        <p className="text-sm text-gray-600">Loading…</p>
      ) : tasks.length === 0 ? (
        <p className="text-sm text-gray-600">No tasks yet.</p>
      ) : (
        <table className="text-sm border min-w-full">
          <thead className="bg-gray-100"><tr><th className="border px-2 py-1">Title</th><th className="border px-2 py-1">Lawyer</th><th className="border px-2 py-1">Due</th><th className="border px-2 py-1">Status</th><th className="border px-2 py-1 text-right">Actions</th></tr></thead>
          <tbody>
            {tasks.map(t => (
              <tr key={t.id}>
                <td className="border px-2 py-1">{t.title}</td>
                <td className="border px-2 py-1">{t.assignee.name}</td>
                <td className="border px-2 py-1">{new Date(t.dueDate).toLocaleDateString()}</td>
                <td className="border px-2 py-1 capitalize">{t.status.toLowerCase()}</td>
                <td className="border px-2 py-1 text-right space-x-1">
                  <button onClick={() => updateStatus(t.id, "DONE")} className="text-green-600 underline text-xs">Done</button>
                  <button onClick={() => updateStatus(t.id, "REJECTED")} className="text-red-600 underline text-xs">Reject</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white w-full max-w-md rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-3">Add Task</h3>
            <div className="space-y-3">
              <input value={form.title} onChange={e=>setForm({...form,title:e.target.value})} placeholder="Title" className="border px-2 py-1 w-full" />
              <textarea value={form.description} onChange={e=>setForm({...form,description:e.target.value})} placeholder="Description" className="border px-2 py-1 w-full" />
              <select value={form.assigneeId} onChange={e=>setForm({...form,assigneeId:e.target.value})} className="border px-2 py-1 w-full">
                <option value="">Select Lawyer</option>
                {lawyers.map(l=> (<option key={l.id} value={l.id}>{l.name}</option>))}
              </select>
              <input type="date" value={form.dueDate} onChange={e=>setForm({...form,dueDate:e.target.value})} className="border px-2 py-1 w-full" />
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button onClick={()=>setShowModal(false)} className="border px-3 py-1 rounded">Cancel</button>
              <button onClick={addTask} className="bg-blue-600 text-white px-4 py-1 rounded">Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
