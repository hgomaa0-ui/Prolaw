"use client";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { getAuth } from "@/lib/auth";

interface Props {
  projectId: number;
  onClose: () => void;
  onSaved?: () => void;
}

export default function ProjectTaskModal({ projectId, onClose, onSaved }: Props) {
  const token = getAuth();
  const [lawyers, setLawyers] = useState<{ id: number; name: string }[]>([]);
  const [form, setForm] = useState({
    title: "",
    description: "",
    assigneeId: "",
    dueDate: "",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch(`/api/list/lawyers?projectId=${projectId}`, {
      credentials: "include",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then((r) => r.json())
      .then(setLawyers)
      .catch(() => toast.error("Failed to load lawyers"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const save = async () => {
    if (!form.title || !form.assigneeId || !form.dueDate) {
      toast.error("Fill required fields");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          ...form,
          assigneeId: parseInt(form.assigneeId),
          projectId,
        }),
      });
      if (!res.ok) throw new Error();
      toast.success("Task created");
      onClose();
      onSaved?.();
    } catch {
      toast.error("Create failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white w-full max-w-md rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">Add Task to Project #{projectId}</h3>
        <div className="space-y-3">
          <input
            className="border px-2 py-1 w-full"
            placeholder="Title"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
          />
          <textarea
            className="border px-2 py-1 w-full"
            placeholder="Description (optional)"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
          <select
            className="border px-2 py-1 w-full"
            value={form.assigneeId}
            onChange={(e) => setForm({ ...form, assigneeId: e.target.value })}
          >
            <option value="">Select Lawyer</option>
            {lawyers.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
          <input
            type="date"
            className="border px-2 py-1 w-full"
            value={form.dueDate}
            onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
          />
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button onClick={onClose} className="border px-3 py-1 rounded">
            Cancel
          </button>
          <button
            onClick={save}
            disabled={saving}
            className="bg-blue-600 text-white px-4 py-1 rounded disabled:opacity-50"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
