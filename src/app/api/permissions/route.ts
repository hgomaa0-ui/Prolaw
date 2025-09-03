import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from '@/utils/auth';
import prisma from '@/lib/prisma';

export async function GET() {
  // ensure core permission exists
  await prisma.permission.upsert({
    where:{ code:"admin_all" },
    update:{},
    create:{ code:"admin_all", name:"Full Admin Access" }
  });
  // List all possible permissions
  const permissions = await prisma.permission.findMany({ orderBy: { code: 'asc' } });
  return NextResponse.json(permissions);
}

export async function POST(req: NextRequest) {
  const user = await getAuth();
  if (!user || user.role !== 'OWNER') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const data = await req.json();
  const { code, name } = data;
  if (!code || !name) {
    return NextResponse.json({ error: 'code and name required' }, { status: 400 });
  }
  try {
    const perm = await prisma.permission.create({ data: { code, name } });
    return NextResponse.json(perm, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: 'Permission exists?' }, { status: 400 });
  }
}
