"use client";
import React, { useEffect, useState } from "react";
import { getAuth } from "@/lib/auth";

interface Record {
  id: number;
  clockIn: string;
  clockOut?: string;
}

export default function MyAttendance() {
  const [today, setToday] = useState<Record | null>(null);
  const [loading, setLoading] = useState(true);
  const token = getAuth();

  const fetchToday = async () => {
    setLoading(true);
    const todayISO = new Date().toISOString().slice(0, 10);
    const res = await fetch(`/api/attendance?from=${todayISO}&to=${todayISO}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const json = await res.json();
    setToday(json[0] || null);
    setLoading(false);
  };

  useEffect(() => {
    fetchToday();
  }, []);

  const clockIn = async () => {
    await fetch(`/api/attendance`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({}),
    });
    fetchToday();
  };

  const clockOut = async () => {
    await fetch(`/api/attendance`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({}),
    });
    fetchToday();
  };

  if (loading) return <p className="p-8">Loading…</p>;

  return (
    <div className="mx-auto max-w-md p-8 space-y-6">
      <h1 className="text-2xl font-bold text-center">My Attendance</h1>
      {today ? (
        <div className="rounded border p-4 text-center">
          <p>Clock In: {new Date(today.clockIn).toLocaleTimeString()}</p>
          <p>
            Clock Out: {today.clockOut ? new Date(today.clockOut).toLocaleTimeString() : "—"}
          </p>
          {today.clockOut ? (
            <span className="text-green-600 font-medium">Shift Completed</span>
          ) : (
            <button
              onClick={clockOut}
              className="mt-4 rounded bg-red-600 px-4 py-2 text-white disabled:opacity-50"
            >
              Clock Out
            </button>
          )}
        </div>
      ) : (
        <button
          onClick={clockIn}
          className="w-full rounded bg-blue-600 px-4 py-4 text-white text-lg"
        >
          Clock In
        </button>
      )}
    </div>
  );
}
