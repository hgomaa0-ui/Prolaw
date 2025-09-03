"use client";

import { useState, useEffect } from 'react';
import { Invoice } from '@/types/invoice';
import { toast } from 'react-hot-toast';
import { getAuth } from '@/utils/auth';
import { Client } from '@/types/client';
import { Project } from '@/types/project';

export const useInvoiceData = (id: string) => {
  const [loading, setLoading] = useState(false);
  const [invoice, setInvoice] = useState<Partial<Invoice> | null>(null);
  const [selectedClient, setSelectedClient] = useState('');
  const [selectedProject, setSelectedProject] = useState('');
  const [clientsData, setClientsData] = useState<Client[]>([]);
  const [projectsData, setProjectsData] = useState<Project[]>([]);
  const filteredProjects = projectsData.filter(p => !selectedClient || String(p.clientId) === selectedClient);

  useEffect(() => {
    if (!id) return;

    const fetchData = async () => {
      try {
        setLoading(true);
        const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
        const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};

        const [invRes, clientsRes, projectsRes] = await Promise.all([
          fetch(`/api/invoices/${id}`, { headers }),
          fetch('/api/clients', { headers }),
          fetch('/api/projects', { headers }),
        ]);

        if (!invRes.ok) throw new Error('Failed to load invoice');
        if (!clientsRes.ok) throw new Error('Failed to load clients');
        if (!projectsRes.ok) throw new Error('Failed to load projects');

        const invoiceData: Invoice = await invRes.json();
        const clients: Client[] = await clientsRes.json();
        const projects: Project[] = await projectsRes.json();

        setInvoice(invoiceData);
        setClientsData(clients);
        setProjectsData(projects);
        setSelectedClient(invoiceData.clientId ? String(invoiceData.clientId) : '');
        setSelectedProject(invoiceData.projectId ? String(invoiceData.projectId) : '');
      } catch (err: any) {
        console.error(err);
        toast.error(err.message || 'Error loading data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  return {
    loading,
    invoice,
    selectedClient,
    selectedProject,
    clientsData,
    projectsData,
    filteredProjects,
    setSelectedClient,
    setSelectedProject
  };
};