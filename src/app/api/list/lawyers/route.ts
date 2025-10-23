import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

const LAWYER_ROLES = [
  'LAWYER', 'LAWYER_MANAGER', 'LAWYER_PARTNER', 'MANAGING_PARTNER'
];

export async function GET(req: NextRequest) {
  const lawyers = await prisma.user.findMany({
    where: { role: { in: LAWYER_ROLES } },
    select: { id: true, name: true },
    orderBy: { name: 'asc' },
  });
  return NextResponse.json(lawyers);
}
