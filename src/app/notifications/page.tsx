"use client";
import React, { useEffect, useState } from "react";
import { getAuth } from "@/lib/auth";

interface Notification {
  id: number;
  type: string;
  message: string;
  read: boolean;
  createdAt: string;
}

export default function NotificationsPage() {
  const [list, setList] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const token = getAuth();

  const fetchList = async () => {
    setLoading(true);
    const res = await fetch("/api/notifications", {
      headers: { Authorization: `Bearer ${token}` },
    });
    const json = await res.json();
    setList(json);
    setLoading(false);
  };

  useEffect(() => {
    fetchList();
  }, []);

  const markRead = async (id: number) => {
    await fetch("/api/notifications", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ id, read: true }),
    });
    setList((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  };

  if (loading) return <p className="p-8">Loading…</p>;

  return (
    <div className="container mx-auto max-w-3xl p-8 space-y-6">
      <h1 className="text-3xl font-bold">Notifications</h1>
      {list.length === 0 ? (
        <p>No notifications.</p>
      ) : (
        <ul className="space-y-4">
          {list.map((n) => (
            <li
              key={n.id}
              className={`rounded border p-4 ${n.read ? "bg-gray-50" : "bg-yellow-50"}`}
            >
              <div className="flex items-start gap-4">
                <div className="flex-1">
                  <p className="font-medium">{n.type}</p>
                  <p className="text-sm text-gray-700">{n.message}</p>
                  <p className="mt-1 text-xs text-gray-500">
                    {new Date(n.createdAt).toLocaleString()}
                  </p>
                </div>
                {!n.read && (
                  <button
                    onClick={() => markRead(n.id)}
                    className="h-8 rounded bg-blue-600 px-3 text-white text-xs"
                  >
                    Mark Read
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
