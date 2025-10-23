import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

// GET /api/tasks -> list tasks for current user (or all if admin)
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
  }

  const role = session.user.role as string;
  let where: any = {};
  if (!['LAWYER_PARTNER','MANAGING_PARTNER','LAWYER_MANAGER','OWNER','ADMIN'].includes(role)) {
    // regular lawyer: only own assigned tasks
    where = { assigneeId: session.user.id };
  }

  const tasks = await prisma.task.findMany({
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
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
  }
  const role = session.user.role as string;
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
  return NextResponse.json(task, { status: 201 });
}
