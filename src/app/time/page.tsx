"use client";

import { useEffect, useState, FormEvent } from "react";
import { getAuth } from "@/lib/auth";
import Link from "next/link";

interface ClientOption {
  id: number;
  name: string;
}

type UserRole = "OWNER" | "STAFF" | string;

function decodeRole(token?: string): UserRole | null {
  if (!token) return null;
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return (payload.role ?? "STAFF") as any;
  } catch {
    return null;
  }
}

interface ProjectOption {
  id: number;
  name: string;
  clientId: number;
}
interface LawyerOption { id:number; name:string }

interface TimeEntry {
  id: number;
  projectId: number;
  startTs: string;
  endTs: string | null;
  durationMins: number;
  notes?: string;
  project: { id: number; name: string };
}

export default function TimeEntriesPage() {
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [lawyers, setLawyers] = useState<LawyerOption[]>([]);
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [now, setNow] = useState(Date.now()); // update each second for live timer
  const [tick, setTick] = useState(0); // minute tick for summaries
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const handleError = async (res: Response) => {
    const data = await safeJson(res);
    const message = (data as any)?.error || res.statusText;
    throw new Error(message);
  };

  // form state
  const [clientId, setClientId] = useState<number | "">("");
  const [projectId, setProjectId] = useState<number | "">("");
  const [startTs, setStartTs] = useState("");
  const [endTs, setEndTs] = useState("");
  const [notes, setNotes] = useState("");
  // quick entry: date + hours
  const [quickDate, setQuickDate] = useState("");
  const [quickHours, setQuickHours] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const token = getAuth();
  const role = decodeRole(token || undefined);
  const isAdmin = ["OWNER","ADMIN","MANAGING_PARTNER","HR_MANAGER","LAWYER_MANAGER"].includes(String(role));
  const [selectedUserId, setSelectedUserId] = useState<number | "">("");

  const fetchInitial = async () => {
    if (!token) return;
    try {
      const [clientRes, projRes, entryRes, lawyersRes] = await Promise.all([
        fetch("/api/clients", { headers: { Authorization: `Bearer ${token}` } }),
        fetch(!(role === "OWNER" || role === "ADMIN") ? "/api/my-projects" : "/api/projects", {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch("/api/time-entries", {
          headers: { Authorization: `Bearer ${token}` },
        }),
        isAdmin ? fetch('/api/lawyers', { headers: { Authorization: `Bearer ${token}` } }) : Promise.resolve(new Response(JSON.stringify([]), { headers: { 'Content-Type':'application/json' } })),
      ]);
      const clientsData = await clientRes.json();
      const projData = await projRes.json();
      const projArr = Array.isArray(projData) ? projData : [];
      setProjects(projArr);
      if (isAdmin) {
        const lawyersData = await lawyersRes.json();
        setLawyers(Array.isArray(lawyersData) ? lawyersData : []);
      }
      if (role === "OWNER" || role === "ADMIN") {
        setClients(Array.isArray(clientsData) ? clientsData : []);
      } else {
        const allowedClients = [...new Map(
          projArr
            .filter((p:any)=>p.client)
            .map((p:any)=>[p.client.id, p.client])
        ).values()];
        setClients(allowedClients);
      }
      const entriesData = await entryRes.json();
      setEntries(Array.isArray(entriesData) ? entriesData : []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInitial();
    const minInterval = setInterval(() => setTick((t) => t + 1), 60000);
    const secInterval = setInterval(() => setNow(Date.now()), 1000);
    return () => {
      clearInterval(minInterval);
      clearInterval(secInterval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const safeJson = async (res: Response) => {
    const ct = res.headers.get("content-type") || "";
    if (ct.includes("application/json")) return res.json();
    return null;
  };

  const startTimer = async () => {
    if (!token || clientId === "" || projectId === "") return;
    if (role === "STAFF" && entries.some((e) => !e.endTs)) {
      alert("You already have an active timer. Stop it before starting a new one.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/timer/start", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          projectId: Number(projectId),
        }),
      });
      const created = await safeJson(res);
      if (!res.ok) throw new Error((created as any)?.error || res.statusText);
      const proj = projects.find((p) => p.id === Number(projectId));
      const withProj = proj
        ? { ...created, project: { id: proj.id, name: proj.name } }
        : created;
      setEntries((prev) => [withProj, ...prev]);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const stopEntry = async (id: number) => {
    if (!token) return;
    try {
      const res = await fetch("/api/timer/stop", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({}),
      });
      const updated = await safeJson(res);
      if (!res.ok) throw new Error((updated as any)?.error || res.statusText);
      setEntries((prev) =>
        prev.map((e) => (e.id === id ? updated : e))
      );
    } catch (err: any) {
      alert(err.message);
    }
  };

  const submitEntry = async (e: FormEvent) => {
    e.preventDefault();
    if (!token || clientId === "" || projectId === "") return;
    if (role === "STAFF" && entries.some((e) => !e.endTs)) return;
    setSubmitting(true);
    try {
      const url = editingId
        ? `/api/time-entries/${editingId}`
        : "/api/time-entries";
      const method = editingId ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          projectId: Number(projectId),
          startTs,
          endTs,
          notes,
        }),
      });
      const created = await safeJson(res);
      if (!res.ok) throw new Error((created as any)?.error || res.statusText);
      if (editingId) {
        setEntries((prev) =>
          prev.map((e) => (e.id === editingId ? created : e))
        );
      } else {
        const proj = projects.find((p) => p.id === Number(projectId));
        const withProj = proj
          ? { ...created, project: { id: proj.id, name: proj.name } }
          : created;
        setEntries((prev) => [withProj, ...prev]);
      }
      setEditingId(null);
      setClientId("");
      setProjectId("");
      setStartTs("");
      setEndTs("");
      setNotes("");
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const editEntry = (entry: TimeEntry) => {
    setEditingId(entry.id);
    setProjectId(entry.projectId);
    setStartTs(entry.startTs.slice(0, 16));
    setEndTs(entry.endTs ? entry.endTs.slice(0, 16) : "");
    setNotes(entry.notes || "");
  };

  // auto-submit helper for quick entry
  const tryAutoQuickSubmit = async () => {
    if (submitting) return;
    if (!quickDate || !quickHours || projectId === "") return;
    if (isAdmin && selectedUserId === "") return;
    await addQuickHours();
  };

  const addQuickHours = async () => {
    if (!token || projectId === "" || !quickDate || !quickHours) return;
    if (isAdmin && selectedUserId === "") { alert('Select lawyer'); return; }
    const hrs = Number(quickHours);
    if (isNaN(hrs) || hrs <= 0) { alert('Enter valid hours'); return; }
    setSubmitting(true);
    try {
      // start at 00:00 local time
      const start = `${quickDate}T00:00`;
      const startDate = new Date(start);
      const endDate = new Date(startDate.getTime() + hrs * 60 * 60 * 1000);
      const fmt = (d: Date) => {
        const pad = (n:number)=>String(n).padStart(2,'0');
        return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
      };
      const url = isAdmin && selectedUserId !== "" ? '/api/admin/time-entries' : '/api/time-entries';
      const body:any = {
          projectId: Number(projectId),
          startTs: fmt(startDate),
          endTs: fmt(endDate),
          notes
      };
      if (isAdmin && selectedUserId !== "") body.userId = Number(selectedUserId);
      const res = await fetch(url,{
        method:'POST',
        headers:{'Content-Type':'application/json', Authorization:`Bearer ${token}`},
        body: JSON.stringify(body)
      });
      const created = await safeJson(res);
      if(!res.ok) throw new Error((created as any)?.error || res.statusText);
      const proj = projects.find(p=>p.id===Number(projectId));
      const withProj = proj ? { ...created, project: { id: proj.id, name: proj.name } } : created;
      setEntries(prev=>[withProj, ...prev]);
      // reset quick fields
      setQuickDate(""); setQuickHours(""); setNotes("");
    } catch(err:any){
      alert(err.message);
    } finally { setSubmitting(false); }
  };

  const deleteEntry = async (id: number) => {
    if (!confirm("Delete this entry?")) return;
    if (!token) return;
    try {
      const res = await fetch(`/api/time-entries/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await safeJson(res);
      if (!res.ok) throw new Error((data as any)?.error || res.statusText);
      setEntries((prev) => prev.filter((e) => e.id !== id));
    } catch (err: any) {
      alert(err.message);
    }
  };

  // ---------- RENDER ----------
  return (
    <main className="mx-auto max-w-5xl p-4">
      <h1 className="mb-4 text-3xl font-bold">Time Entries</h1>

      <p className="mb-4 text-sm text-gray-600">
        <Link href="/dashboard" className="text-blue-600 underline">
          ← Back to Dashboard
        </Link>
      </p>

      {/* active timer */}
      {entries.some((e) => !e.endTs) && (
        (() => {
          const active = entries.find((e) => !e.endTs)!;
          const elapsedMs = now - new Date(active.startTs).getTime();
          const hrs = Math.floor(elapsedMs / 3600000);
          const mins = Math.floor((elapsedMs % 3600000) / 60000);
          const secs = Math.floor((elapsedMs % 60000) / 1000);
          const pad = (n: number) => n.toString().padStart(2, "0");
          return (
            <div className="mb-6 flex items-center gap-4 rounded bg-yellow-100 p-4 text-lg font-semibold text-gray-800">
              <span>
                Active Timer: {pad(hrs)}:{pad(mins)}:{pad(secs)} (Project: {active.project?.name})
              </span>
              <button
                onClick={() => stopEntry(active.id)}
                className="rounded bg-red-600 px-3 py-1 text-white hover:bg-red-700"
              >
                Stop
              </button>
            </div>
          );
        })()
      )}

      {/* quick add by Date + Hours */}
      <div className="mb-6 grid gap-2 sm:grid-cols-6">
        {isAdmin && (
          <select
            value={selectedUserId}
            onChange={(e)=>setSelectedUserId(e.target.value? Number(e.target.value):"")}
            className="rounded border px-3 py-2"
            required
          >
            <option value="">Select lawyer</option>
            {lawyers.map(l=> (
              <option key={l.id} value={l.id}>{l.name}</option>
            ))}
          </select>
        )}
        <select
          value={clientId}
          onChange={(e) => {
            const val = e.target.value ? Number(e.target.value) : "";
            setClientId(val);
            setProjectId("");
          }}
          className="rounded border px-3 py-2"
          required
        >
          <option value="">Select client</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <select
          value={projectId}
          onChange={(e) => setProjectId(e.target.value ? Number(e.target.value) : "")}
          className="rounded border px-3 py-2"
          required
        >
          <option value="">Select project</option>
          {projects
            .filter((p) => clientId !== "" && p.clientId === clientId)
            .map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
        </select>
        <input type="date" value={quickDate} onChange={(e)=>setQuickDate(e.target.value)} onBlur={tryAutoQuickSubmit} className="rounded border px-3 py-2" required />
        <input type="number" step="0.25" min="0" placeholder="Hours" value={quickHours} onChange={(e)=>setQuickHours(e.target.value)} onKeyDown={(e)=>{ if(e.key==='Enter'){ e.preventDefault(); tryAutoQuickSubmit(); } }} onBlur={tryAutoQuickSubmit} className="rounded border px-3 py-2" required />
        <input type="text" placeholder="Notes" value={notes} onChange={(e)=>setNotes(e.target.value)} className="rounded border px-3 py-2" />
        <button type="button" onClick={addQuickHours} className="rounded bg-blue-600 px-4 py-2 font-semibold text-white disabled:opacity-50" disabled={submitting || clientId==="" || projectId===""}>
          Add Hours
        </button>
      </div>

      {/* advanced entry form (start/end) */}
      <form onSubmit={submitEntry} className="mb-6 grid gap-2 sm:grid-cols-6">
        <select
          value={clientId}
          onChange={(e) => {
            const val = e.target.value ? Number(e.target.value) : "";
            setClientId(val);
            setProjectId("");
          }}
          className="rounded border px-3 py-2"
          required
        >
          <option value="">Select client</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>

        <select
          value={projectId}
          onChange={(e) =>
            setProjectId(e.target.value ? Number(e.target.value) : "")
          }
          className="rounded border px-3 py-2"
          required
        >
          <option value="">Select project</option>
          {projects
            .filter((p) => clientId !== "" && p.clientId === clientId)
            .map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
        </select>

        <input
          type="datetime-local"
          value={startTs}
          onChange={(e) => setStartTs(e.target.value)}
          className="rounded border px-3 py-2"
          required
        />

        <input
          type="datetime-local"
          value={endTs}
          onChange={(e) => setEndTs(e.target.value)}
          className="rounded border px-3 py-2"
          required
        />

        <input
          type="text"
          placeholder="Notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="rounded border px-3 py-2"
        />

        <button
          type="submit"
          className="rounded bg-blue-600 px-4 py-2 font-semibold text-white disabled:opacity-50"
          disabled={submitting}
        >
          {submitting
            ? editingId
              ? "Saving..."
              : "Adding..."
            : editingId
            ? "Save"
            : "Add"}
        </button>

        <button
          type="button"
          onClick={startTimer}
          className="rounded bg-green-600 px-4 py-2 font-semibold text-white disabled:opacity-50"
          disabled={
            submitting ||
            clientId === "" ||
            projectId === "" ||
            role === "STAFF" && entries.some((e) => !e.endTs)
          }
        >
          Start Timer
        </button>
      </form>

      {/* summary */}
      {(() => {
        const minutesForEntry = (e: TimeEntry) => {
          if (!e.endTs) {
            return (now - new Date(e.startTs).getTime()) / 60000;
          }
          return e.durationMins;
        };

        const isToday = (d: Date) => d.toDateString() === new Date().toDateString();
        const todayMins = entries
          .filter((e) => isToday(new Date(e.startTs)))
          .reduce((s, e) => s + minutesForEntry(e), 0);

        const nowDate = new Date();
        const weekStart = new Date(nowDate);
        weekStart.setDate(nowDate.getDate() - nowDate.getDay());
        weekStart.setHours(0, 0, 0, 0);
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 7);
        const weekMins = entries
          .filter((e) => {
            const d = new Date(e.startTs);
            return d >= weekStart && d < weekEnd;
          })
          .reduce((s, e) => s + minutesForEntry(e), 0);

        const fmt = (mins: number) => {
          const h = Math.floor(mins / 60);
          const m = Math.round(mins % 60);
          return `${h}h ${m.toString().padStart(2, "0")}m`;
        };
        return (
          <div className="mb-4 flex gap-6 text-sm font-semibold">
            <span>Today: {fmt(todayMins)}</span>
            <span>This Week: {fmt(weekMins)}</span>
          </div>
        );
      })()}

      {loading ? (
        <p>Loading...</p>
      ) : error ? (
        <p className="text-red-600">{error}</p>
      ) : (
        <table className="min-w-full table-auto border text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="border px-4 py-2 text-left">Date</th>
              <th className="border px-4 py-2 text-left">Project</th>
              <th className="border px-2 py-1 text-right">Duration (mins)</th>
              <th className="border px-4 py-2 text-left">Notes</th>
              <th className="border px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {entries.map((e) => {
              const isActive = !e.endTs;
              const duration = isActive
                ? (Date.now() - new Date(e.startTs).getTime()) / 60000
                : e.durationMins;
              return (
                <tr key={e.id}>
                  <td className="border px-4 py-2">
                    {new Date(e.startTs).toLocaleString()}
                  </td>
                  <td className="border px-4 py-2">{e.project?.name}</td>
                  <td className="border px-2 py-1 text-right">
                    {duration.toFixed(1)}
                  </td>
                  <td className="border px-4 py-2">{e.notes}</td>
                  <td className="border px-4 py-2 text-center">
                    {isActive ? (
                      <button
                        onClick={() => stopEntry(e.id)}
                        className="text-green-700 hover:underline"
                      >
                        Stop
                      </button>
                    ) : (
                      <>
                        <button
                          onClick={() => editEntry(e)}
                          className="text-blue-600 hover:underline"
                        >
                          Edit
                        </button>{" "}
                        |{" "}
                        <button
                          onClick={() => deleteEntry(e.id)}
                          className="text-red-600 hover:underline"
                        >
                          Delete
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </main>
  );
}