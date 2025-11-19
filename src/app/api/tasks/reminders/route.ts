import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { sendMail } from '@/lib/email';

const CRON_SECRET = process.env.CRON_SECRET || 'cron-secret';

export async function GET(req:NextRequest){
  const auth = req.headers.get('authorization') || '';
  const secretQs = new URL(req.url).searchParams.get('secret');
  const valid = auth === `Bearer ${CRON_SECRET}` || secretQs === CRON_SECRET;
  if (!valid) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const now = new Date();
  const in48h = new Date(now.getTime() + 48 * 60 * 60 * 1000);
  // tasks due within next 48h that haven't had a due-date reminder yet
  const tasks = await prisma.task.findMany({
    where: {
      status: { not: 'DONE' },
      dueDate: { gte: now, lte: in48h },
    },
    include: { assignee: { select: { email: true, name: true } } },
  });
  let sent = 0;
  for (const t of tasks) {
    if (!t.assignee?.email) continue;
    const html = `<p>مرحباً ${t.assignee.name},</p>
<p>تبقّى يومان على إنجاز المهمة: <strong>${t.title}</strong>.</p>
<p>الموعد النهائى: ${t.dueDate.toLocaleDateString('ar-EG')}</p>`;
    try {
      await sendMail(t.assignee.email, '⏰ تذكير مهمة تنتهي بعد يومين', html);
      await prisma.task.update({ where: { id: t.id }, data: { lastReminderAt: new Date() } });
      sent++;
    } catch {}
  }
  return NextResponse.json({sent});
}
