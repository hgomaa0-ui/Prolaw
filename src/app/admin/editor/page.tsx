"use client";

export const dynamic = "force-dynamic";
export const prerender = false;

import React from "react";

// Temporary placeholder until editor is fixed for SSR.
export default function AdminEditorPlaceholder() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Page Builder (Coming Soon)</h1>
      <p>The visual page builder is under maintenance. Please check back later.</p>
    </div>
  );
}
