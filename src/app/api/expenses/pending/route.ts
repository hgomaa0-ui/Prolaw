import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';

function getUser(req: NextRequest) {
  const auth = req.headers.get('authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) return null;
  try {
    const d = jwt.verify(token, JWT_SECRET) as any;
    const sub = d?.sub ?? d?.id;
    const idNum = sub ? Number(sub) : NaN;
    return d && !Number.isNaN(idNum) ? { id: idNum, role: d.role } : null;
  } catch {
    return null;
  }
}

// GET /api/expenses/pending
export async function GET(req: NextRequest) {
  try {
    const user = getUser(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    // allow owner/admin/accountant roles
    const ALLOWED = ['OWNER','ADMIN','ACCOUNTANT_MASTER','ACCOUNTANT_ASSISTANT','MANAGING_PARTNER'];
    if (!ALLOWED.includes(String(user.role)))
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    // scope by company
    const uid = Number(user.id);
    if (!uid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const me = await prisma.user.findUnique({ where: { id: uid }, select: { companyId: true } });
    const companyId = me?.companyId ?? 0;

    const expenses = await prisma.expense.findMany({
      where: { 
        approved: false,
        project: { client: { companyId } },
      },
      orderBy: { incurredOn: 'asc' },
      include: {
        user: { select: { name: true } },
        project: { select: { name: true, client: { select: { name: true } } } },
      },
    });

    return NextResponse.json(expenses);
  } catch (e) {
    console.error('GET /api/expenses/pending', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
