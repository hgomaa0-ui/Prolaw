import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions as any);
  let companyId = session?.user?.companyId as number | undefined;
  if (!companyId && session?.user?.id) {
    const u = await prisma.user.findUnique({ where: { id: session.user.id }, select: { companyId: true } });
    companyId = u?.companyId;
  }
  if (!companyId) return NextResponse.json([]);
  const clients = await prisma.client.findMany({
    where: { companyId },
    select: { id: true, name: true },
    orderBy: { name: 'asc' },
  });
  return NextResponse.json(clients);
}
