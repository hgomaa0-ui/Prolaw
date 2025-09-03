import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET /api/assignments  -> list all assignments with project & user data
export async function GET(request: NextRequest) {
  // auth decode
  const auth = request.headers.get('authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  let role: string | null = null;
  let userId: number | null = null;
  let companyId: number | null = null;
  if (token) {
    try {
      const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
      role = payload.role;
      userId = Number(payload.sub);
      companyId = payload.companyId ? Number(payload.companyId) : null;
    } catch {}
  }

  let where: any = {};
  if (companyId) {
    where.project = { companyId } as any;
  }
  if (role === 'LAWYER_MANAGER' && userId) {
    const managed = await prisma.managerLawyer.findMany({ where: { managerId: userId }, select: { lawyerId: true } });
    const ids = managed.map(m => m.lawyerId);
    if (!ids.length) return NextResponse.json([]);
    where.userId = { in: ids };
  }

  const assignments = await prisma.projectAssignment.findMany({
    where,
    include: { user: { select: { id: true, name: true } }, project: { select: { id: true, name: true, client: { select: { id: true, name: true } } } } },
  });
  return NextResponse.json(assignments);
}

// POST /api/assignments  -> create assignment { userId, projectId, canLogTime } or create assignments for all group members { groupId, projectId, canLogTime }
export async function POST(req: NextRequest) {
  try {
    const { userId, projectId, groupId, canLogTime = true, hourlyRate, currency, readyForInvoicing = false } = await req.json();
    if (groupId) {
      const groupMembers = await prisma.groupMembership.findMany({ where: { groupId }, select: { userId: true } });
      const createdAssignments = await Promise.all(groupMembers.map((member) =>
        prisma.projectAssignment.upsert({
          where: { userId_projectId: { userId: member.userId, projectId } },
          update: { canLogTime, hourlyRate: hourlyRate ?? null, currency: currency ?? null, readyForInvoicing } as any,
          create: { userId: member.userId, projectId, canLogTime, hourlyRate: hourlyRate ?? null, currency: currency ?? null, readyForInvoicing } as any,
          include: { user: { select: { id: true, name: true } }, project: { select: { id: true, name: true, client: { select: { id: true, name: true } } } } },
        })
      ));
      return NextResponse.json(createdAssignments);
    } else if (!userId || !projectId) return NextResponse.json({ error: 'userId & projectId required' }, { status: 400 });
    const created = await prisma.projectAssignment.upsert({
      where: { userId_projectId: { userId, projectId } },
      update: { canLogTime, hourlyRate: hourlyRate ?? null, currency: currency ?? null, readyForInvoicing } as any,
      create: { userId, projectId, canLogTime, hourlyRate: hourlyRate ?? null, currency: currency ?? null, readyForInvoicing } as any,
      include: { user: { select: { id: true, name: true } }, project: { select: { id: true, name: true, client: { select: { id: true, name: true } } } } },
    });
    return NextResponse.json(created);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
