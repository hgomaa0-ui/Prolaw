import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// PUT /api/assignments/[id]  -> update canLogTime
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = Number(params.id);
    const { canLogTime, readyForInvoicing } = await req.json();
    const updated = await prisma.projectAssignment.update({
      where: { id },
      data: { canLogTime, readyForInvoicing },
      include: { user: { select: { id: true, name: true } }, project: { select: { id: true, name: true } } },
    });
    return NextResponse.json(updated);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// DELETE /api/assignments/[id] -> delete assignment
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = Number(params.id);
    await prisma.projectAssignment.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
