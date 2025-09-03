"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { useEffect, useState } from "react";
import { getAuth } from "@/lib/auth";

interface Perm { code:string; allowed:boolean }

export default function AdminSettingsPage() {
  const [perms,setPerms]=useState<Record<string,boolean>>({});
  const [mounted,setMounted]=useState(false);
  useEffect(()=>{
    setMounted(true);
    const token=getAuth();
    if(!token) return;
    const payload=JSON.parse(atob(token.split('.')[1]));
    const uid=payload?.id??payload?.sub;
    fetch(`/api/users/${uid}/permissions`,{headers:{Authorization:`Bearer ${token}`}})
      .then(r=>r.ok?r.json():[] as Perm[])
      .then(list=>{
        const obj:Record<string,boolean>={};
        list.forEach((p:Perm)=>{ if(p.allowed) obj[p.code]=true; });
        setPerms(obj);
      });
  },[]);

  const tilesAll = [
  {
    href: "/admin/company",
    title: "Company Info",
    perm: "admin_all",
    description: "Edit company details and logo.",
  },
  {
    href: "/admin/groups",
    title: "Groups",
    perm: "manage_groups",
    description: "Create and manage lawyer groups.",
  },
    {
      href: "/admin/positions",
      title: "Positions",
      perm: "positions",
      description: "Define job positions and default hourly rates.",
    },

    

    {
      href: "/admin/assignments",
      title: "Project Assignments",
      perm: "assign_projects",
      description: "Assign lawyers to projects and set rates.",
    },
    {
      href: "/manager/time/pending",
      title: "Pending Time (Manager)",
      perm: "approve_time",
      description: "Manager approval for time entries.",
    }
  ];

  if(!mounted) return null;
  // detect role from token
  const token=getAuth();
  let role:string|undefined;
  try{ if(token){ role=JSON.parse(atob(token.split('.')[1])).role; }}catch{}
  let tiles: typeof tilesAll;
  if(role==='ACCOUNTANT_MASTER'){
    tiles=[
                                              ];
  }else if(role==='ACCOUNTANT_ASSISTANT'){
    tiles=[];
  }else if(role==='HR_MANAGER'){
    tiles=[
            {href:"/admin/employees",title:"Employees",perm:"employees",description:"Manage employees."}
    ];
  }else if(role==='LAWYER_MANAGER'){
    tiles=[
      {href:"/manager/time/pending",title:"Pending Time (Manager)",perm:"approve_time",description:"Approve submitted time entries."}
    ];
  }else if(role==='LAWYER_PARTNER'){
    tiles=[
      {href:"/manager/time/pending",title:"Pending Time (Manager)",perm:"approve_time",description:"Approve submitted time entries."}
    ];
  }else{
    tiles=tilesAll;
  }

  return (
    <div className="container mx-auto max-w-4xl p-8">
      <h1 className="mb-8 text-3xl font-bold">Admin Settings</h1>
      <div className="grid gap-6 sm:grid-cols-2">
        {tiles.filter(t=>{
            if(Object.keys(perms).length===0) return true; // no perms defined => show all
            return !t.perm || perms[t.perm] || perms["admin_all"];
          },).map((tile: any) => (
          <Link
            key={tile.href}
            href={tile.href}
            className="rounded-lg border border-gray-300 p-6 shadow-sm transition-transform hover:-translate-y-1 hover:shadow-md"
          >
            <h2 className="mb-2 text-xl font-semibold text-blue-600">{tile.title}</h2>
            <p className="text-sm text-gray-600">{tile.description}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
