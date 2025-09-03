import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import jwt from 'jsonwebtoken';
import { ApprovalType } from '@prisma/client';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';

async function auth(req: NextRequest): Promise<{ id: number; role: string } | null> {
  const authHeader = req.headers.get('authorization') || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) return null;
  try {
    const p = jwt.verify(token, JWT_SECRET) as any;
    const id = Number(p.sub ?? p.id);
    let role = p.role as string | undefined;
    if (!role) {
      const u = await prisma.user.findUnique({ where: { id }, select: { role: true } });
      role = u?.role ?? 'STAFF';
    }
    return { id, role };
  } catch {
    return null;
  }
}

// -------------------------------------------------------------------------------------------------
// GET /api/approval-scope?userId=..   → نطاقات الموافقة للمستخدم
// POST /api/approval-scope            → { userId, type, clientId?, projectId?, lawyerId? }
// DELETE /api/approval-scope          → { id }
// -------------------------------------------------------------------------------------------------
export async function GET(req: NextRequest) {
  try {
    const user = auth(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const userIdParam = req.nextUrl.searchParams.get('userId');
    const userId = userIdParam ? Number(userIdParam) : user.id;

    if (userId !== user.id && user.role === 'STAFF') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const list = await prisma.approvalScope.findMany({ where: { userId } });
    return NextResponse.json(list);
  } catch (err) {
    console.error('GET /api/approval-scope', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = auth(req);
    if (!user || user.role === 'STAFF') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const body = await req.json();
    const { userId, type, clientId, projectId, lawyerId } = body;
    if (!userId || !type || !['TIME', 'EXPENSE'].includes(type)) {
      return NextResponse.json({ error: 'Missing or invalid fields' }, { status: 400 });
    }

    const rec = await prisma.approvalScope.create({
      data: { userId, type: type as ApprovalType, clientId, projectId, lawyerId },
    });
    return NextResponse.json(rec, { status: 201 });
  } catch (err) {
    console.error('POST /api/approval-scope', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = auth(req);
    if (!user || user.role === 'STAFF') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { id } = await req.json();
    if (!id) return NextResponse.json({ error: 'Id required' }, { status: 400 });

    await prisma.approvalScope.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('DELETE /api/approval-scope', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
