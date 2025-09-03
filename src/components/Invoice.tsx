"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { prisma } from "@/lib/prisma";

interface Invoice {
  id: number;
  projectId: number;
  clientName: string;
  clientEmail: string;
  issueDate: Date;
  dueDate: Date;
  items: InvoiceItem[];
  status: "draft" | "sent" | "paid" | "overdue";
  amount: number;
}

interface InvoiceItem {
  description: string;
  quantity: number;
  rate: number;
  amount: number;
}

export default function Invoice({ invoice }: { invoice: Invoice }) {
  const [editing, setEditing] = useState(false);
  const [editingItem, setEditingItem] = useState<number | null>(null);
  const [newItem, setNewItem] = useState<InvoiceItem | null>(null);
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedProject, setSelectedProject] = useState<number | null>(invoice.projectId || null);

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) return;
        
        const res = await fetch("/api/projects", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (res.ok) {
          setProjects(data);
        }
      } catch (error) {
        console.error("Failed to fetch projects:", error);
      }
    };
    fetchProjects();
  }, []);

  useEffect(() => {
    if (editingItem !== null) {
      setNewItem(invoice.items[editingItem]);
    }
  }, [editingItem, invoice.items]);

  const handleSaveItem = async () => {
    if (!newItem) return;
    
    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      const res = await fetch(`/api/invoices/${invoice.id}/items`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          index: editingItem,
          item: newItem,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update item");
      
      setEditingItem(null);
      setNewItem(null);
    } catch (error) {
      alert("Failed to update item: " + error);
    }
  };

  const handleAddItem = () => {
    setEditingItem(null);
    setNewItem({
      description: "",
      quantity: 1,
      rate: 0,
      amount: 0,
    });
    setEditing(true);
  };

  const handleDeleteItem = async (index: number) => {
    if (!confirm("Delete this item?")) return;

    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      const res = await fetch(`/api/invoices/${invoice.id}/items/${index}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete item");
    } catch (error) {
      alert("Failed to delete item: " + error);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow">
      {/* Header */}
      <div className="border-b pb-4 mb-6">
        <h1 className="text-2xl font-bold mb-2">Invoice #{invoice.id}</h1>
        <div className="flex justify-between items-center">
          <div>
            <p className="text-gray-600">Client: {invoice.clientName}</p>
            <p className="text-gray-600">Email: {invoice.clientEmail}</p>
          </div>
          <div className="text-right">
            <p className="text-gray-600">
              Issue Date: {format(invoice.issueDate, "MMM dd, yyyy")}
            </p>
            <p className="text-gray-600">
              Due Date: {format(invoice.dueDate, "MMM dd, yyyy")}
            </p>
          </div>
        </div>
      </div>

      {/* Project Selection */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Select Project
        </label>
        <select
          value={selectedProject || ""}
          onChange={(e) => setSelectedProject(Number(e.target.value))}
          className="w-full p-2 border rounded"
        >
          <option value="">Select a project</option>
          {projects.map((project) => (
            <option key={project.id} value={project.id}>
              {project.name} - {project.clientName}
            </option>
          ))}
        </select>
      </div>

      {/* Items */}
      <div className="space-y-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Invoice Items</h2>
          <button
            onClick={handleAddItem}
            className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
          >
            Add Item
          </button>
        </div>

        <div className="space-y-4">
          {invoice.items.map((item, index) => (
            <div
              key={index}
              className={`p-4 border rounded ${
                editingItem === index ? "bg-blue-50" : ""
              }`}
            >
              {editingItem === index ? (
                <div className="space-y-2">
                  <input
                    type="text"
                    value={newItem?.description || ""}
                    onChange={(e) =>
                      setNewItem({
                        ...newItem!,
                        description: e.target.value,
                      })
                    }
                    className="w-full p-2 border rounded"
                    placeholder="Item description"
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">
                        Quantity
                      </label>
                      <input
                        type="number"
                        value={newItem?.quantity || ""}
                        onChange={(e) =>
                          setNewItem({
                            ...newItem!,
                            quantity: Number(e.target.value),
                          })
                        }
                        className="w-full p-2 border rounded"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">
                        Rate
                      </label>
                      <input
                        type="number"
                        value={newItem?.rate || ""}
                        onChange={(e) =>
                          setNewItem({
                            ...newItem!,
                            rate: Number(e.target.value),
                          })
                        }
                        className="w-full p-2 border rounded"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end space-x-2">
                    <button
                      onClick={() => {
                        setEditingItem(null);
                        setNewItem(null);
                      }}
                      className="rounded bg-gray-200 px-4 py-2 hover:bg-gray-300"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSaveItem}
                      className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
                    >
                      Save
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-medium">{item.description}</p>
                    <p className="text-sm text-gray-600">
                      {item.quantity} × {formatCurrency(item.rate)}
                    </p>
                  </div>
                  <div className="flex items-center space-x-4">
                    <span className="font-semibold">
                      {formatCurrency(item.amount)}
                    </span>
                    <button
                      onClick={() => setEditingItem(index)}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteItem(index)}
                      className="text-red-600 hover:text-red-800"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Summary */}
      <div className="mt-8 border-t pt-6">
        <div className="flex justify-between">
          <div>
            <p className="text-gray-600">Subtotal:</p>
            <p className="text-gray-600">Tax (15%):</p>
            <p className="text-gray-600">Total:</p>
          </div>
          <div className="text-right">
            <p className="text-gray-600">{formatCurrency(invoice.amount)}</p>
            <p className="text-gray-600">
              {formatCurrency(invoice.amount * 0.15)}
            </p>
            <p className="font-bold text-xl">
              {formatCurrency(invoice.amount * 1.15)}
            </p>
          </div>
        </div>
      </div>

      {/* Status */}
      <div className="mt-8">
        <p className="text-lg font-semibold mb-2">Status:</p>
        <div className="flex items-center">
          <span
            className={`px-4 py-2 rounded-full text-sm font-medium ${
              invoice.status === "draft"
                ? "bg-blue-100 text-blue-800"
                : invoice.status === "sent"
                ? "bg-green-100 text-green-800"
                : invoice.status === "paid"
                ? "bg-purple-100 text-purple-800"
                : "bg-red-100 text-red-800"
            }`}
          >
            {invoice.status.toUpperCase()}
          </span>
        </div>
      </div>
    </div>
  );
}
