import { useEffect, useState } from 'react';
import clsx from 'clsx';

interface UserPermission {
  page: string; // e.g. "clients" | "projects"
  enabled: boolean;
  clientIds: number[];
  projectIds: number[];
  itemIds: number[]; // for report/settings sub-items
  lawyerIds: number[];
}

interface OptionItem {
  id: number;
  name: string;
}

const PAGES = [
  { key: 'clients', label: 'Clients' },
  { key: 'projects', label: 'Projects' },
  { key: 'invoices', label: 'Invoices' },
  { key: 'expenses', label: 'Expenses' },
  { key: 'reports', label: 'Reports' },
  { key: 'settings', label: 'Settings' },
  { key: 'lawyersPage', label: 'Lawyers' },
];

export default function PermissionsMatrix({
  userId,
  initialPermissions,
  onSave,
}: {
  userId: number;
  initialPermissions: UserPermission[];
  onSave: (perms: UserPermission[]) => void;
}) {
  const [permissions, setPermissions] = useState<UserPermission[]>([]);
  const [clients, setClients] = useState<OptionItem[]>([]);
  const [projects, setProjects] = useState<OptionItem[]>([]);
  const [lawyers, setLawyers] = useState<OptionItem[]>([]);
  const [reportItems, setReportItems] = useState<OptionItem[]>([]);
  const [settingItems, setSettingItems] = useState<OptionItem[]>([]);

  useEffect(() => {
    setPermissions(
      PAGES.map((p) =>
        initialPermissions.find((ip) => ip.page === p.key) || {
          page: p.key,
          enabled: false,
          clientIds: [],
          projectIds: [],
          lawyerIds: [],
          itemIds: [],
        }
      )
    );
  }, [initialPermissions]);

  // load dropdown data once
  useEffect(() => {
    fetch('/api/clients')
      .then(r=>r.json())
      .then(d=>Array.isArray(d)?setClients(d):setClients([]));
    fetch('/api/projects')
      .then(r=>r.json())
      .then(d=>Array.isArray(d)?setProjects(d):setProjects([]));
    fetch('/api/lawyers')
      .then(r=>r.json())
      .then(d=>Array.isArray(d)?setLawyers(d):setLawyers([]));

    fetch('/api/reports')
      .then(r=>r.json())
      .then(d=>Array.isArray(d)?setReportItems(d):setReportItems([]));

    fetch('/api/settings')
      .then(r=>r.json())
      .then(d=>Array.isArray(d)?setSettingItems(d):setSettingItems([]));
  }, []);

  const updatePerm = (idx: number, patch: Partial<UserPermission>) => {
    setPermissions((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], ...patch };
      return next;
    });
  };

  return (
    <div className="space-y-4">
      <style jsx>{`
        /* custom scrollbars */
        ::-webkit-scrollbar { height:8px; width:8px; }
        ::-webkit-scrollbar-thumb { background:#a0aec0; border-radius:4px; }
      `}</style>
      <div className="overflow-x-auto rounded-lg border border-gray-300 shadow-sm">
        <table className="min-w-full border-collapse text-sm">
        <thead className="sticky top-0 z-10 bg-blue-100">
          <tr className="text-left text-xs uppercase tracking-wide text-gray-700">
            <th className="p-2">Page</th>
            <th className="p-2">Enable</th>
            <th className="p-2">Clients</th>
            <th className="p-2">Projects</th>
            <th className="p-2">Items</th>
            <th className="p-2">Lawyers</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {permissions.map((perm, idx) => (
            <tr key={perm.page} className="odd:bg-white even:bg-gray-50 hover:bg-blue-50">
              <td className="p-2">{PAGES.find((p) => p.key === perm.page)?.label}</td>
              <td className="p-2">
                <input
                  type="checkbox"
                  checked={perm.enabled}
                  onChange={(e) =>
                    updatePerm(idx, { enabled: e.target.checked })
                  }
                />
              </td>
              <td className="p-2">
                {['clients','invoices','reports','settings'].includes(perm.page) && (
                  <div className="max-h-32 overflow-y-auto space-y-1 text-xs">
                    {clients.map((c) => (
                      <label key={c.id} className="flex items-center gap-1">
                        <input
                          type="checkbox"
                          checked={perm.clientIds.includes(c.id)}
                          onChange={(e) => {
                            const next = e.target.checked
                              ? [...perm.clientIds, c.id]
                              : perm.clientIds.filter((id) => id !== c.id);
                            updatePerm(idx, { clientIds: next });
                          }}
                        />
                        {c.name}
                      </label>
                    ))}
                  </div>
                )}
              </td>
              <td className="p-2">
                {(['projects','invoices','expenses','reports','settings'].includes(perm.page)) && (
                  <div className="max-h-32 overflow-y-auto space-y-1 text-xs">
                    {projects.map((p) => (
                      <label key={p.id} className="flex items-center gap-1">
                        <input
                          type="checkbox"
                          checked={perm.projectIds.includes(p.id)}
                          onChange={(e) => {
                            const next = e.target.checked
                              ? [...perm.projectIds, p.id]
                              : perm.projectIds.filter((id) => id !== p.id);
                            updatePerm(idx, { projectIds: next });
                          }}
                        />
                        {p.name}
                      </label>
                    ))}
                  </div>
                )}
              </td>
              <td className="p-2">
                {(perm.page === 'reports' || perm.page === 'settings') && (
                  <div className="max-h-32 overflow-y-auto space-y-1 text-xs">
                    {(perm.page === 'reports' ? reportItems : settingItems).map((it) => (
                      <label key={it.id} className="flex items-center gap-1">
                        <input
                          type="checkbox"
                          checked={perm.itemIds.includes(it.id)}
                          onChange={(e) => {
                            const next = e.target.checked
                              ? [...perm.itemIds, it.id]
                              : perm.itemIds.filter((id) => id !== it.id);
                            updatePerm(idx, { itemIds: next });
                          }}
                        />
                        {it.name}
                      </label>
                    ))}
                  </div>
                )}
              </td>
              <td className="p-2">
                {['lawyersPage','reports','settings','invoices'].includes(perm.page) && (
                  <div className="max-h-32 overflow-y-auto space-y-1 text-xs">
                    {lawyers.map((l) => (
                      <label key={l.id} className="flex items-center gap-1">
                        <input
                          type="checkbox"
                          checked={perm.lawyerIds.includes(l.id)}
                          onChange={(e) => {
                            const next = e.target.checked
                              ? [...perm.lawyerIds, l.id]
                              : perm.lawyerIds.filter((id) => id !== l.id);
                            updatePerm(idx, { lawyerIds: next });
                          }}
                        />
                        {l.name}
                      </label>
                    ))}
                  </div>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
      <button
        onClick={() => onSave(permissions)}
        className="rounded bg-blue-600 px-4 py-1 text-sm text-white hover:bg-blue-700"
      >
        Save
      </button>
    </div>
  );
}
