"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast, Toaster } from "react-hot-toast";
import Link from "next/link";
import { getAuth } from "@/lib/auth";

interface Client {
  id: number;
  name: string;
}

export default function NewProjectPage() {
  const router = useRouter();
  const token = getAuth();

  const [clients, setClients] = useState<Client[]>([]);
  const [loadingClients, setLoadingClients] = useState(true);

  const [name, setName] = useState("");
  const [clientId, setClientId] = useState<number | "">("");
  const [advanceAmount, setAdvanceAmount] = useState("");
  const [advanceCurrency, setAdvanceCurrency] = useState("USD");
  const [status, setStatus] = useState("OPEN");

  // Billing
  const [billingType, setBillingType] = useState<'HOURS' | 'FIXED'>('HOURS');
  const [rateSource, setRateSource] = useState<'LAWYER' | 'PROJECT'>('LAWYER');
  const [hourlyRate, setHourlyRate] = useState("");
  const [fixedFee, setFixedFee] = useState("");
  const [billingCurrency, setBillingCurrency] = useState("USD");

  useEffect(() => {
    const fetchClients = async () => {
      try {
        const res = await fetch("/api/clients", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error("Failed to fetch clients");
        const data = await res.json();
        setClients(data);
      } catch (err) {
        console.error(err);
        toast.error("Failed to load clients");
      } finally {
        setLoadingClients(false);
      }
    };
    fetchClients();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !clientId) {
      toast.error("Name and client are required");
      return;
    }
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: name.trim(),
          clientId: Number(clientId),
          status,
          advanceAmount: advanceAmount ? parseFloat(advanceAmount) : null,
          advanceCurrency,
          billingType,
          rateSource: billingType === 'HOURS' ? rateSource : null,
          hourlyRate: billingType === 'HOURS' && rateSource === 'PROJECT' && hourlyRate ? parseFloat(hourlyRate) : null,
          fixedFee: billingType === 'FIXED' && fixedFee ? parseFloat(fixedFee) : null,
          billingCurrency: (billingType === 'HOURS' && rateSource === 'PROJECT') || billingType === 'FIXED' ? billingCurrency : null,
        }),
      });
      if (!res.ok) throw new Error("Create failed");
      toast.success("Project created");
      router.push("/projects");
    } catch (err) {
      console.error(err);
      toast.error("Failed to create project");
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-xl">
      <Toaster />
      <h1 className="text-2xl font-bold mb-4">New Project</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Project Name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full border rounded px-3 py-2"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Client</label>
          {loadingClients ? (
            <p>Loading clients…</p>
          ) : (
            <select
              value={clientId}
              onChange={(e) => setClientId(e.target.value ? Number(e.target.value) : "")}
              className="w-full border rounded px-3 py-2"
              required
            >
              <option value="">Select client</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Advance Amount (optional)</label>
          <input
            type="number"
            step="0.01"
            value={advanceAmount}
            onChange={(e) => setAdvanceAmount(e.target.value)}
            className="w-full border rounded px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Currency</label>
          <select
            value={advanceCurrency}
            onChange={(e) => setAdvanceCurrency(e.target.value)}
            className="w-full border rounded px-3 py-2"
          >
            {[
              "USD",
              "EUR",
              "GBP",
              "SAR",
              "EGP",
              "AED",
              "QAR",
              "KWD",
              "OMR",
              "JPY",
              "CNY",
              "INR",
            ].map((code) => (
              <option key={code} value={code}>
                {code}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Status</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="w-full border rounded px-3 py-2"
          >
            <option value="OPEN">OPEN</option>
            <option value="IN_PROGRESS">IN_PROGRESS</option>
            <option value="CLOSED">CLOSED</option>
          </select>
        </div>
        {/* Billing Section */}
        <fieldset className="border p-3 rounded">
          <legend className="text-sm font-medium">Billing</legend>
          <div className="mt-2">
            <label className="block text-sm font-medium mb-1">Billing Type</label>
            <select
              value={billingType}
              onChange={(e)=>setBillingType(e.target.value as 'HOURS'|'FIXED')}
              className="w-full border rounded px-3 py-2"
            >
              <option value="HOURS">Hours</option>
              <option value="FIXED">Fixed Fee</option>
            </select>
          </div>
          {billingType === 'HOURS' && (
            <>
              <div className="mt-3">
                <label className="block text-sm font-medium mb-1">Rate Source</label>
                <select
                  value={rateSource}
                  onChange={(e)=>setRateSource(e.target.value as 'LAWYER'|'PROJECT')}
                  className="w-full border rounded px-3 py-2"
                >
                  <option value="LAWYER">Lawyer Default Rate</option>
                  <option value="PROJECT">Fixed Project Rate</option>
                </select>
              </div>
              {rateSource === 'PROJECT' && (
                <>
                  <div className="mt-3">
                    <label className="block text-sm font-medium mb-1">Hourly Rate</label>
                    <input type="number" step="0.01" value={hourlyRate} onChange={(e)=>setHourlyRate(e.target.value)} className="w-full border rounded px-3 py-2" required />
                  </div>
                  <div className="mt-3">
                    <label className="block text-sm font-medium mb-1">Currency</label>
                    <select value={billingCurrency} onChange={(e)=>setBillingCurrency(e.target.value)} className="w-full border rounded px-3 py-2">
                      {['USD','EUR','GBP','SAR','EGP','AED','QAR','KWD','OMR','JPY','CNY','INR'].map(c=>(<option key={c} value={c}>{c}</option>))}
                    </select>
                  </div>
                </>
              )}
            </>
          )}
          {billingType === 'FIXED' && (
            <>
              <div className="mt-3">
                <label className="block text-sm font-medium mb-1">Fixed Fee</label>
                <input type="number" step="0.01" value={fixedFee} onChange={(e)=>setFixedFee(e.target.value)} className="w-full border rounded px-3 py-2" required />
              </div>
              <div className="mt-3">
                <label className="block text-sm font-medium mb-1">Currency</label>
                <select value={billingCurrency} onChange={(e)=>setBillingCurrency(e.target.value)} className="w-full border rounded px-3 py-2">
                  {['USD','EUR','GBP','SAR','EGP','AED','QAR','KWD','OMR','JPY','CNY','INR'].map(c=>(<option key={c} value={c}>{c}</option>))}
                </select>
              </div>
            </>
          )}
        </fieldset>

        <div className="flex gap-3 pt-4">
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Save
          </button>
          <Link
            href="/projects"
            className="px-4 py-2 border rounded text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
