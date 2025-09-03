import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from '@/utils/auth';
import prisma from '@/lib/prisma';

// GET /api/users/[id]/permissions -> list explicit permissions for user
export async function GET(_: NextRequest, ctx: { params: { id: string } | Promise<{ id: string }> }) {
  const { id } = await ctx.params as { id: string };
  const userId = Number(id);
  const records = await prisma.userPermission.findMany({
    where: { userId },
    include: { permission: true },
  });
  return NextResponse.json(records.map(r => ({ code: r.permission.code, allowed: r.allowed })));
}

// PUT body: { permissions: { [code:string]: boolean } }
export async function PUT(req: NextRequest, ctx: { params: { id: string } | Promise<{ id: string }> }) {
  const { id } = await ctx.params as { id: string };
  const userId = Number(id);
  const currentUser = await getAuth(req);
  // Allow OWNER or ADMIN, or any user who already has manage_lawyers permission
  if (!currentUser) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const isSuper = currentUser.role === 'OWNER' || currentUser.role === 'ADMIN';
  let hasManage = false;
  if (!isSuper) {
    const perm = await prisma.userPermission.findFirst({
      where: {
        userId: currentUser.id,
        allowed: true,
        permission: { code: 'manage_lawyers' },
      },
      include: { permission: true },
    });
    hasManage = !!perm;
  }
  if (!isSuper && !hasManage) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const { permissions } = await req.json();
  if (!permissions || typeof permissions !== 'object') {
    return NextResponse.json({ error: 'permissions object required' }, { status: 400 });
  }

  // Reset explicit permissions for this user then recreate from payload
  await prisma.userPermission.deleteMany({ where: { userId } });

  for (const [code, allowed] of Object.entries(permissions)) {
    // ensure permission record exists
    await prisma.permission.upsert({
      where: { code },
      update: {},
      create: { code, name: code.replace(/_/g, ' ') },
    });
    await prisma.userPermission.create({
      data: {
        allowed: Boolean(allowed),
        user: { connect: { id: userId } },
        permission: { connect: { code } },
      },
    });
  }
  return NextResponse.json({ ok: true });
}

