"use client";
import { useEffect, useState } from "react";
import { getAuth } from "@/lib/auth";
import Link from "next/link";

export default function HRDashboard() {
  const [tiles,setTiles]=useState<{href:string;label:string}[]>([]);
  useEffect(()=>{
    const token=getAuth();
    let role:string|null=null;
    try{ role = token? JSON.parse(atob(token.split('.')[1])).role:null;}catch{}
    if(role==="HR"){
      setTiles([
        { href: "/admin/leaves", label: "Leave Requests" },
        { href: "/admin/attendance", label: "Attendance" },
        { href: "/admin/penalties", label: "Penalties" },
        { href: "/admin/payroll", label: "Payroll" },
      ]);
    }else if(role==="HR_MANAGER"){ 
      setTiles([
        { href: "/admin/employees", label: "Employees" },
        { href: "/admin/leaves", label: "Leave Requests" },
        { href: "/admin/attendance", label: "Attendance" },
                { href: "/admin/penalties", label: "Penalties" },
        { href: "/admin/payroll", label: "Payroll" },
      ]);
    }else{
      setTiles([
        { href: "/admin/employees", label: "Employees" },
        { href: "/admin/leaves", label: "Leave Requests" },
        { href: "/admin/attendance", label: "Attendance" },
                { href: "/admin/penalties", label: "Penalties" },
        { href: "/admin/payroll", label: "Payroll" },
      ]);
    }
  },[]);
  return (
    <div className="container mx-auto max-w-4xl p-8">
      <h1 className="mb-8 text-3xl font-bold">HR Dashboard</h1>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
        {tiles.map((t) => (
          <Link
            key={t.href}
            href={t.href}
            className="flex h-32 items-center justify-center rounded-lg border bg-gray-50 text-lg font-medium shadow hover:bg-blue-50"
          >
            {t.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
