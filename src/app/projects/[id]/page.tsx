"use client";

import { useEffect, useState } from "react";
import useSWR from "swr";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { toast, Toaster } from "react-hot-toast";
import { getAuth } from "@/lib/auth";

interface Payment {
  id: number;
  amount: number;
  currency: string;
  bank?: { id: number; name: string } | null;
  paidOn: string;
  notes: string | null;
  accountType: "TRUST" | "EXPENSE";
}

export default function ProjectDetailPage() {
  const params = useParams();
  const projectId = Number(params?.id);
  if (Number.isNaN(projectId)) return <div className="p-6 text-red-600">Invalid project ID</div>;

  interface Attachment {
    id: number;
    url: string;
    type: string;
    createdAt: string;
  }

  const router = useRouter();
  const token = getAuth();

  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);

  /* attachments */
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [attType, setAttType] = useState<"POWER_OF_ATTORNEY" | "CONTRACT" | "OTHER">("OTHER");
  const [attFiles, setAttFiles] = useState<FileList | null>(null);

  /* add-payment form */
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [notes, setNotes] = useState("");
  const [bankId, setBankId] = useState<number | "">("");
  const { data: banks } = useSWR("/api/banks", (url: string) =>
    fetch(url, { headers: token ? { Authorization: `Bearer ${token}` } : {} }).then((r) => r.json())
  );
  const [accountType, setAccountType] = useState<"TRUST" | "EXPENSE">("TRUST");
  const [editId, setEditId] = useState<number | null>(null);

  /* ---------- helpers ---------- */
  const fetchPayments = async () => {
    try {
      const res = await fetch(`/api/advance-payments?projectId=${projectId}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      if (!res.ok) throw new Error("Failed fetch");
      setPayments(await res.json());
    } catch {
      toast.error("Failed to load payments");
    } finally {
      setLoading(false);
    }
  };

  const fetchAttachments = async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}/attachments`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) setAttachments(await res.json());
    } catch (e) {
      console.error(e);
    }
  };

  const uploadAttachments = async () => {
    if (!attFiles || attFiles.length === 0) return;
    const fd = new FormData();
    Array.from(attFiles).forEach((f) => fd.append("files", f));
    fd.append("type", attType);
    const res = await fetch(`/api/projects/${projectId}/attachments`, {
      method: "POST",
      body: fd,
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (res.ok) {
      toast.success("Uploaded");
      setAttFiles(null);
      fetchAttachments();
    } else toast.error("Upload failed");
  };

  const submitPayment = async () => {
    if (!amount) return;
    try {
      const endpoint = editId ? `/api/advance-payments/${editId}` : `/api/advance-payments`;
      const method = editId ? "PUT" : "POST";
      const res = await fetch(endpoint, {
        method,
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          projectId,
          amount: parseFloat(amount),
          currency,
          accountType,
          notes: notes.trim() || null,
          bankId: bankId || null,
        }),
      });
      if (!res.ok) throw new Error(editId ? "Failed update" : "Failed add");
      toast.success(editId ? "Payment updated" : "Payment added");
      setAmount("");
      setNotes("");
      setEditId(null);
      fetchPayments();
    } catch {
      toast.error("Add failed");
    }
  };
  /* -------------------------------- */

  useEffect(() => {
    fetchPayments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="container mx-auto p-6 max-w-3xl">
      <Toaster />
      <h1 className="text-2xl font-bold mb-4">Advance Payments</h1>
      <p className="mb-6 text-sm text-gray-600">Project ID: {projectId}</p>

      {/* Add payment form */}
      {/* ---------- (الكود كما كان) ---------- */}

      {/* Attachments */}
      {/* ---------- (الكود كما كان) ---------- */}

      {/* Payments table */}
      {loading ? (
        <p>Loading…</p>
      ) : (
        <div className="overflow-x-auto">
          {/* جدول الدفعات (كما هو) */}
        </div>
      )}

      <p className="mt-6 text-sm text-gray-600">
        <Link href="/projects" className="text-blue-600 underline">
          ← Back to Projects
        </Link>
      </p>
    </div>
  );
}