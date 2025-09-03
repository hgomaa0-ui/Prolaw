"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { fetchAuth } from "@/lib/fetchAuth";
import dayjs from "dayjs";

interface TimeEntry {
  id: number;
  project: { name: string; client: { name: string } } | null;
  user: { name: string } | null;
  startTs: string;
  endTs: string | null;
  durationMins: number;
  notes: string | null;
}

export default function ManagerPendingTimePage() {
  const [items, setItems] = useState<TimeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [editId, setEditId] = useState<number | null>(null);
  const [tempStart, setTempStart] = useState("");
  const [tempEnd, setTempEnd] = useState("");
  const [tempNotes, setTempNotes] = useState("");
  const [tempDuration, setTempDuration] = useState("");

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    const res = await fetchAuth("/api/time-entries/pending/manager");
    if (res.ok) {
      setItems(await res.json());
    } else {
      toast.error("Failed to load");
    }
    setLoading(false);
  }

  function beginEdit(e: TimeEntry) {
    setEditId(e.id);
    setTempStart(dayjs(e.startTs).format("YYYY-MM-DDTHH:mm"));
    setTempEnd(e.endTs ? dayjs(e.endTs).format("YYYY-MM-DDTHH:mm") : "");
    setTempNotes(e.notes ?? "");
    setTempDuration(e.durationMins.toString());
  }

  function cancel() {
    setEditId(null);
    setTempStart("");
    setTempEnd("");
    setTempNotes("");
    setTempDuration("");
  }

  async function saveAndApprove(id: number) {
    try {
      const body: any = { startTs: tempStart, notes: tempNotes };
      if (tempEnd) body.endTs = tempEnd;
      if (tempDuration) body.durationMins = Number(tempDuration);
      const res = await fetchAuth(`/api/time-entries/pending/manager?id=${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Failed");
      toast.success("Approved");
      load();
    } catch (err: any) {
      toast.error(err.message || "Error");
    } finally {
      cancel();
    }
  }

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Pending Time Approvals</h1>
      {loading ? (
        <p>Loading...</p>
      ) : items.length === 0 ? (
        <p className="italic text-sm">No pending entries.</p>
      ) : (
        <table className="w-full bg-white shadow rounded text-sm">
          <thead className="bg-gray-100 text-left">
            <tr>
              <th className="px-3 py-2">ID</th>
              <th className="px-3 py-2">Lawyer</th>
              <th className="px-3 py-2">Client / Project</th>
              <th className="px-3 py-2">Start</th>
              <th className="px-3 py-2">End</th>
              <th className="px-3 py-2">Duration (mins)</th>
              <th className="px-3 py-2">Notes</th>
              <th className="px-3 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map((e) => (
              <tr key={e.id} className="border-t hover:bg-gray-50">
                <td className="px-3 py-2">{e.id}</td>
                <td className="px-3 py-2">{e.user?.name}</td>
                <td className="px-3 py-2">
                  {e.project?.client.name} / {e.project?.name}
                </td>
                <td className="px-3 py-2">
                  {editId === e.id ? (
                    <input
                      type="datetime-local"
                      value={tempStart}
                      onChange={(ev) => setTempStart(ev.target.value)}
                      className="border px-1 rounded"
                    />
                  ) : (
                    dayjs(e.startTs).format("YYYY-MM-DD HH:mm")
                  )}
                </td>
                <td className="px-3 py-2">
                  {editId === e.id ? (
                    <input
                      type="datetime-local"
                      value={tempEnd}
                      onChange={(ev) => setTempEnd(ev.target.value)}
                      className="border px-1 rounded"
                    />
                  ) : e.endTs ? (
                    dayjs(e.endTs).format("YYYY-MM-DD HH:mm")
                  ) : (
                    "-"
                  )}
                </td>
                <td className="px-3 py-2 text-center">
                  {editId === e.id ? (
                    <input
                      type="number"
                      min="0"
                      value={tempDuration}
                      onChange={(ev)=>setTempDuration(ev.target.value)}
                      className="border px-1 rounded w-20 text-center"
                    />
                  ) : (
                    e.durationMins
                  )}
                </td>
                <td className="px-3 py-2 max-w-[200px] truncate">
                  {editId === e.id ? (
                    <input
                      value={tempNotes}
                      onChange={(ev) => setTempNotes(ev.target.value)}
                      className="border px-1 rounded w-full"
                    />
                  ) : (
                    e.notes || "-"
                  )}
                </td>
                <td className="px-3 py-2 space-x-2">
                  {editId === e.id ? (
                    <>
                      <button onClick={() => saveAndApprove(e.id)} className="text-green-600">Save & Approve</button>
                      <button onClick={cancel} className="text-gray-500">Cancel</button>
                    </>
                  ) : (
                    <button onClick={() => beginEdit(e)} className="text-blue-600">Edit</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
