"use client";
import { useEffect, useState } from "react";
import clsx from "clsx";
import PermissionsMatrix from "@/components/admin/PermissionsMatrix";

interface User {
  id: number;
  name: string | null;
  email: string;
}

type ScopeType = "ALL" | "CLIENT" | "PROJECT" | "LAWYER";

export interface UserPermission {
  page: string;
  enabled: boolean;
  clientIds: number[];
  projectIds: number[];
  itemIds: number[];
  lawyerIds: number[];
}

function authHeaders(): Record<string, string> {
  if (typeof window === "undefined") return {};
  const token =
    localStorage.getItem("authToken") ?? localStorage.getItem("token") ?? "";
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export default function PermissionsPage() {
  const [projects, setProjects] = useState<{id:number,name:string}[]>([]);
  const [projectId,setProjectId] = useState<string>("ALL");
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [initialPerms, setInitialPerms] = useState<UserPermission[]>([]);

  // load projects on mount
  useEffect(()=>{
    fetch('/api/projects', { headers: authHeaders() }).then(r=>r.json()).then(arr=>{
      setProjects(arr);
      if(arr.length>0){
        setProjectId(String(arr[0].id));
      }else{
        // no projects, fetch all users
        fetch('/api/users',{headers:authHeaders()})
          .then(r=>r.json()).then(data=>Array.isArray(data)?setUsers(data):[]);
      }
    });
  },[]);

  // load users whenever projectId changes
  useEffect(() => {
    if(projectId==='ALL'){ // fetch all
      fetch('/api/users',{headers:authHeaders()}).then(r=>r.json()).then(d=>Array.isArray(d)?setUsers(d):[]);
      return;
    }
    fetch(`/api/users?projectId=${projectId}`, { headers: authHeaders() })
      .then(r => r.json())
      .then(data => (Array.isArray(data) ? setUsers(data) : []));
  }, [projectId]);

  // load permissions when user changes
  useEffect(() => {
    if (!selectedUser) return;
    fetch(`/api/user-permissions?userId=${selectedUser.id}`, { headers: authHeaders() })
      .then(r => r.json())
      .then(data =>
        Array.isArray(data) ? setInitialPerms(data) : setInitialPerms([])
      );
  }, [selectedUser]);

  async function handleSave(perms: UserPermission[]) {
    if (!selectedUser) return;
    const hdrs: Record<string,string> = { "Content-Type": "application/json", ...authHeaders() };
    await fetch("/api/user-permissions", {
      method: "POST",
      headers: hdrs,
      body: JSON.stringify({ userId: selectedUser.id, permissions: perms })
    });
    alert("Permissions saved");
  }

  return (
    <div className="p-6">
      <h1 className="mb-4 text-2xl font-semibold">Permissions Management</h1>
      <div className="flex gap-6">
        {/* Users list */}
        <aside className="w-1/4 border-r pr-4">
          <label className="block mb-2 font-medium">Project</label>
            <select value={projectId} onChange={e=>setProjectId(e.target.value)} className="mb-4 w-full border rounded px-2 py-1">
              <option value="ALL">All Projects</option>
              {projects.map(p=> <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <h2 className="mb-2 font-medium">Users</h2>
          <ul className="space-y-1 text-sm">
            {users.map(u => (
              <li
                key={u.id}
                className={clsx(
                  "cursor-pointer rounded px-2 py-1 hover:bg-gray-100",
                  selectedUser?.id === u.id && "bg-blue-100 text-blue-700"
                )}
                onClick={() => setSelectedUser(u)}
              >
                {u.name || u.email}
                <div className="flex gap-3">
                  <button
                    onClick={() => handleSave(initialPerms)}
                    className="rounded bg-blue-600 px-4 py-1 text-sm text-white hover:bg-blue-700"
                  >
                    Save
                  </button>
                  {selectedUser && (
                    <button
                      onClick={() => window.open(`/admin?as=${selectedUser.id}`, '_blank')}
                      className="rounded border border-gray-400 px-4 py-1 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      Preview as User
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </aside>

        {/* Permission matrix */}
        <main className="flex-1">
          {selectedUser ? (
            <PermissionsMatrix
              userId={selectedUser.id}
              initialPermissions={initialPerms}
              onSave={handleSave}
            />
          ) : (
            <p className="text-gray-500">Select a user to edit permissions</p>
          )}
        </main>
      </div>
    </div>
  );
}