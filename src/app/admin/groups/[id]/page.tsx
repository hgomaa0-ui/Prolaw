"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

interface Member {
  userId: number;
  isManager: boolean;
  user: { id: number; name: string; email: string; role: string };
}

export default function GroupDetail() {
  const params = useParams();
  const id = Number((params as any).id);
  const router = useRouter();
  const [groupName, setGroupName] = useState<string>("");
  const [members, setMembers] = useState<Member[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState<string>("");
  const [loading, setLoading] = useState(true);

  async function fetchAll() {
    setLoading(true);
    const token = localStorage.getItem('token');
    const auth = token ? { Authorization: `Bearer ${token}` } : undefined;
    const [gRes, mRes, uRes] = await Promise.all([
      fetch(`/api/groups?withMembers=1`, { headers: auth }),
      fetch(`/api/groups/${id}/members`, { headers: auth }),
      fetch(`/api/lawyers`, { headers: auth }),
    ]);
    if (gRes.ok) {
      const list = await gRes.json();
      const g = list.find((x: any) => x.id === id);
      setGroupName(g?.name || "");
    }
    if (mRes.ok) setMembers(await mRes.json());
    if (uRes.ok) setUsers(await uRes.json());
    setLoading(false);
  }

  useEffect(() => {
    fetchAll();
  }, []);

  async function addMember(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedUser) return;
    const token = localStorage.getItem('token');
    await fetch(`/api/groups/${id}/members`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify({ userId: Number(selectedUser) }),
    });
    setSelectedUser("");
    fetchAll();
  }

  async function removeMember(userId: number) {
    if (!confirm("Remove this member?")) return;
    const token = localStorage.getItem('token');
    await fetch(`/api/groups/${id}/members`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify({ userId }),
    });
    fetchAll();
  }

  if (loading) return <p className="p-6">Loading…</p>;
  if (!groupName) return (
    <div className="p-6">
      <p>Group not found.</p>
      <button className="text-blue-600" onClick={() => router.back()}>Back</button>
    </div>
  );

  return (
    <div className="container mx-auto max-w-3xl p-6">
      <h1 className="text-2xl font-bold mb-4">Group: {groupName}</h1>

      <form onSubmit={addMember} className="flex gap-2 mb-6">
        <select
          className="flex-1 border px-2 py-1 rounded"
          value={selectedUser}
          onChange={(e) => setSelectedUser(e.target.value)}
        >
          <option value="">Select lawyer…</option>
          {users.map((u) => (
            <option key={u.id} value={u.id} disabled={members.some((m) => m.userId === u.id)}>
              {u.name} ({u.email})
            </option>
          ))}
        </select>
        <button className="bg-blue-600 text-white px-4 py-1 rounded disabled:opacity-50" disabled={!selectedUser}>Add</button>
      </form>

      {members.length === 0 ? (
        <p>No members yet.</p>
      ) : (
        <table className="w-full border">
          <thead>
            <tr className="bg-gray-100 text-left">
              <th className="p-2">Name</th>
              <th className="p-2">Email</th>
              <th className="p-2">Role</th>
              <th className="p-2" />
            </tr>
          </thead>
          <tbody>
            {members.map((m) => (
              <tr key={m.userId} className="border-t">
                <td className="p-2">{m.user.name}</td>
                <td className="p-2">{m.user.email}</td>
                <td className="p-2">{m.isManager ? "Manager" : "Member"}</td>
                <td className="p-2 text-right">
                  <button onClick={() => removeMember(m.userId)} className="text-red-600 text-sm">
                    Remove
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
