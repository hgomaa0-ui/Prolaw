import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

const LAWYER_ROLES = [
  'LAWYER', 'LAWYER_MANAGER', 'LAWYER_PARTNER', 'MANAGING_PARTNER'
];

export async function GET(req: NextRequest) {
  let companyId: number | undefined;
  try {
    const session = await getServerSession(authOptions as any);
    companyId = session?.user?.companyId;
  } catch {
    companyId = undefined; // ignore auth when secret missing
  }
  const projectId = req.nextUrl.searchParams.get('projectId');

  const baseWhere:any = { role: { in: LAWYER_ROLES } };
  if (companyId) baseWhere.companyId = companyId;
  if (projectId) {
    const pid = parseInt(projectId);
    if (!Number.isNaN(pid)) {
      baseWhere.projectAssignments = { some: { projectId: pid } };
    }
  }
  const lawyers = await prisma.user.findMany({
    where: baseWhere,
    select: { id: true, name: true },
    orderBy: { name: 'asc' },
  });
  return NextResponse.json(lawyers);
}
