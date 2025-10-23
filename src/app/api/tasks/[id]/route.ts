import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
  }
  const id = parseInt(params.id, 10);
  if (isNaN(id)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });

  const data = await req.json();
  // allowed fields: status, dueDate
  const update: any = {};
  if (data.status) update.status = data.status;
  if (data.dueDate) update.dueDate = new Date(data.dueDate);

  const role = session.user.role as string;
  const task = await prisma.task.findUnique({ where: { id } });
  if (!task) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const canEdit = task.assigneeId === session.user.id || ['LAWYER_PARTNER','MANAGING_PARTNER','LAWYER_MANAGER','OWNER','ADMIN'].includes(role);
  if (!canEdit) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const updated = await prisma.task.update({ where: { id }, data: update });
  return NextResponse.json(updated);
}
