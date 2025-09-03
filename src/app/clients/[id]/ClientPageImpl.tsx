'use client';
import { Toaster } from 'react-hot-toast';
import { useRouter, useParams } from 'next/navigation';
import { useClientData } from '@/hooks/useClientData';
import ClientInfo from '@/components/ClientInfo';
import ProjectsTable from '@/components/ProjectsTable';

export default function ClientPageImpl() {
  const router = useRouter();
  const params = useParams();
  const id = Number((params as { id?: string }).id);

  const { client, projects, loading, error, deleteClient, deleteProject } = useClientData(id);

  const handleEditClient = () => router.push(`/clients/${id}/edit`);
  const handleDeleteClient = async () => {
    const success = await deleteClient();
    if (success) router.push('/clients');
  };

  if (loading) return <Loading />;
  if (error) return <ErrorAlert message={error} />;
  if (!client) return null;

  return (
    <div className="container mx-auto p-6">
      <Toaster position="top-right" />
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">{client.name}</h1>
          <p className="text-sm text-gray-600">Manage client information and projects</p>
        </div>
        <div className="flex gap-4">
          <button onClick={handleEditClient} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
            Edit Client
          </button>
          <button onClick={handleDeleteClient} className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700">
            Delete Client
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
        <ClientInfo client={client} />
        <ProjectsTable
          projects={projects}
          onEdit={(pid) => router.push(`/projects/${pid}/edit`)}
          onDelete={(pid) => deleteProject(pid)}
        />
      </div>
    </div>
  );
}

function Loading() {
  return (
    <div className="flex items-center justify-center h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
    </div>
  );
}

function ErrorAlert({ message }: { message: string }) {
  return (
    <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-4">
      <div className="flex">
        <div className="flex-shrink-0">
          <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z"
              clipRule="evenodd"
            />
          </svg>
        </div>
        <div className="ml-3">
          <h3 className="text-sm font-medium text-red-800">Error</h3>
          <div className="mt-2 text-sm text-red-700">
            <p>{message}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
