'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast, Toaster } from 'react-hot-toast';
import { getAuth } from '@/lib/auth';
import { Client } from '@/types/client';

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [tempName, setTempName] = useState('');
  const [tempEmail, setTempEmail] = useState('');
  const [tempPhone, setTempPhone] = useState('');
  const router = useRouter();
  const token = getAuth();

  // ---------------- API helpers ----------------
  const fetchClients = async () => {
    try {
      const res = await fetch('/api/clients', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to fetch clients');
      const data = await res.json();
      setClients(data);
    } catch (err) {
      console.error(err);
      setError('Failed to load clients');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this client?')) return;
    try {
      const auth = getAuth();
      if (!auth) {
        toast.error('Not logged in');
        return;
      }
      const res = await fetch(`/api/clients/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${auth}` },
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Failed to delete (HTTP ${res.status})`);
      }
      toast.success('Client deleted');
      setClients(prev => prev.filter(c => c.id !== id));
    } catch (err) {
      console.error(err);
      toast.error((err as Error).message || 'Delete failed');
    }
  };

  const saveEdit = async (id: string) => {
    if (!tempName.trim()) return;
    const payload: Record<string, string> = { name: tempName.trim() };
    if (tempEmail.trim()) payload.contactEmail = tempEmail.trim();
    if (tempPhone.trim()) payload.phone = tempPhone.trim();
    try {
      const res = await fetch(`/api/clients/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Failed to update (HTTP ${res.status})`);
      }
      toast.success('Client updated');
      setClients(prev => prev.map(c => c.id === id ? { ...c, name: tempName.trim(), contactEmail: tempEmail.trim(), phone: tempPhone.trim() } : c));
    } catch (err) {
      console.error(err);
      toast.error('Update failed');
    } finally {
      cancelEdit();
    }
  };

  useEffect(() => {
    fetchClients();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startEdit = (c: Client) => {
    setEditingId(c.id);
    setTempName(c.name);
    setTempEmail(c.contactEmail || "");
    setTempPhone(c.phone || "");
  };

  const cancelEdit = () => {
    setEditingId(null);
    setTempName('');
    setTempEmail('');
    setTempPhone('');
  };

  return (
    <div className="container mx-auto p-6">
      <Toaster />
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Clients</h1>
        <button
          onClick={() => router.push('/dashboard/clients/new')}
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
        >
          Add New Client
        </button>
      </div>

      {loading && (
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
        </div>
      )}

      {error && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-4">
          <h3 className="font-medium text-red-800">Error</h3>
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {!loading && !error && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Phone
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {clients.map((client) => (
                <tr key={client.id} className="hover:bg-gray-50">
                  {/* Name cell */}
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {editingId === client.id ? (
                      <input
                        value={tempName}
                        onChange={(e) => setTempName(e.target.value)}
                        className="border rounded px-2 py-1 text-sm w-full"
                      />
                    ) : (
                      client.name
                    )}
                  </td>

                  {/* Email */}
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {editingId === client.id ? (
                      <input
                        value={tempEmail}
                        onChange={(e) => setTempEmail(e.target.value)}
                        className="border rounded px-2 py-1 text-sm w-full"
                      />
                    ) : (
                      client.contactEmail || 'N/A'
                    )}
                  </td>

                  {/* Phone */}
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {editingId === client.id ? (
                      <input
                        value={tempPhone}
                        onChange={(e) => setTempPhone(e.target.value)}
                        className="border rounded px-2 py-1 text-sm w-full"
                      />
                    ) : (
                      client.phone || 'N/A'
                    )}
                  </td>

                  {/* Actions */}
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    {editingId === client.id ? (
                      <>
                        <button
                          onClick={() => saveEdit(client.id)}
                          className="text-green-600 hover:text-green-800 mr-2"
                        >
                          Save
                        </button>
                        <button
                          onClick={cancelEdit}
                          className="text-gray-600 hover:text-gray-800"
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <>
                        <Link
                          href={`/clients/${client.id}`}
                          className="text-blue-600 hover:text-blue-900 mr-4"
                        >
                          View
                        </Link>
                        <button
                          onClick={() => startEdit(client)}
                          className="text-blue-600 hover:text-blue-900 mr-4"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(client.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          Delete
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {clients.length === 0 && (
            <p className="text-center py-6 text-sm text-gray-600">
              No clients found.
            </p>
          )}
        </div>
      )}
    </div>
  );
}