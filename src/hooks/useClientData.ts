import { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { getAuth } from '@/lib/auth';
import { Client } from '@/types/client';
import { Project } from '@/types/project';

interface UseClientDataReturn {
  client: Client | null;
  projects: Project[];
  loading: boolean;
  error: string | null;
  deleteClient: () => Promise<boolean>;
  deleteProject: (projectId: string) => Promise<boolean>;
}

export function useClientData(clientId?: number): UseClientDataReturn {
  const [client, setClient] = useState<Client | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const token = getAuth();

  const fetchClient = useCallback(async () => {
    if (!clientId) return;
    try {
      setLoading(true);
      const res = await fetch(`/api/clients/${clientId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to fetch client');
      const data = (await res.json()) as Client;
      setClient(data);
      setError(null);
    } catch (err) {
      console.error(err);
      setError('Failed to load client');
    } finally {
      setLoading(false);
    }
  }, [clientId, token]);

  const fetchProjects = useCallback(async () => {
    if (!clientId) return;
    try {
      const res = await fetch(`/api/clients/${clientId}/projects`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to fetch projects');
      const data = (await res.json()) as Project[];
      setProjects(data);
    } catch (err) {
      console.error(err);
      setError('Failed to load projects');
    }
  }, [clientId, token]);

  useEffect(() => {
    fetchClient();
    fetchProjects();
  }, [fetchClient, fetchProjects]);

  const deleteClient = useCallback(async (): Promise<boolean> => {
    if (!clientId) return false;
    if (!window.confirm('Are you sure you want to delete this client?')) return false;
    try {
      const res = await fetch(`/api/clients/${clientId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to delete client');
      toast.success('Client deleted successfully');
      return true;
    } catch (err) {
      console.error(err);
      toast.error('Failed to delete client');
      return false;
    }
  }, [clientId, token]);

  const deleteProject = useCallback(
    async (projectId: string): Promise<boolean> => {
      if (!window.confirm('Are you sure you want to delete this project?')) return false;
      try {
        const res = await fetch(`/api/projects/${projectId}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('Failed to delete project');
        toast.success('Project deleted successfully');
        // refresh list
        fetchProjects();
        return true;
      } catch (err) {
        console.error(err);
        toast.error('Failed to delete project');
        return false;
      }
    },
    [token, fetchProjects]
  );

  return { client, projects, loading, error, deleteClient, deleteProject };
}
