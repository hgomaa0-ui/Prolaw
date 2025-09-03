import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
import { prisma } from '@/lib/prisma';

// key constant
const RATE_KEY = 'EX_RATE_EGP_USD';

export async function GET() {
  const setting = await prisma.setting.findUnique({ where: { key: RATE_KEY } });
  const rate = setting ? Number(setting.value) : null;
  return NextResponse.json({ rate });
}

export async function PUT(req: NextRequest) {
  let body: any = {};
  try { body = await req.json(); } catch {}
  const rate = Number(body?.rate);
  if (!rate || isNaN(rate) || rate <= 0) {
    return NextResponse.json({ error: 'Invalid rate' }, { status: 400 });
  }
  await prisma.setting.upsert({
    where: { key: RATE_KEY },
    update: { value: String(rate) },
    create: { key: RATE_KEY, value: String(rate) },
  });
  return NextResponse.json({ rate: Number(rate) });
}
