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
    return d ? { id: Number(d.sub), companyId: d.companyId } : null;
  } catch {
    return null;
  }
}

// DELETE /api/cash/[id]  (delete entire cash transaction containing the line)
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const user = getUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const lineId = Number(params.id);
  if (isNaN(lineId)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
  try {
    // fetch the transaction line and its transaction
    const line = await prisma.transactionLine.findUnique({ where: { id: lineId } , include:{ transaction:true}});
    if (!line) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if (line.transaction?.companyId && user.companyId && line.transaction.companyId !== user.companyId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    // delete whole transaction (will cascade lines)
    await prisma.transaction.delete({ where: { id: line.transactionId } });
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('DELETE cash line', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
