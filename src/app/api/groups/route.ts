import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';

function getUserRole(req: NextRequest): { id: number; role: string } | null {
  const auth = req.headers.get('authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) return null;
  try {
    const payload = jwt.verify(token, JWT_SECRET) as any;
    return { id: Number(payload.sub ?? payload.id), role: payload.role ?? 'STAFF' };
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// GET  /api/groups    → جميع الجروبات مع الأعضاء (اختياري)
// POST /api/groups    → إنشاء جروب {name}
// DELETE /api/groups  → حذف جروب {id}
// ---------------------------------------------------------------------------
export async function GET(req: NextRequest) {
  try {
    const withMembers = req.nextUrl.searchParams.get('withMembers') === '1';
    const groups = await prisma.group.findMany({
      include: withMembers ? { members: { include: { user: { select: { id: true, name: true, email: true } } } } } : undefined,
      orderBy: { name: 'asc' },
    });
    return NextResponse.json(groups);
  } catch (err) {
    console.error('GET /api/groups', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = getUserRole(req);
    if (!user || user.role === 'STAFF') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    const { name } = await req.json();
    if (!name) return NextResponse.json({ error: 'Name required' }, { status: 400 });
    const group = await prisma.group.create({ data: { name } });
    return NextResponse.json(group, { status: 201 });
  } catch (err: any) {
    console.error('POST /api/groups', err);
    return NextResponse.json({ error: err?.code === 'P2002' ? 'Duplicate name' : 'Server error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = getUserRole(req);
    if (!user || user.role === 'STAFF') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    const { id } = await req.json();
    if (!id) return NextResponse.json({ error: 'Id required' }, { status: 400 });
    await prisma.group.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('DELETE /api/groups', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
