import { NextRequest, NextResponse } from 'next/server';
import { getAuthServer } from '@/lib/auth';
import jwt from 'jsonwebtoken';
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions as any);
  let companyId: number | undefined;
  const param = req.nextUrl.searchParams.get('companyId');
  if (param && !Number.isNaN(parseInt(param))) companyId = parseInt(param);
  if (!companyId) companyId = session?.user?.companyId as number | undefined;
  if (!companyId && session?.user?.id) {
    const u = await prisma.user.findUnique({ where: { id: session.user.id }, select: { companyId: true } });
    companyId = u?.companyId;
  }
  const where: any = companyId ? { companyId } : {};
  const clients = await prisma.client.findMany({
    where,
    select: { id: true, name: true },
    orderBy: { name: 'asc' },
  });
  return NextResponse.json(clients);
}
