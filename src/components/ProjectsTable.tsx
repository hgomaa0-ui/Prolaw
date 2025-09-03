import { Project } from '@/types/project';

interface Props {
  projects: Project[];
  onEdit: (projectId: string) => void;
  onDelete: (projectId: string) => void;
}

export default function ProjectsTable({ projects, onEdit, onDelete }: Props) {
  return (
    <div>
      <h2 className="text-lg font-semibold mb-4">Projects</h2>
      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead>
            <tr>
              <HeaderCell>Project Name</HeaderCell>
              <HeaderCell>Status</HeaderCell>
              <HeaderCell>Hourly Rate</HeaderCell>
              <HeaderCell alignRight>Actions</HeaderCell>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {projects.map((project) => (
              <tr key={project.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {project.name}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span
                    className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      project.status === 'ACTIVE'
                        ? 'bg-green-100 text-green-800'
                        : project.status === 'COMPLETED'
                        ? 'bg-gray-100 text-gray-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}
                  >
                    {project.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {project as any}.hourlyRate ? `$${(project as any).hourlyRate}` : 'N/A'
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <button onClick={() => onEdit(project.id)} className="text-blue-600 hover:text-blue-900 mr-4">
                    Edit
                  </button>
                  <button onClick={() => onDelete(project.id)} className="text-red-600 hover:text-red-900">
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function HeaderCell({ children, alignRight }: { children: React.ReactNode; alignRight?: boolean }) {
  return (
    <th
      className={`px-6 py-3 border-b border-gray-200 bg-gray-50 text-xs font-medium text-gray-500 uppercase tracking-wider ${
        alignRight ? 'text-right' : 'text-left'
      }`}
    >
      {children}
    </th>
  );
}
