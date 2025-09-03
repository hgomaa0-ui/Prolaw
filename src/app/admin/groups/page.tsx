"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

interface Group {
  id: number;
  name: string;
  members?: { user: { id: number; name: string; email: string } }[];
}

export default function GroupsPage() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [error, setError] = useState("");

  async function fetchGroups() {
    setLoading(true);
    const token = localStorage.getItem('token');
    const res = await fetch("/api/groups?withMembers=1", {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    });
    if (res.ok) {
      setGroups(await res.json());
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchGroups();
  }, []);

  async function addGroup(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    const token = localStorage.getItem('token');
    const res = await fetch("/api/groups", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify({ name }),
    });
    if (res.ok) {
      setName("");
      fetchGroups();
    } else {
      const data = await res.json();
      setError(data.error || "Failed to create group");
    }
  }

  async function deleteGroup(id: number) {
    if (!confirm("Delete this group?")) return;
    const token = localStorage.getItem('token');
    await fetch("/api/groups", {
      method: "DELETE",
      headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify({ id }),
    });
    fetchGroups();
  }

  return (
    <div className="container mx-auto max-w-3xl p-6">
      <h1 className="text-2xl font-bold mb-4">Groups</h1>

      <form onSubmit={addGroup} className="flex gap-2 mb-6">
        <input
          type="text"
          className="flex-1 border px-2 py-1 rounded"
          placeholder="Group name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <button
          className="bg-blue-600 text-white px-4 py-1 rounded disabled:opacity-50"
          disabled={!name.trim()}
        >
          Add
        </button>
      </form>
      {error && <p className="text-red-600 mb-4">{error}</p>}
      {loading ? (
        <p>Loading…</p>
      ) : groups.length === 0 ? (
        <p>No groups yet.</p>
      ) : (
        <table className="w-full border">
          <thead>
            <tr className="bg-gray-100 text-left">
              <th className="p-2">Name</th>
              <th className="p-2">Members</th>
              <th className="p-2" />
            </tr>
          </thead>
          <tbody>
            {groups.map((g) => (
              <tr key={g.id} className="border-t">
                <td className="p-2">
                  <Link href={`/admin/groups/${g.id}`}>{g.name}</Link>
                </td>
                <td className="p-2">{g.members?.length ?? 0}</td>
                <td className="p-2"><Link className="text-blue-600 text-sm" href={`/admin/groups/${g.id}`}>Edit</Link></td>
                <td className="p-2 text-right">
                  <button
                    onClick={() => deleteGroup(g.id)}
                    className="text-red-600 text-sm"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}