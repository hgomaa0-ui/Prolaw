import { NextRequest, NextResponse } from 'next/server';

// Temporary static list; later fetch from DB/config
const SETTINGS = [
  { id: 1, name: 'General' },
  { id: 2, name: 'Billing' },
  { id: 3, name: 'Notifications' },
];

export async function GET(_req: NextRequest) {
  return NextResponse.json(SETTINGS);
}
