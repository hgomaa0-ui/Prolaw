"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";

interface Permission {
  code: string;
  name: string;
}

interface Props {
  lawyerId: number | null;
  open: boolean;
  onClose: () => void;
}

export default function PermissionsDrawer({ lawyerId, open, onClose }: Props) {
  const [allPermissions, setAllPermissions] = useState<Permission[]>([]);
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);

  // fetch all perms once
  useEffect(() => {
    if (!open) return;
    (async () => {
      const res = await fetch("/api/permissions");
      if (res.ok) {
        const list: Permission[] = await res.json();
        setAllPermissions(list.filter(p => !/^\d+$/.test(p.code)));
      }
    })();
  }, [open]);

  // fetch user perms when lawyerId changes
  useEffect(() => {
    if (!open || !lawyerId) return;
    (async () => {
      const res = await fetch(`/api/users/${lawyerId}/permissions`);
      if (res.ok) {
        const list: Array<{ code: string; allowed: boolean }> = await res.json();
        const obj: Record<string, boolean> = {};
        list.forEach((p) => {
          if (p.allowed) obj[p.code] = true;
        });
        setChecked(obj);
      } else {
        setChecked({});
      }
    })();
  }, [lawyerId, open]);

  const toggle = (code: string) => {
    if (/^\d+$/.test(code)) return; // ignore numeric placeholder codes
    setChecked((p) => ({ ...p, [code]: !p[code] }));
  };

  const save = async () => {
    if (!lawyerId) return;
    setLoading(true);
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    const res = await fetch(`/api/users/${lawyerId}/permissions`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        permissions: Object.fromEntries(
          Object.entries(checked).filter(([k]) => !/^\d+$/.test(k))
        ),
      }),
    });
    setLoading(false);
    if (res.ok) {
      toast.success("Permissions updated");
      onClose();
    } else {
      let errMsg = "Failed";
      try {
        const err = await res.json();
        errMsg = err.error || errMsg;
      } catch (_) {}
      toast.error(errMsg);
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-end bg-black/40"
      onClick={onClose}
    >
      <div
        className="bg-white w-full max-w-sm h-full p-6 overflow-y-auto shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-xl font-semibold mb-4">Permissions</h2>

        <div className="space-y-2">
          {allPermissions.map((perm) => (
            <label key={perm.code} className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={!!checked[perm.code]}
                onChange={() => toggle(perm.code)}
              />
              <span>{perm.name}</span>
            </label>
          ))}
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <button
            onClick={onClose}
            className="px-3 py-1 border rounded"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            onClick={save}
            className="px-3 py-1 bg-green-600 text-white rounded"
            disabled={loading}
          >
            {loading ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
