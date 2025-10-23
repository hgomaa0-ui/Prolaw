import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

const LAWYER_ROLES = [
  'LAWYER', 'LAWYER_MANAGER', 'LAWYER_PARTNER', 'MANAGING_PARTNER'
];

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions as any);
  const companyId = session?.user?.companyId ?? 0;
  const lawyers = await prisma.user.findMany({
    where: { companyId, role: { in: LAWYER_ROLES } },
    select: { id: true, name: true },
    orderBy: { name: 'asc' },
  });
  return NextResponse.json(lawyers);
}
