"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function CrudTest() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<string[]>([]);

  useEffect(() => {
    const storedToken = localStorage.getItem("token");
    if (!storedToken) {
      router.push("/login");
      return;
    }
    setToken(storedToken);
  }, [router]);

  const runTests = async () => {
    if (!token) return;

    try {
      // 1. Test Client CRUD
      await testClientCrud();
      
      // 2. Test Project CRUD
      await testProjectCrud();
      
      // 3. Test Time Entry CRUD
      await testTimeEntryCrud();
      
      setTestResults(prev => [...prev, "All tests completed successfully!"]);
    } catch (error) {
      setTestResults(prev => [...prev, `Test failed: ${error}`]);
    }
  };

  const testClientCrud = async () => {
    const clientName = "Test Client " + Date.now();
    const clientEmail = "test" + Date.now() + "@test.com";

    // Add client
    const res = await fetch("/api/clients", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        name: clientName,
        contactEmail: clientEmail,
        phone: "1234567890",
      }),
    });
    const client = await res.json();
    if (!res.ok) throw new Error(`Failed to add client: ${client.error}`);
    setTestResults(prev => [...prev, "✅ Added client successfully"]);

    // Edit client
    const newName = clientName + " (updated)";
    const res2 = await fetch(`/api/clients/${client.id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ name: newName }),
    });
    const updated = await res2.json();
    if (!res2.ok) throw new Error(`Failed to update client: ${updated.error}`);
    setTestResults(prev => [...prev, "✅ Updated client successfully"]);

    // Delete client
    const res3 = await fetch(`/api/clients/${client.id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res3.json();
    if (!res3.ok) throw new Error(`Failed to delete client: ${data.error}`);
    setTestResults(prev => [...prev, "✅ Deleted client successfully"]);
  };

  const testProjectCrud = async () => {
    const clientName = "Test Client " + Date.now();
    const clientEmail = "test" + Date.now() + "@test.com";

    // First create a client
    const clientRes = await fetch("/api/clients", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        name: clientName,
        contactEmail: clientEmail,
      }),
    });
    const client = await clientRes.json();
    if (!clientRes.ok) throw new Error(`Failed to create test client: ${client.error}`);

    // Create project
    const projectName = "Test Project " + Date.now();
    const res = await fetch("/api/projects", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        name: projectName,
        clientId: client.id,
      }),
    });
    const project = await res.json();
    if (!res.ok) throw new Error(`Failed to add project: ${project.error}`);
    setTestResults(prev => [...prev, "✅ Added project successfully"]);

    // Update project
    const newProjectName = projectName + " (updated)";
    const res2 = await fetch(`/api/projects/${project.id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ name: newProjectName }),
    });
    const updated = await res2.json();
    if (!res2.ok) throw new Error(`Failed to update project: ${updated.error}`);
    setTestResults(prev => [...prev, "✅ Updated project successfully"]);

    // Delete project
    const res3 = await fetch(`/api/projects/${project.id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res3.json();
    if (!res3.ok) throw new Error(`Failed to delete project: ${data.error}`);
    setTestResults(prev => [...prev, "✅ Deleted project successfully"]);

    // Clean up test client
    await fetch(`/api/clients/${client.id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
  };

  const testTimeEntryCrud = async () => {
    // First create a client and project
    const clientName = "Test Client " + Date.now();
    const clientEmail = "test" + Date.now() + "@test.com";
    const clientRes = await fetch("/api/clients", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        name: clientName,
        contactEmail: clientEmail,
      }),
    });
    const client = await clientRes.json();

    const projectName = "Test Project " + Date.now();
    const projectRes = await fetch("/api/projects", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        name: projectName,
        clientId: client.id,
      }),
    });
    const project = await projectRes.json();

    // Create time entry
    const now = new Date();
    const start = new Date(now.getTime() - 3600000); // 1 hour ago
    const end = now;

    const res = await fetch("/api/time-entries", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        projectId: project.id,
        startTs: start.toISOString(),
        endTs: end.toISOString(),
        description: "Test time entry",
      }),
    });
    const entry = await res.json();
    if (!res.ok) throw new Error(`Failed to add time entry: ${entry.error}`);
    setTestResults(prev => [...prev, "✅ Added time entry successfully"]);

    // Update time entry
    const newDesc = "Test time entry (updated)";
    const res2 = await fetch(`/api/time-entries/${entry.id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ description: newDesc }),
    });
    const updated = await res2.json();
    if (!res2.ok) throw new Error(`Failed to update time entry: ${updated.error}`);
    setTestResults(prev => [...prev, "✅ Updated time entry successfully"]);

    // Delete time entry
    const res3 = await fetch(`/api/time-entries/${entry.id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res3.json();
    if (!res3.ok) throw new Error(`Failed to delete time entry: ${data.error}`);
    setTestResults(prev => [...prev, "✅ Deleted time entry successfully"]);

    // Clean up test data
    await fetch(`/api/projects/${project.id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    await fetch(`/api/clients/${client.id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
  };

  return (
    <main className="mx-auto max-w-4xl p-4">
      <h1 className="mb-4 text-3xl font-bold">CRUD Test Suite</h1>
      
      <button
        onClick={runTests}
        className="mb-6 rounded bg-blue-600 px-6 py-2 text-white hover:bg-blue-700"
      >
        Run All Tests
      </button>

      <div className="space-y-2">
        {testResults.map((result, index) => (
          <p key={index} className="text-green-600">{result}</p>
        ))}
      </div>

      <p className="mt-8 text-sm text-gray-600">
        This test suite verifies all CRUD operations for Clients, Projects, and Time Entries.
        Each test creates test data, performs operations, and cleans up after itself.
      </p>

      <p className="mt-4 text-sm text-gray-600">
        <Link href="/dashboard" className="text-blue-600 underline">
          ← Return to Dashboard
        </Link>
      </p>
    </main>
  );
}
