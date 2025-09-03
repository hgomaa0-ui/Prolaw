'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Invoice, InvoiceItem } from '@/types/invoice';
import { formatMoney } from '@/lib/i18n';
import { format } from 'date-fns';
import { ClientSelectOption, Client } from '@/types/client';
import { ProjectSelectOption, Project } from '@/types/project';
import { Toaster, toast } from 'react-hot-toast';
import { getAuth } from '@/lib/auth';

export default function NewInvoicePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  // Initial form state
  const [invoice, setInvoice] = useState<Partial<Invoice>>({
    invoiceNumber: '',
    clientId: '',
    projectId: '',
    client: null,
    project: null,
    issueDate: '',
    dueDate: '',
    status: 'DRAFT',
    items: [],
    subtotal: 0,
    discount: 0, // percentage
    tax: 0,
    total: 0
  });

  // State for client and project selections
  const [clients, setClients] = useState<ClientSelectOption[]>([]);
  const [projects, setProjects] = useState<ProjectSelectOption[]>([]);
  const [selectedClient, setSelectedClient] = useState<string>('');
  const [selectedProject, setSelectedProject] = useState<string>('');

  // Form handlers
  const handleChange = (field: keyof Invoice, value: any) => {
    setInvoice(prev => {
      const updated = { ...prev, [field]: value };
      if (field === 'discount' || field === 'tax') {
        const { sub, tot } = recalcTotals(
          updated.items as InvoiceItem[],
          field === 'discount' ? Number(value) || 0 : updated.discount || 0,
          field === 'tax' ? Number(value) || 0 : updated.tax || 0
        );
        updated.subtotal = sub;
        updated.total = tot;
      }
      return updated;
    });
  };

  // Fetch clients and projects
  useEffect(() => {
    const fetchClients = async () => {
      try {
        const token = getAuth();
        if (!token) {
          throw new Error('Not authenticated');
        }

        const res = await fetch('/api/clients', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!res.ok) {
          const error = await res.json();
          throw new Error(error.error || 'Failed to fetch clients');
        }

        const data = await res.json();
        setClients(data.map((client: Client) => ({
          value: String(client.id),
          label: client.name
        })));
      } catch (error) {
        console.error('Error fetching clients:', error);
        toast.error(error instanceof Error ? error.message : 'Failed to fetch clients');
      }
    };

    const fetchProjects = async () => {
      try {
        const token = getAuth();
        if (!token) {
          throw new Error('Not authenticated');
        }

        const res = await fetch('/api/projects', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!res.ok) {
          const error = await res.json();
          throw new Error(error.error || 'Failed to fetch projects');
        }

        const data = await res.json();
        setProjects(data.map((project: Project) => ({
          value: String(project.id),
          label: project.name,
          clientId: String(project.clientId)
        })));
      } catch (error) {
        console.error('Error fetching projects:', error);
        toast.error(error instanceof Error ? error.message : 'Failed to fetch projects');
      }
    };

    fetchClients();
    fetchProjects();
  }, []);

  // Handle client selection
  const handleClientSelect = (clientId: string) => {
    setSelectedClient(clientId);
    setInvoice(prev => ({
      ...prev,
      clientId,
      project: null, // Reset project when client changes
      projectId: ''
    }));
  };

  // Handle project selection
  const handleProjectSelect = (projectId: string) => {
    setSelectedProject(projectId);
    setInvoice(prev => ({
      ...prev,
      projectId
    }));
  };

  // Filter projects based on selected client
  const filteredProjects = projects.filter(project => 
    !selectedClient || project.clientId === selectedClient
  );

  // Update totals when discount or tax change
  useEffect(() => {
    const { sub, tot } = recalcTotals(invoice.items as any, invoice.discount || 0, invoice.tax || 0);
    if (invoice.subtotal !== sub || invoice.total !== tot) {
      setInvoice(prev => ({ ...prev, subtotal: sub, total: tot }));
    }
  }, [invoice.discount, invoice.tax, invoice.items]);

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (!invoice.invoiceNumber || !invoice.clientId || !invoice.projectId || !invoice.issueDate) {
        throw new Error('Please fill in all required fields');
      }

      // Create the invoice object with proper types
      const invoiceData: Partial<Invoice> = {
        clientId: parseInt(invoice.clientId),
        invoiceNumber: invoice.invoiceNumber,
        issueDate: invoice.issueDate,
        dueDate: invoice.dueDate || null,
        status: invoice.status || 'DRAFT',
        items: invoice.items?.map(item => ({
          id: item.id,
          description: item.description,
          quantity: parseFloat(item.quantity.toString()),
          unitPrice: parseFloat(item.unitPrice.toString()),
          lineTotal: parseFloat(item.lineTotal.toString())
        })) || [],
        subtotal: parseFloat(invoice.subtotal?.toString() || '0'),
        discount: parseFloat(invoice.discount?.toString() || '0'),
        tax: parseFloat(invoice.tax?.toString() || '0'),
        total: parseFloat(invoice.total?.toString() || '0'),
        language: invoice.language,
        currency: invoice.currency
      };

      console.log('Invoice data being sent:', invoiceData);

      const token = getAuth();
      if (!token) {
        throw new Error('Not authenticated');
      }

      const response = await fetch('/api/invoices', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(invoiceData)
      });

      console.log('API Response Status:', response.status);
      console.log('API Response Headers:', Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        const errorData = await response.json();
        console.error('API Error Response:', errorData);
        throw new Error(errorData.error || 'Failed to create invoice');
      }

      toast.success('Invoice created successfully');
      router.push('/invoices');
    } catch (error) {
      console.error('Error creating invoice:', error);
      toast.error('Failed to create invoice');
    } finally {
      setLoading(false);
    }
  };

  const handleAddItem = () => {
    setInvoice(prev => ({
      ...prev,
      items: [...prev.items, {
        id: Date.now(),
        description: '',
        quantity: 1,
        unitPrice: 0,
        lineTotal: 0
      }]
    }));
  };

  const handleRemoveItem = (id: number) => {
    setInvoice(prev => ({
      ...prev,
      items: prev.items.filter(item => item.id !== id)
    }));
  };

  const recalcTotals = (items: InvoiceItem[] = [], discPercent: number = 0, tx: number = 0) => {
    const sub = items.reduce((sum, it) => sum + (it.quantity * it.unitPrice), 0);
    const discountAmt = sub * (discPercent / 100);
    const tot = sub - discountAmt + tx;
    return { sub, tot };
  };

  const handleItemChange = (index: number, field: keyof InvoiceItem, value: any) => {
    setInvoice(prev => {
      const newItems = (prev.items || []).map((item, i) => {
        const updated = i === index ? { ...item, [field]: value } : item;
        const qty = Number(updated.quantity) || 0;
        const price = Number(updated.unitPrice) || 0;
        updated.lineTotal = qty * price;
        return updated;
      });
      const { sub, tot } = recalcTotals(newItems, prev.discount || 0, prev.tax || 0);
      return { ...prev, items: newItems, subtotal: sub, total: tot };
    });
  };



  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">New Invoice</h1>
        <button
          onClick={() => router.push('/dashboard/invoices')}
          className="text-blue-600 underline text-sm"
        >
          ← Back
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Client and Project Selection */}
        <div>
          <h2 className="font-semibold mb-4">Client and Project</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Select Client
              </label>
              <select
                value={selectedClient}
                onChange={(e) => handleClientSelect(e.target.value)}
                className="w-full px-3 py-2 border rounded-md"
                required
              >
                <option value="">Select a client...</option>
                {clients.map(client => (
                  <option key={client.value} value={client.value}>
                    {client.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Select Project
              </label>
              <select
                value={selectedProject}
                onChange={(e) => handleProjectSelect(e.target.value)}
                className="w-full px-3 py-2 border rounded-md"
                required
              >
                <option value="">Select a project...</option>
                {filteredProjects.map(project => (
                  <option key={project.value} value={project.value}>
                    {project.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Language & Currency */}
        <div>
          <h2 className="font-semibold mb-4">Localization</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Invoice Language</label>
              <select
                value={invoice.language}
                onChange={(e)=>handleChange('language' as any, e.target.value)}
                className="w-full px-3 py-2 border rounded-md"
              >
                <option value="EN">English</option>
                <option value="AR">العربية</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Currency</label>
              <select
                value={invoice.currency}
                onChange={(e)=>handleChange('currency' as any, e.target.value)}
                className="w-full px-3 py-2 border rounded-md"
              >
                <option value="USD">USD $</option>
                <option value="EGP">EGP ج.م</option>
                <option value="EUR">EUR €</option>
              </select>
            </div>
          </div>
        </div>

        {/* Invoice Information */}
        <div>
          <h2 className="font-semibold mb-4">Invoice Information</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Invoice Number
              </label>
              <input
                type="text"
                value={invoice.invoiceNumber}
                onChange={(e) => handleChange('invoiceNumber', e.target.value)}
                className="w-full px-3 py-2 border rounded-md"
                required
                placeholder="INV-YYYY-MM-XXXX"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Issue Date
              </label>
              <input
                type="date"
                value={invoice.issueDate}
                onChange={(e) => handleChange('issueDate', e.target.value)}
                className="w-full px-3 py-2 border rounded-md"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Due Date
              </label>
              <input
                type="date"
                value={invoice.dueDate}
                onChange={(e) => handleChange('dueDate', e.target.value)}
                className="w-full px-3 py-2 border rounded-md"
              />
            </div>
          </div>
        </div>

        {/* Invoice Items */}
        <div>
          <h2 className="font-semibold mb-4">Invoice Items</h2>
          <div className="space-y-4">
            {invoice.items.map((item, index) => (
              <div key={item.id} className="grid grid-cols-4 gap-4 border p-4 rounded-md">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <input
                    type="text"
                    value={item.description}
                    onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                    className="w-full px-3 py-2 border rounded-md"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Quantity
                  </label>
                  <input
                    type="number"
                    value={Number.isNaN(item.quantity) ? '' : item.quantity}
                    onChange={(e) => handleItemChange(index, 'quantity', parseInt(e.target.value))}
                    className="w-full px-3 py-2 border rounded-md"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Unit Price {formatMoney(80, invoice.currency, invoice.language)}
                  </label>
                  <input
                    type="number"
                    value={Number.isNaN(item.unitPrice) ? '' : item.unitPrice}
                    onChange={(e) => handleItemChange(index, 'unitPrice', parseFloat(e.target.value))}
                    className="w-full px-3 py-2 border rounded-md"
                    required
                  />
                </div>
                <div className="flex items-end">
                  <button
                    type="button"
                    onClick={() => handleRemoveItem(item.id)}
                    className="text-red-600 hover:text-red-800"
                  >
                    Remove Item
                  </button>
                </div>
              </div>
            ))}
            <button
              type="button"
              onClick={handleAddItem}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              Add Item
            </button>
          </div>
        </div>

        {/* Discount & Tax */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Discount</label>
            <input
              type="number"
              value={invoice.discount ?? ''}
              onChange={(e) => handleChange('discount', parseFloat(e.target.value))}
              className="w-full px-3 py-2 border rounded-md"
              placeholder="0"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tax</label>
            <input
              type="number"
              value={invoice.tax ?? ''}
              onChange={(e) => handleChange('tax', parseFloat(e.target.value))}
              className="w-full px-3 py-2 border rounded-md"
              placeholder="0"
            />
          </div>
        </div>

        {/* Totals Display */}
        <div className="mt-4 text-right space-y-1">
          <p>Subtotal: <span className="font-semibold">{(invoice.subtotal||0).toLocaleString('en-US', { style: 'currency', currency: 'USD' })}</span></p>
          <p>Total: <span className="font-bold text-lg">{(invoice.total||0).toLocaleString('en-US', { style: 'currency', currency: 'USD' })}</span></p>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={loading}
            className="bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700 disabled:opacity-50"
          >
            {loading ? 'Creating...' : 'Create Invoice'}
          </button>
        </div>
      </form>

      <Toaster position="top-right" />
    </div>
  );
}
