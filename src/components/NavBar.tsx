"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { getAuth, clearAuth } from "@/lib/auth";

type UserRole = string; // roles now dynamic
interface NavLink { href:string; label:string; key:string }
const ADMIN_ROLES = ["ADMIN","ACCOUNTANT_MASTER","ACCOUNTANT_ASSISTANT","LAWYER_PARTNER","LAWYER_MANAGER"];
const ROLE_PAGES: Record<string,string[]> = {
  OWNER:["clients","projects","time","expenses","invoices","reports","accounts","trust","settings","hr","leaves","notifications"],
  ADMIN:["clients","projects","time","expenses","invoices","reports","accounts","trust","settings","hr","leaves","notifications"],
  ACCOUNTANT_MASTER:["invoices","reports","accounts","trust","leaves","payroll","notifications"],
  ACCOUNTANT_ASSISTANT:["invoices","accounts","leaves","notifications"],
  LAWYER_PARTNER:["clients","projects","time","reports","leaves","settings"],
  HR_MANAGER:["hr","employees","payroll","leaves","positions","notifications"],
  LAWYER_MANAGER:["time","expenses","reports","leaves","notifications","settings"],
  HR:["hr","payroll","leaves","notifications"],
  LAWYER:["time","expenses","leaves","notifications"],
};

const links:NavLink[] = [
  { href: "/clients",   label: "Clients", key:"clients" },
  { href: "/projects", label: "Projects", key:"projects" },
  { href: "/time", label: "Time Entries", key:"time" },
  { href: "/expenses", label: "Expenses", key:"expenses" },
  { href: "/leaves", label: "Leaves", key:"leaves" },
  { href: "/invoices",  label: "Invoices", key:"invoices" },
  { href: "/admin/reports", label: "Reports", key:"reports" },
  { href: "/accounts", label: "Accounts", key:"accounts" },
    { href: "/admin/trust", label: "Trust", key:"trust" },
  { href: "/admin/payroll", label: "Payroll", key:"payroll" },
  { href: "/admin", label: "Admin", key:"settings" },
  { href: "/admin/hr", label: "HR", key:"hr" },


  ];

function decodeRole(token?:string):UserRole|null{
  if(!token) return null;
  try{
    const payload=JSON.parse(atob(token.split('.')[1]));
    return (payload.role??"STAFF") as any;
  }catch{ return null; }
}

import { useEffect, useState } from "react";

export default function NavBar() {
  const [mounted,setMounted]=useState(false);
  const [role,setRole]=useState<UserRole|null>(null);
  const [unread,setUnread]=useState(0);
  
  const pathname = usePathname();
  useEffect(()=>{
    setMounted(true);
    const token=getAuth()||undefined;
    const payload=token?JSON.parse(atob(token.split('.')[1])):null;
    setRole(payload?.role||null);
    // fetch unread notifications
    fetch('/api/notifications?unread=true',{headers: token?{Authorization:`Bearer ${token}`}:{}}).then(r=>r.json()).then((list:any)=>setUnread(list.length)).catch(()=>{});
  },[]);
  // Hide navbar on login, register or when not authenticated
  if(!mounted) return null;
  const tokenRaw = getAuth();
  if (!tokenRaw || pathname === "/" || pathname.includes("login") || pathname.includes("register")) return null;

  const allowedPages = ROLE_PAGES[role as string] || [];

  return (
    <nav className="mb-6 bg-gray-800 text-white">
      <div className="mx-auto flex max-w-6xl gap-6 px-4 py-3 text-sm font-medium">
        {links.filter(l => allowedPages.includes(l.key)).map(({ href, label }) => {
          const active = pathname.startsWith(href);
          const baseClasses = "hover:text-blue-300 transition-colors duration-200";
          const activeClasses = active ? "text-blue-400" : "text-gray-200";
          
          return (
            <Link
              key={href}
              href={href}
              className={`${baseClasses} ${activeClasses}`}
            >
              {label}
            </Link>
          );
        })}
        <Link href="/notifications" className="relative ml-auto mr-4">
          <span className="sr-only">Notifications</span>
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-200 hover:text-blue-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V4a2 2 0 10-4 0v1.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
          {unread>0 && (<span className="absolute -top-1 -right-1 inline-flex h-4 w-4 items-center justify-center rounded-full bg-red-600 text-[10px] font-bold text-white">{unread}</span>)}
        </Link>
        <button onClick={()=>{clearAuth();location.href='/login';}} className="text-sm text-gray-300 hover:text-red-400">Logout</button>
      </div>
    </nav>
  );
}