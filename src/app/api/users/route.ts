import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';

function auth(req: NextRequest) {
  let hdr = req.headers.get('authorization') || '';
  if(!hdr){
    const cookie = req.cookies.get('token');
    hdr = cookie?.value ? `Bearer ${cookie.value}` : '';
  }
  const token = hdr.startsWith('Bearer ') ? hdr.slice(7) : null;
  if (!token) return null;
  try {
    const p = jwt.verify(token, JWT_SECRET) as any;
    return { id: Number(p.sub ?? p.id), role: p.role ?? 'STAFF' };
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  const projectIdParam = req.nextUrl.searchParams.get('projectId');
  const projectId = projectIdParam ? Number(projectIdParam) : undefined;
  const user = auth(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (user.role === 'STAFF') return NextResponse.json([], { status: 200 });
  // fetch requester companyId
  const current = await prisma.user.findUnique({ where: { id: user.id }, select: { companyId: true } });
  const whereClause:any = { companyId: current?.companyId ?? undefined };
  if(projectId){
    whereClause.assignments = { some: { projectId } } as any;
  }
  const list = await prisma.user.findMany({
    select: { id: true, name: true, email: true },
    where: whereClause,
    orderBy: { name: 'asc' },
  });
  return NextResponse.json(list);
}
