/* eslint-disable react-hooks/exhaustive-deps */
"use client";
import { useEffect, useState } from "react";
import { getAuth } from "@/lib/auth";
import Image from "next/image";

interface Company {
  id: number;
  name: string;
  address?: string;
  phone?: string;
  logoUrl?: string;
}

export default function CompanySettings() {
  const [company, setCompany] = useState<Company | null>(null);
  const [form, setForm] = useState({ name: "", address: "", phone: "" });
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const token = getAuth();

  useEffect(() => {
    fetch("/api/company", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((data: Company) => {
        setCompany(data);
        setForm({
          name: data.name ?? "",
          address: data.address ?? "",
          phone: data.phone ?? "",
        });
      });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!company) return;
    setSaving(true);
    const fd = new FormData();
    fd.append("name", form.name);
    fd.append("address", form.address);
    fd.append("phone", form.phone);
    if (logoFile) fd.append("logo", logoFile);
    const res = await fetch("/api/company", {
      method: "PUT",
      headers: { Authorization: `Bearer ${token}` },
      body: fd,
    });
    if (res.ok) {
      const updated = await res.json();
      setCompany(updated);
      alert("Saved successfully");
    } else {
      alert("Save failed");
    }
    setSaving(false);
  };

  if (!company) return <p className="p-8">Loading...</p>;

  return (
    <div className="container mx-auto max-w-xl p-6">
      <h1 className="text-2xl font-bold mb-6">Company Information</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block mb-1">Company Name</label>
          <input
            className="w-full border rounded p-2"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />
        </div>
        <div>
          <label className="block mb-1">Address</label>
          <input
            className="w-full border rounded p-2"
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
          />
        </div>
        <div>
          <label className="block mb-1">Phone Number</label>
          <input
            className="w-full border rounded p-2"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
          />
        </div>
        <div>
          <label className="block mb-1">Company Logo</label>
          {company.logoUrl && (
            <Image
              src={company.logoUrl}
              alt="Logo"
              width={120}
              height={120}
              className="mb-2 border"
            />
          )}
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setLogoFile(e.target.files?.[0] || null)}
          />
        </div>
        <button
          type="submit"
          className="bg-blue-600 text-white px-6 py-2 rounded disabled:opacity-50"
          disabled={saving}
        >
          {saving ? "Saving..." : "Save"}
        </button>
      </form>
    </div>
  );
}
