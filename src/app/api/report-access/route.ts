import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';

async function auth(req: NextRequest): Promise<{ id: number; role: string } | null> {
  const hdr = req.headers.get('authorization') || '';
  const token = hdr.startsWith('Bearer ') ? hdr.slice(7) : null;
  if (!token) return null;
  try {
    const p = jwt.verify(token, JWT_SECRET) as any;
    return { id: Number(p.sub ?? p.id), role: p.role ?? 'STAFF' };
  } catch {
    return null;
  }
}

// -------------------------------------------------------------------------------------------------
// GET /api/report-access?userId=..   → صلاحيات التقارير للمستخدم (إذا لم يُمرَّر userId يستخدم التوكن)
// POST /api/report-access            → { userId, reportCode, clientId?, projectId?, lawyerId? }
// DELETE /api/report-access          → { id }
// -------------------------------------------------------------------------------------------------
export async function GET(req: NextRequest) {
  try {
    const user = auth(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const userIdParam = req.nextUrl.searchParams.get('userId');
    const userId = userIdParam ? Number(userIdParam) : user.id;

    // OWNER / ADMIN_ALL يمكنه جلب صلاحيات لأى يوزر
    if (userId !== user.id && user.role === 'STAFF') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const list = await prisma.reportAccess.findMany({ where: { userId } });
    return NextResponse.json(list);
  } catch (err) {
    console.error('GET /api/report-access', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = auth(req);
    if (!user || user.role === 'STAFF') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    const body = await req.json();
    const { userId, reportCode, clientId, projectId } = body;
    if (!userId || !reportCode) return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    const rec = await prisma.reportAccess.create({ data: { userId, reportCode, clientId, projectId } });
    return NextResponse.json(rec, { status: 201 });
  } catch (err) {
    console.error('POST /api/report-access', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = auth(req);
    if (!user || user.role === 'STAFF') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    const { id } = await req.json();
    if (!id) return NextResponse.json({ error: 'Id required' }, { status: 400 });
    await prisma.reportAccess.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('DELETE /api/report-access', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
