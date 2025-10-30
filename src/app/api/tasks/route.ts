import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions, getAuthServer } from '@/lib/auth';
import jwt from 'jsonwebtoken';
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';

// GET /api/tasks -> list tasks for current user (or all if admin)
export async function GET(req: NextRequest) {
  let session = await getServerSession(authOptions);
  if (!session?.user) {
    // try bearer / custom token
    const raw = getAuthServer(req);
    if (raw) {
      try {
        const decoded = jwt.verify(raw, JWT_SECRET) as any;
        session = { user: decoded } as any;
      } catch {}
    }
  }
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
  }

  const role = session.user.role as string;
  let where: any = {};
  if (!['LAWYER_PARTNER','MANAGING_PARTNER','LAWYER_MANAGER','OWNER','ADMIN'].includes(role)) {
    // regular lawyer: only own assigned tasks
    where = { assigneeId: session.user.id };
  }

  const companyId = (session.user as any).companyId;
  const tasks = await prisma.task.findMany({
    where: {
      ...where,
      OR: [
        { project: { companyId } },
        { client: { companyId } }
      ]
    },
    where,
    include: {
      client: { select: { name: true, id: true } },
      project: { select: { name: true, id: true } },
      assignee: { select: { name: true, id: true } },
      assigner: { select: { name: true, id: true } }
    },
    orderBy: { dueDate: 'asc' }
  });

  return NextResponse.json(tasks);
}

// POST /api/tasks -> create new task
export async function POST(req: NextRequest) {
  let session = await getServerSession(authOptions);
  if (!session?.user) {
    // try bearer/JWT token
    // attempt custom JWT cookie "token"
    const raw = getAuthServer(req as any);
    if (raw) {
      try {
        const decoded = jwt.verify(raw, JWT_SECRET) as any;
        session = { user: decoded } as any;
      } catch {}
    }
  }
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
  }
  const role = (session.user as any).role as string;
  if (!['LAWYER_PARTNER','MANAGING_PARTNER','MANAGING_PARTNER','OWNER','ADMIN'].includes(role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const data = await req.json();
  const { title, description, clientId, projectId, assigneeId, dueDate } = data;
  if (!title || !assigneeId || !dueDate) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
  }
  const task = await prisma.task.create({
    data: {
      title,
      description,
      clientId: clientId ?? null,
      projectId: projectId ?? null,
      assignerId: session.user.id,
      assigneeId,
      dueDate: new Date(dueDate),
    }
  });
  if (projectId) {
    await prisma.projectAssignment.upsert({
      where: { userId_projectId: { userId: assigneeId, projectId } },
      create: { userId: assigneeId, projectId },
      update: {},
    });
  }
  return NextResponse.json(task, { status: 201 });
}
