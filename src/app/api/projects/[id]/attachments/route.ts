import { NextRequest, NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import crypto from 'crypto';
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

// GET /api/projects/[id]/attachments => list attachments
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const projectId = Number(params.id);
  if (Number.isNaN(projectId)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
  try {
    const items = await prisma.projectAttachment.findMany({ where: { projectId }, orderBy: { createdAt: 'desc' } });
    return NextResponse.json(items);
  } catch (err) {
    console.error('attachments GET', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// POST /api/projects/[id]/attachments multipart/form-data  fields: files=File[], type=AttachmentType
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const user = getUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const projectId = Number(params.id);
  if (Number.isNaN(projectId)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });

  try {
    const contentType = req.headers.get('content-type') || '';
    if (!contentType.startsWith('multipart/form-data')) {
      return NextResponse.json({ error: 'Invalid content type' }, { status: 400 });
    }
    const form = await req.formData();
    const files = form.getAll('files').filter(f => f instanceof File) as File[];
    if (files.length === 0) return NextResponse.json({ error: 'No files' }, { status: 400 });
    const typeStr = (form.get('type') as string) || 'OTHER';
    const type = ['POWER_OF_ATTORNEY', 'CONTRACT', 'OTHER'].includes(typeStr) ? typeStr : 'OTHER';

    const saved: any[] = [];

    for (const file of files) {
      const extMatch = /\.[A-Za-z0-9]+$/.exec(file.name || '');
      const ext = extMatch ? extMatch[0] : '.dat';
      const filename = `${crypto.randomBytes(8).toString('hex')}${ext}`;
      const arrayBuffer = await file.arrayBuffer();
      // upload to Vercel Blob (public)
      const { url } = await put(`attachments/${projectId}/${filename}`, arrayBuffer as ArrayBuffer, { access:'public', addRandomSuffix:false });
      const record = await prisma.projectAttachment.create({ data: { projectId, type: type as any, url, uploadedById: user.id } });
      saved.push(record);
    }
    return NextResponse.json(saved, { status: 201 });
  } catch (err) {
    console.error('attachments POST', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
