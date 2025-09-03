import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import { unlink } from 'fs/promises';
import { prisma } from '@/lib/prisma';
import jwt from 'jsonwebtoken';

export const runtime = 'nodejs';
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';

function getUser(req: NextRequest) {
  const auth = req.headers.get('authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) return null;
  try {
    const payload = jwt.verify(token, JWT_SECRET) as any;
    return { id: Number(payload.sub ?? payload.id), role: payload.role };
  } catch {
    return null;
  }
}

// DELETE /api/project-attachments/[id]
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const user = getUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const attachId = Number(params.id);
  if (Number.isNaN(attachId)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });

  try {
    const attachment = await prisma.projectAttachment.findUnique({ where: { id: attachId } });
    if (!attachment) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    // TODO: authorization (project owner or admin) – simplified allow

    // remove db record
    await prisma.projectAttachment.delete({ where: { id: attachId } });

    // remove file from disk if inside public/uploads
    if (attachment.url.startsWith('/uploads/')) {
      const filePath = path.join(process.cwd(), 'public', attachment.url.replace('/uploads/', 'uploads/').split('/').slice(1).join(path.sep));
      try { await unlink(filePath); } catch { /* ignore */ }
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('attachment delete', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
