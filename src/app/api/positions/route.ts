import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
  const positions = await prisma.position.findMany({ orderBy: { id: 'asc' } });
  return NextResponse.json(positions);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, defaultRate, currency } = body;
    if (!name) return NextResponse.json({ error: 'Name is required' }, { status: 400 });

    const pos = await prisma.position.create({ data: { name, defaultRate, currency } });
    return NextResponse.json(pos, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
