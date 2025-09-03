import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';

function auth(request: NextRequest) {
  const auth = request.headers.get('authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) return null;
  try {
    const dec = jwt.verify(token, JWT_SECRET) as any;
    return Number(dec.sub ?? dec.id);
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const userId = auth(request);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const id = Number(params.id);
  const bank = await prisma.bankAccount.findUnique({
    where: { id },
    include: {
      advancePayments: {
        include: {
          project: { select: { id: true, name: true } },
        },
        orderBy: { paidOn: 'desc' },
      },
    },
  });
  if (!bank) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(bank);
}
