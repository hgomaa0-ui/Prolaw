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

    const active = await prisma.timeEntry.findFirst({ where: { userId, endTs: null } });
    if (!active) return NextResponse.json({ error: 'No active timer' }, { status: 400 });

    const endTs = new Date();
    const durationMins = Math.round((endTs.getTime() - active.startTs.getTime()) / 60000);

    const updated = await prisma.timeEntry.update({
      where: { id: active.id },
      data: { endTs, durationMins },
    });

    return NextResponse.json(updated);
  } catch (err) {
    console.error('POST /api/timer/stop', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
