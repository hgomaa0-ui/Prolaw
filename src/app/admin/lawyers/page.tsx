"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";



interface Position {
  id: number;
  name: string;
}
const ROLES = [
  { value: "ADMIN", label: "Admin" },
  { value: "ACCOUNTANT_MASTER", label: "Accountant Master" },
  { value: "ACCOUNTANT_ASSISTANT", label: "Accountant Assistant" },
  { value: "LAWYER_PARTNER", label: "Lawyer Partner" },
  { value: "LAWYER_MANAGER", label: "Lawyer Manager" },
  { value: "LAWYER", label: "Lawyer" },
];

interface Lawyer {
  id: number;
  name: string;
  email: string;
  phone?: string | null;
  address?: string | null;
  position?: Position | null;
  role: string;
}

export default function LawyersPage() {
  function openEdit(l: Lawyer) {
    setEditing(l);
    setEditData({
      name: l.name,
      email: l.email,
      phone: l.phone ?? "",
      address: l.address ?? "",
      positionId: l.position?.id ?? "",
      role: l.role ?? "LAWYER",
      password: "",
    });
  }

  async function saveEdit() {
    if (!editing) return;
    const res = await fetch(`/api/lawyers/${editing.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...editData, managedLawyerIds: editData.role === 'LAWYER_MANAGER' ? editManagedIds : undefined }),
    });
    if (res.ok) {
      toast.success("Updated");
      setEditing(null);
      fetchAll();
    } else {
      const err = await res.json();
      toast.error(err.error || "Failed");
    }
  }

  async function deleteLawyer() {
    if (!editing) return;
    if (!confirm("Delete this lawyer?")) return;
    const res = await fetch(`/api/lawyers/${editing.id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Deleted");
      setEditing(null);
      fetchAll();
    } else {
      const err = await res.json();
      toast.error(err.error || "Failed");
    }
  }

  function renderEditForm() {
    return (
      <div className="space-y-3">
        <div>
          <label className="block text-sm">Name</label>
          <input value={editData.name} onChange={(e)=>setEditData({...editData,name:e.target.value})} className="border px-2 py-1 rounded w-full" />
        </div>
        <div>
          <label className="block text-sm">Email</label>
          <input value={editData.email} onChange={(e)=>setEditData({...editData,email:e.target.value})} className="border px-2 py-1 rounded w-full" />
        </div>
        <div>
          <label className="block text-sm">Phone</label>
          <input value={editData.phone} onChange={(e)=>setEditData({...editData,phone:e.target.value})} className="border px-2 py-1 rounded w-full" />
        </div>
        <div>
          <label className="block text-sm">Address</label>
          <input value={editData.address} onChange={(e)=>setEditData({...editData,address:e.target.value})} className="border px-2 py-1 rounded w-full" />
        </div>
        <div>
          <label className="block text-sm">Position</label>
          <select value={editData.positionId} onChange={(e)=>setEditData({...editData,positionId:e.target.value?Number(e.target.value):""})} className="border px-2 py-1 rounded w-full">
            <option value="">None</option>
            {positions.map(p=> <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm">Role</label>
          <select value={editData.role} onChange={(e)=>setEditData({...editData,role:e.target.value})} className="border px-2 py-1 rounded w-full">
            {ROLES.map(r=> <option key={r.value} value={r.value}>{r.label}</option>)}</select>
        </div>
        {editData.role === 'LAWYER_MANAGER' && (
          <div className="mb-2">
            <label className="block text-sm mb-1">Managed Lawyers</label>
            <MultiSelectDropdown
              selected={editManagedIds}
              setSelected={setEditManagedIds}
              options={lawyers.filter(l => l.id !== editing?.id && l.role !== 'LAWYER_MANAGER')}
            />
          </div>
        )}
        <div>
          <label className="block text-sm">New Password</label>
          <input type="password" value={editData.password??""} onChange={(e)=>setEditData({...editData,password:e.target.value})} className="border px-2 py-1 rounded w-full" />
        </div>

        <div className="flex justify-between pt-4">
          <button onClick={deleteLawyer} className="text-red-600">Delete</button>
          <div className="space-x-2">
            <button onClick={()=>setEditing(null)} className="px-3 py-1 border rounded">Cancel</button>
            <button onClick={saveEdit} className="px-3 py-1 bg-green-600 text-white rounded">Save</button>
          </div>
        </div>
      </div>
    );
  }
  const [lawyers, setLawyers] = useState<Lawyer[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [positionId, setPositionId] = useState<number | "">("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<string>("LAWYER");
  const [managedIds, setManagedIds] = useState<number[]>([]);

  function MultiSelectDropdown({selected, setSelected, options}:{selected:number[]; setSelected:(ids:number[])=>void; options:Lawyer[]}){
    const [open,setOpen]=useState(false);
    function toggle(id:number){
      if(selected.includes(id)) setSelected(selected.filter(x=>x!==id));
      else setSelected([...selected,id]);
    }
    return (
      <div className="relative inline-block w-56">
        <button type="button" onClick={()=>setOpen(!open)} className="border px-2 py-1 rounded w-full text-left">
          {selected.length?`${selected.length} selected`:'Select lawyers'}
        </button>
        {open && (
          <div className="absolute z-10 bg-white border rounded shadow max-h-52 overflow-auto w-full mt-1">
            {options.map(opt=> (
              <label key={opt.id} className="flex items-center px-2 py-1 gap-2 hover:bg-gray-100 cursor-pointer text-sm">
                <input type="checkbox" checked={selected.includes(opt.id)} onChange={()=>toggle(opt.id)} />
                <span>{opt.name}</span>
              </label>
            ))}
          </div>
        )}
      </div>
    );
  }

  const [editing, setEditing] = useState<Lawyer | null>(null);
  const [editData, setEditData] = useState<any>({});
  const [editManagedIds, setEditManagedIds] = useState<number[]>([]);
  

  useEffect(() => {
    fetchAll();
  }, []);

  async function fetchAll() {
    const [lwRes, posRes] = await Promise.all([fetch("/api/lawyers"), fetch("/api/positions")]);
    setLawyers(await lwRes.json());
    setPositions(await posRes.json());
  }

  async function addLawyer() {
    if (!name || !email || !password) return toast.error("Name, Email, Password required");
    const res = await fetch("/api/lawyers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, positionId: positionId || undefined, phone, address, password, role, managedLawyerIds: role === 'LAWYER_MANAGER' ? managedIds : undefined }),
    });
    if (res.ok) {
      toast.success("Lawyer added");
      setName("");
      setEmail("");
      setPhone("");
      setAddress("");
      setPassword("");
      setPositionId("");
      fetchAll();
    } else {
      const err = await res.json();
      toast.error(err.error || "Failed");
    }
  }

  return (
    <> 
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Lawyers</h1>

      {/* Add form */}
      <div className="flex gap-2 mb-6 flex-wrap items-end">
        <div>
          <label className="block text-sm">Name</label>
          <input value={name} onChange={(e) => setName(e.target.value)} className="border px-2 py-1 rounded" />
        </div>
        <div>
          <label className="block text-sm">Email</label>
          <input value={email} onChange={(e) => setEmail(e.target.value)} className="border px-2 py-1 rounded" />
        </div>
        <div>
          <label className="block text-sm">Position</label>
          <select
            value={positionId}
            onChange={(e) => setPositionId(e.target.value ? Number(e.target.value) : "")}
            className="border px-2 py-1 rounded"
          >
            <option value="">None</option>
            {positions.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm">Phone</label>
          <input value={phone} onChange={(e) => setPhone(e.target.value)} className="border px-2 py-1 rounded" />
        </div>
        <div>
          <label className="block text-sm">Address</label>
          <input value={address} onChange={(e) => setAddress(e.target.value)} className="border px-2 py-1 rounded w-56" />
        </div>
        <div>
          <label className="block text-sm">Role</label>
          <select value={role} onChange={(e)=>setRole(e.target.value)} className="border px-2 py-1 rounded">
            {ROLES.map(r=> <option key={r.value} value={r.value}>{r.label}</option>)}
          </select>
        </div>
        {role === 'LAWYER_MANAGER' && (
          <div>
            <label className="block text-sm mb-1">Managed Lawyers</label>
            <MultiSelectDropdown
              selected={managedIds}
              setSelected={setManagedIds}
              options={lawyers.filter(l => l.role !== 'LAWYER_MANAGER')}
            />
          </div>
        )}
        )}
        <div>
          <label className="block text-sm">Password</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="border px-2 py-1 rounded" />
        </div>
        <button onClick={addLawyer} className="bg-blue-600 text-white px-4 py-2 rounded h-9">
          Add
        </button>
      </div>

      {/* Table */}
      <table className="w-full bg-white shadow rounded">
        <thead className="bg-gray-100 text-left">
          <tr>
            <th className="px-4 py-2">ID</th>
            <th className="px-4 py-2">Name</th>
            <th className="px-4 py-2">Email</th>
            <th className="px-4 py-2">Phone</th>
            <th className="px-4 py-2">Address</th>
            <th className="px-4 py-2">Position</th>
            <th className="px-4 py-2">Role</th>
          </tr>
        </thead>
        <tbody>
          {lawyers.map((l) => (
            <tr key={l.id} className="border-t cursor-pointer hover:bg-gray-50" onClick={() => openEdit(l)}>
              <td className="px-4 py-2 text-sm text-gray-600">{l.id}</td>
              <td className="px-4 py-2">{l.name}</td>
              <td className="px-4 py-2">{l.email}</td>
              <td className="px-4 py-2">{(l as any).phone ?? "-"}</td>
              <td className="px-4 py-2">{(l as any).address ?? "-"}</td>
              <td className="px-4 py-2">{l.position?.name ?? "-"}</td>
               <td className="px-4 py-2">{l.role}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {editing && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setEditing(null)}>
          <div className="bg-white w-full max-w-md p-6 rounded shadow" onClick={(e)=>e.stopPropagation()}>
            <h2 className="text-xl font-semibold mb-4">Edit Lawyer</h2>
            {renderEditForm()}
          </div>
        </div>
      )}
    </div>

    
    </> 
  );
}
