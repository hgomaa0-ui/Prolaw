import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';

function getUserId(request: NextRequest): number | null {
  const auth = request.headers.get('authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) return null;
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    return decoded && decoded.sub ? Number(decoded.sub) : null;
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = getUserId(req);
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { projectId, notes, billable = true } = body;
    if (!projectId) return NextResponse.json({ error: 'projectId required' }, { status: 400 });

    // ensure no active timer
    const active = await prisma.timeEntry.findFirst({ where: { userId, endTs: null } });
    if (active) return NextResponse.json({ error: 'Timer already running', id: active.id }, { status: 400 });

    // ensure assignment exists
    const assigned = await prisma.projectAssignment.findFirst({ where: { projectId, userId } });
    if (!assigned) return NextResponse.json({ error: 'Not assigned to project' }, { status: 403 });

    const entry = await prisma.timeEntry.create({
      data: {
        projectId,
        userId,
        startTs: new Date(),
        billable,
        notes: notes || '',
        durationMins: 0,
      },
    });
    return NextResponse.json(entry, { status: 201 });
  } catch (err) {
    console.error('POST /api/timer/start', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
