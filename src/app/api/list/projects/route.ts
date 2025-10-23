import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(req: NextRequest) {
  const clientId = req.nextUrl.searchParams.get('clientId');
  const where = clientId ? { clientId: parseInt(clientId) } : {};
  const projects = await prisma.project.findMany({
    where,
    select: { id: true, name: true, clientId: true },
    orderBy: { name: 'asc' },
  });
  return NextResponse.json(projects);
}
