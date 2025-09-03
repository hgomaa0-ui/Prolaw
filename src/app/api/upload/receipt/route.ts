import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import crypto from 'crypto';

export const runtime = "nodejs"; // ensure Node APIs available

// POST /api/upload/receipt
// Accepts multipart/form-data with field "file". Saves under /public/uploads/receipts/
// Returns { url }
export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get('content-type') || '';
    if (!contentType.startsWith('multipart/form-data')) {
      return NextResponse.json({ error: 'Invalid content type' }, { status: 400 });
    }
    const formData = await req.formData();
    const file = formData.get('file');
    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: 'No file' }, { status: 400 });
    }

    const bytes = crypto.randomBytes(8).toString('hex');
    const ext = path.extname(file.name) || '.jpg';
    const filename = `${bytes}${ext}`;
    const publicDir = path.join(process.cwd(), 'public', 'uploads', 'receipts');
    await mkdir(publicDir, { recursive: true });
    const arrayBuffer = await file.arrayBuffer();
    await writeFile(path.join(publicDir, filename), Buffer.from(arrayBuffer));

    const url = `/uploads/receipts/${filename}`;
    return NextResponse.json({ url }, { status: 201 });
  } catch (err) {
    console.error('upload receipt error', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
