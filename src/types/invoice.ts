export interface InvoiceItem {
  id: number;
  itemType: 'TIME' | 'EXPENSE' | 'CUSTOM';
  description: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

import { Client } from './client';
import { Project } from './project';

export interface Invoice {
  id: string;
  invoiceNumber: string;
  clientId: string;
  projectId: string;
  client: Client | null;
  project: Project | null;
  issueDate: string;
  dueDate: string | null;
  status: 'DRAFT' | 'SENT' | 'PAID';
  items: InvoiceItem[];
  subtotal: number;
  discount: number;
  tax: number;
  trustDeducted?: number;
  language: 'EN' | 'AR';
  currency: 'USD' | 'EGP' | 'EUR';
  bankId?: number;
  total: number;
  notes?: string;
  terms?: string;
}

export interface InvoicePageProps {
  params: {
    id: string;
  };
}
