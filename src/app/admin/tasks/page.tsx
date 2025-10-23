"use client";
import { useEffect, useState } from "react";
import toast, { Toaster } from "react-hot-toast";

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

  const load = () => {
    setLoading(true);
    fetch("/api/tasks")
      .then((r) => r.json())
      .then(setTasks)
      .catch(() => toast.error("خطأ"))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const addTask = async () => {
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          assigneeId: parseInt(form.assigneeId || "0"),
          clientId: form.clientId ? parseInt(form.clientId) : undefined,
          projectId: form.projectId ? parseInt(form.projectId) : undefined,
        }),
      });
      if (!res.ok) throw new Error();
      toast.success("تم إنشاء المهمة");
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
      toast.error("فشل الإنشاء");
    }
  };

  const updateStatus = async (id: number, status: string) => {
    try {
      await fetch(`/api/tasks/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      toast.success("تم التحديث");
      load();
    } catch {
      toast.error("خطأ فى التحديث");
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <Toaster />
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-semibold">المهام</h1>
        <button
          onClick={() => setShowModal(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          إضافة مهمة
        </button>
      </div>

      {loading ? (
        <p>جاري التحميل...</p>
      ) : (
        <div className="overflow-x-auto border rounded-lg">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                {[
                  "العنوان",
                  "العميل",
                  "المشروع",
                  "المكلَّف",
                  "الموعد",
                  "الحالة",
                  "إجراءات",
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
                      تم
                    </button>
                    <button
                      className="text-red-600 hover:underline"
                      onClick={() => updateStatus(t.id, "REJECTED")}
                    >
                      رفض
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
            <h2 className="text-xl font-semibold mb-4">إضافة مهمة</h2>
            <div className="space-y-3">
              <input
                className="w-full border p-2"
                placeholder="العنوان"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
              <textarea
                className="w-full border p-2"
                placeholder="الوصف"
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
              ></textarea>
              <input
                type="number"
                className="w-full border p-2"
                placeholder="معرّف المكلَّف"
                value={form.assigneeId}
                onChange={(e) =>
                  setForm({ ...form, assigneeId: e.target.value })
                }
              />
              <input
                type="date"
                className="w-full border p-2"
                value={form.dueDate}
                onChange={(e) =>
                  setForm({ ...form, dueDate: e.target.value })
                }
              />
            </div>
            <div className="mt-4 flex justify-end space-x-2">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 border rounded"
              >
                إلغاء
              </button>
              <button
                onClick={addTask}
                className="px-4 py-2 bg-blue-600 text-white rounded"
              >
                حفظ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}