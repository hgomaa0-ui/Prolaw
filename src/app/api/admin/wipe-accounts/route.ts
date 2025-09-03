import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// TEMP route to wipe Chart of Accounts completely.
// Requires query param ?confirm=YES to prevent accidents.
// In production remove this route.
export async function POST(req: NextRequest) {
  const confirm = req.nextUrl.searchParams.get('confirm');
  if (confirm !== 'YES')
    return NextResponse.json({ error: 'Add ?confirm=YES to actually wipe accounts' }, { status: 400 });

  try {
    // delete GL lines first due FK constraints
    await prisma.transactionLine.deleteMany({});
    await prisma.transaction.deleteMany({});

    // delete accounts and related balances tables (trust accounts etc.) if desired
    await prisma.account.deleteMany({});

    return NextResponse.json({ status: 'accounts wiped' });
  } catch (e: any) {
    console.error('wipe-accounts error', e);
    return NextResponse.json({ error: e.message || 'failed' }, { status: 500 });
  }
}
