export interface Project {
  id: string;
  name: string;
  clientId: string;
  description: string;
  startDate: string;
  endDate: string | null;
  status: 'ACTIVE' | 'COMPLETED' | 'PAUSED';
  createdAt: string;
  updatedAt: string;
}

export interface ProjectSelectOption {
  value: string;
  label: string;
  clientId: string;
}
