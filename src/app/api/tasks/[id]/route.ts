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
  // allowed fields: status, dueDate, assigneeId
  const update: any = {};
  if (data.status) update.status = data.status;
  if (data.dueDate) update.dueDate = new Date(data.dueDate);
  if (data.assigneeId) update.assigneeId = data.assigneeId;

  const role = session.user.role as string;
  const task = await prisma.task.findUnique({ where: { id } });
  if (!task) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const canEdit = task.assigneeId === session.user.id || ['LAWYER_PARTNER','MANAGING_PARTNER','LAWYER_MANAGER','OWNER','ADMIN'].includes(role);
  if (!canEdit) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const prevAssignee = task.assigneeId;
  const updated = await prisma.task.update({ where: { id }, data: update });
  // if reassigned
  if (data.assigneeId && data.assigneeId !== prevAssignee) {
    // ensure project assignment
    if (updated.projectId) {
      await prisma.projectAssignment.upsert({ where: { userId_projectId: { userId: data.assigneeId, projectId: updated.projectId } }, create: { userId: data.assigneeId, projectId: updated.projectId }, update:{} });
    }
    // notification + email
    await prisma.notification.create({ data: { userId: data.assigneeId, type: 'TASK_ASSIGN', message: `You were assigned task "${updated.title}"` } });
    const usr = await prisma.user.findUnique({ where: { id: data.assigneeId }, select:{ email:true } });
    if (usr?.email) {
      try { await import('@/lib/email').then(m=>m.sendMail(usr.email, 'Task Assigned', `<p>You have been assigned task <b>${updated.title}</b></p>`)); } catch {}
    }
  }
  return NextResponse.json(updated);
}
