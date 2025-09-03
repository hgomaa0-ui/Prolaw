import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';

function getUser(req: NextRequest) {
  const auth = req.headers.get('authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) return null;
  try {
    const d = jwt.verify(token, JWT_SECRET) as any;
    return d ? { id: Number(d.sub), role: d.role } : null;
  } catch {
    return null;
  }
}

// GET /api/time-entries/pending/manager
export async function GET(req: NextRequest) {
  const user = getUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!(user.role === 'OWNER' || user.role === 'MANAGER' || user.role === 'LAWYER_MANAGER'))
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  try {
    const list = await prisma.timeEntry.findMany({
      where: { managerApproved: false },
      include: {
        project: { select: { name: true, client: { select: { name: true } } } },
        user: { select: { name: true } },
      },
      orderBy: { startTs: 'asc' },
    });
    return NextResponse.json(list);
  } catch (e) {
    console.error('GET manager pending time', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// PUT /api/time-entries/pending/manager?id={id}
export async function PUT(req: NextRequest) {
  const user = getUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!(user.role === 'OWNER' || user.role === 'MANAGER' || user.role === 'LAWYER_MANAGER'))
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const idParam = req.nextUrl.searchParams.get('id');
  if (!idParam) return NextResponse.json({ error: 'Missing id' }, { status: 400 });
  const id = Number(idParam);
  if (isNaN(id)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
  try {
    const body = await req.json();
    const updates: any = {};
    if (body.startTs) updates.startTs = new Date(body.startTs);
    if (body.endTs) updates.endTs = new Date(body.endTs);
    if (body.notes !== undefined) updates.notes = body.notes;
    if (body.durationMins !== undefined) updates.durationMins = Number(body.durationMins);
    // recalc duration if either timestamp changed
    if ((updates.startTs || updates.endTs) && updates.durationMins === undefined) {
      // fetch existing times to compute duration accurately
      const existing = await prisma.timeEntry.findUnique({ where: { id } , select:{ startTs:true,endTs:true}});
      const start = updates.startTs ?? existing?.startTs;
      const end = updates.endTs ?? existing?.endTs;
      if (start && end) {
        updates.durationMins = Math.round(((end as Date).getTime() - (start as Date).getTime()) / 60000);
      }
    }
    updates.managerApproved = true;
    updates.managerId = user.id;

    const updated = await prisma.timeEntry.update({
      where: { id },
      data: updates,
      include: {
        project: { select: { name: true, client: { select: { name: true } } } },
        user: { select: { name: true } },
      },
    });
    return NextResponse.json(updated);
  } catch (e) {
    console.error('PUT manager approve time', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
