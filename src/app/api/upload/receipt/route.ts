import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME!,
});

export const runtime = "nodejs";

// POST /api/upload/receipt
// Accepts multipart/form-data with field "file". Uploads to Cloudinary unsigned preset.
// Returns { url }
// expects fields: file (File), expenseId (number)
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

    const expenseIdRaw = formData.get('expenseId');
    if (!expenseIdRaw) return NextResponse.json({ error: 'Missing expenseId' }, { status: 400 });
    const expenseId = Number(expenseIdRaw);
    const buffer = Buffer.from(await file.arrayBuffer());
    const mime = file.type || 'application/pdf';

    await prisma.expense.update({
      where: { id: expenseId },
      data: {
        receiptFile: buffer,
        receiptMime: mime,
      },
    });

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (err) {
    console.error('upload receipt error', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
