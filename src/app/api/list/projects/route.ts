import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions as any);
  const companyId = session?.user?.companyId ?? 0;
  const clientId = req.nextUrl.searchParams.get('clientId');
  const where:any = { companyId };
  if (clientId) where.clientId = parseInt(clientId);
  const projects = await prisma.project.findMany({
    where,
    select: { id: true, name: true, clientId: true },
    orderBy: { name: 'asc' },
  });
  return NextResponse.json(projects);
}
