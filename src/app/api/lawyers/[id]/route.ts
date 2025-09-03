import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';


export async function PUT(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id: idStr } = await ctx.params;
    const id = Number(idStr);
    const body = await req.json();
    const { name, email, phone, address, positionId, password, managedLawyerIds = [] } = body as {
      name?: string; email?: string; phone?: string; address?: string; positionId?: number; password?: string; managedLawyerIds?: number[];
    };

    const data: any = { name, email, phone, address };
    if (positionId !== undefined) data.positionId = positionId || null;
    if (password) data.passwordHash = await bcrypt.hash(password, 10);

    const updated = await prisma.user.update({ where: { id }, data, include: { position: true } });

    // update manager-lawyer relations if this user is a manager
    if (updated.role === 'LAWYER_MANAGER') {
      // remove existing
      await prisma.managerLawyer.deleteMany({ where: { managerId: updated.id } });
      if (managedLawyerIds && managedLawyerIds.length) {
        await prisma.managerLawyer.createMany({
          data: managedLawyerIds.map((lid: number) => ({ managerId: updated.id, lawyerId: lid })),
          skipDuplicates: true,
        });
      }
    }
    return NextResponse.json(updated);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id: idStr } = await ctx.params;
    const id = Number(idStr);
    await prisma.user.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
