import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

export async function GET(req: NextRequest) {
  let companyId: number | undefined;
  try {
    const session = await getServerSession(authOptions as any);
    companyId = session?.user?.companyId;
  } catch {
    companyId = undefined; // allow unauth env without secret
  }
  const clientId = req.nextUrl.searchParams.get('clientId');
  const where:any = companyId ? { companyId } : {};
  if (clientId) where.clientId = parseInt(clientId);
  const projects = await prisma.project.findMany({
    where,
    select: { id: true, name: true, clientId: true },
    orderBy: { name: 'asc' },
  });
  return NextResponse.json(projects);
}
