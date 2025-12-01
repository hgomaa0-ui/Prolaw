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
  // NOTE: previously we restricted to lawyers already assigned to the project via ProjectAssignment.
  // This caused the dropdown to be empty when no assignments existed yet.
  // Now we simply return all lawyers in the same company; the assignment will be created when a task is added.
  let lawyers = await prisma.user.findMany({
    where: baseWhere,
    select: { id: true, name: true },
    orderBy: { name: 'asc' },
  });
  return NextResponse.json(lawyers);
}
