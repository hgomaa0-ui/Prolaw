import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const projectId = parseInt(params.id);
  const tasks = await prisma.task.findMany({
    where: { projectId },
    include: { assignee: { select: { name: true } } },
    orderBy: { dueDate: 'asc' },
  });
  return NextResponse.json(tasks);
}