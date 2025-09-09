import { NextRequest, NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import { prisma } from '@/lib/prisma';

export const runtime = "nodejs";
import crypto from 'crypto';

// POST /api/upload/receipt
// يقبل multipart/form-data به الحقول: file (الإيصال)، expenseId (رقم المصروف).
// يرفع الملف إلى Vercel Blob ويُخزّن الرابط public في حقل receiptUrl.
// يُرجع { url } عند النجاح.
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
    const expenseId = expenseIdRaw ? Number(expenseIdRaw) : null;
        // رفع إلى Vercel Blob
    const ext = file.name.split('.').pop() || 'dat';
    const key = `receipts/${crypto.randomUUID()}.${ext}`;

    const { url } = await put(key, file, {
      access: 'public',
      token: process.env.BLOB_RW_TOKEN || process.env.BLOB_READ_WRITE_TOKEN,
    });

    if(expenseId){
      await prisma.expense.update({ where:{ id:expenseId }, data:{ receiptUrl:url } });
    }
    return NextResponse.json({ url }, { status: 201 });
  } catch (err) {
    console.error('upload receipt error', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
