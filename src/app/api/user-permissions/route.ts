import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';

async function auth(req: NextRequest): Promise<{ id: number; role: string } | null> {
  const hdr = req.headers.get('authorization') || '';
  const token = hdr.startsWith('Bearer ') ? hdr.slice(7) : null;
  if (!token) return null;
  try {
    const p = jwt.verify(token, JWT_SECRET) as any;
    return { id: Number(p.sub ?? p.id), role: p.role ?? 'STAFF' };
  } catch {
    return null;
  }
}

// GET /api/user-permissions?userId=123    → returns [{ page, enabled, scopeType, scopeId }]
export async function GET(req: NextRequest) {
  try {
    const user = await auth(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const userIdParam = req.nextUrl.searchParams.get('userId');
    if (!userIdParam) return NextResponse.json({ error: 'userId required' }, { status: 400 });
    const targetUserId = Number(userIdParam);

    // only OWNER or ADMIN can read others
    if (user.id !== targetUserId && user.role === 'STAFF') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const perms = await prisma.userPermission.findMany({
      where: { userId: targetUserId },
      include: { permission: true },
    });

    const formatted = perms.map((up) => ({
      page: up.permission.code,
      enabled: up.allowed,
      clientIds: ((up as any).clientIds ?? []).map(Number),
      projectIds: ((up as any).projectIds ?? []).map(Number),
      itemIds: ((up as any).itemIds ?? []).map(Number),
      lawyerIds: ((up as any).lawyerIds ?? []).map(Number),
    }));

    return NextResponse.json(formatted);
  } catch (err) {
    console.error('GET /api/user-permissions', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// POST body: { userId, permissions: [{ page, enabled }] }
export async function POST(req: NextRequest) {
  try {
    const user = await auth(req);
    if (!user || user.role === 'STAFF') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const data = await req.json();
    const { userId, permissions } = data as {
      userId: number;
      permissions: { page: string; enabled: boolean; clientIds?: number[]; projectIds?: number[]; itemIds?: number[]; lawyerIds?: number[] }[];
    };
    if (!userId || !Array.isArray(permissions)) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    // Ensure Permission records exist
    const pageCodes = [...new Set(permissions.map((p) => p.page))];
    await Promise.all(
      pageCodes.map((code) =>
        prisma.permission.upsert({
          where: { code },
          update: {},
          create: { code, name: code.replace(/_/g, ' ').toUpperCase() },
        })
      )
    );

    // Upsert user permissions within a transaction
    await prisma.$transaction(async (tx) => {
      // Clear existing permissions for listed pages
      await tx.userPermission.deleteMany({
        where: { userId, permission: { code: { in: pageCodes } } },
      });

      // Map permission codes to their IDs
      const permRows = await tx.permission.findMany({
        where: { code: { in: pageCodes } },
        select: { id: true, code: true },
      });
      const idByCode: Record<string, number> = Object.fromEntries(
        permRows.map((p) => [p.code, p.id])
      );

      // Insert new ones in bulk
      await tx.userPermission.createMany({
        data: permissions.map((perm) => ({
          userId,
          permissionId: idByCode[perm.page],
          allowed: perm.enabled,
          clientIds: perm.clientIds ?? [],
          projectIds: perm.projectIds ?? [],
          itemIds: perm.itemIds ?? [],
          lawyerIds: perm.lawyerIds ?? [],
        })),
        skipDuplicates: false,
      });
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('POST /api/user-permissions', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
