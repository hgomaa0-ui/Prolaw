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
// GET    /api/groups/[id]/members   → الأعضاء في الجروب
// POST   /api/groups/[id]/members   → إضافة عضو  {userId, isManager?}
// DELETE /api/groups/[id]/members   → إزالة عضو  {userId}
// ---------------------------------------------------------------------------
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const groupId = Number(params.id);
  if (isNaN(groupId)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
  try {
    const members = await prisma.groupMembership.findMany({
      where: { groupId },
      include: { user: { select: { id: true, name: true, email: true, role: true } } },
      orderBy: { user: { name: 'asc' } },
    });
    return NextResponse.json(members);
  } catch (err) {
    console.error('GET group members', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const groupId = Number(params.id);
  if (isNaN(groupId)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
  try {
    const user = getUserRole(req);
    if (!user || user.role === 'STAFF') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { userId, isManager = false } = await req.json();
    if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 });

    const membership = await prisma.groupMembership.create({
      data: { groupId, userId, isManager },
      include: { user: { select: { id: true, name: true, email: true } } },
    });
    return NextResponse.json(membership, { status: 201 });
  } catch (err: any) {
    console.error('POST group member', err);
    return NextResponse.json({ error: err?.code === 'P2002' ? 'Already member' : 'Server error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const groupId = Number(params.id);
  if (isNaN(groupId)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
  try {
    const user = getUserRole(req);
    if (!user || user.role === 'STAFF') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { userId } = await req.json();
    if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 });

    await prisma.groupMembership.delete({ where: { groupId_userId: { groupId, userId } } });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('DELETE group member', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
