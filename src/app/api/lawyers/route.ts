import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { Prisma } from '@prisma/client';

export async function GET(request: NextRequest) {
  // decode role & id from auth header
  const auth = request.headers.get('authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  let role: string | null = null;
  let userId: number | null = null;
  if (token) {
    try {
      const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
      role = payload.role;
      const claim = payload.sub ?? payload.id;
      if (claim) userId = Number(claim);
    } catch {}
  }
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // determine companyId of requester
  let companyId: number | null = null;
  if (userId) {
    const u = await prisma.user.findUnique({ where: { id: userId }, select: { companyId: true } });
    companyId = u?.companyId || null;
  }
  if (!companyId) {
    return NextResponse.json({ error: 'Company not found' }, { status: 401 });
  }

  let where: Prisma.UserWhereInput = { role: { in: ['ADMIN','ACCOUNTANT_MASTER','ACCOUNTANT_ASSISTANT','LAWYER_PARTNER','LAWYER_MANAGER','LAWYER'] }, companyId };

  if (role === 'LAWYER_MANAGER' && userId) {
    const managed = await prisma.managerLawyer.findMany({ where: { managerId: userId }, select: { lawyerId: true } });
    const ids = managed.map(m => m.lawyerId);
    where = { id: { in: ids }, companyId };
  }

  const lawyers = await prisma.user.findMany({
    where,
    include: { position: true },
    orderBy: { id: 'asc' },
  });
  return NextResponse.json(lawyers);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, email, positionId, phone, address, password, role = 'LAWYER', managedLawyerIds = [] } = body as {
      name: string; email: string; positionId?: number; phone?: string; address?: string; password: string; role?: string; managedLawyerIds?: number[];
    };
    if (!name || !email || !password) {
      return NextResponse.json({ error: 'Name and email are required' }, { status: 400 });
    }

    // determine companyId from creator
    const authHeader = req.headers.get('authorization') || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    let creatorCompanyId: number | null = null;
    if (token) {
      try {
        const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
        const creatorId = Number(payload.sub);
        const creator = await prisma.user.findUnique({ where: { id: creatorId }, select: { companyId: true } });
        creatorCompanyId = creator?.companyId || null;
      } catch {}
    }

    if (!creatorCompanyId) {
      return NextResponse.json({ error: 'Creator company not found' }, { status: 400 });
    }

    const lawyer = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash: await bcrypt.hash(password, 10),
        role,
        company: { connect: { id: creatorCompanyId } },
        position: positionId ? { connect: { id: positionId } } : undefined,
        phone,
        address,
      },
      include: { position: true },
    });
    // if lawyer is a manager, persist relations
    if (role === 'LAWYER_MANAGER') {
      // cleanup any existing (unlikely on create) then create
      if (managedLawyerIds && managedLawyerIds.length) {
        await prisma.managerLawyer.createMany({
          data: managedLawyerIds.map((lid: number) => ({ managerId: lawyer.id, lawyerId: lid })),
          skipDuplicates: true,
        });
      }
    }

    return NextResponse.json(lawyer, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
