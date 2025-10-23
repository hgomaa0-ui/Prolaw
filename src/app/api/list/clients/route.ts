import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions as any);
  const companyId = session?.user?.companyId ?? 0;
  const clients = await prisma.client.findMany({
    where: { companyId },
    select: { id: true, name: true },
    orderBy: { name: 'asc' },
  });
  return NextResponse.json(clients);
}
