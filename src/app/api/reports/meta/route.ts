import { NextRequest, NextResponse } from 'next/server';

// TODO: Replace hard-coded list with dynamic fetch from DB once models جاهزة
const REPORTS = [
  { id: 1, name: 'Cost & Billing' },
  { id: 2, name: 'Time Entries' },
  { id: 3, name: 'Invoices Summary' },
];

export async function GET(_req: NextRequest) {
  return NextResponse.json(REPORTS);
}
