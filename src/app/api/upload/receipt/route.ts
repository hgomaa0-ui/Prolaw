import { NextRequest, NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME!,
});

export const runtime = "nodejs";

// POST /api/upload/receipt
// Accepts multipart/form-data with field "file". Uploads to Cloudinary unsigned preset.
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

    const arrayBuffer = await file.arrayBuffer();
    const mime = file.type || 'application/pdf';
    const dataUri = `data:${mime};base64,${Buffer.from(arrayBuffer).toString('base64')}`;

    const upload = await cloudinary.uploader.unsigned_upload(
      dataUri,
      process.env.CLOUDINARY_UNSIGNED_PRESET_RECEIPT!,
      {
        folder: 'receipts',
        resource_type: 'auto',
      }
    );
    const url = upload.secure_url;
    return NextResponse.json({ url }, { status: 201 });
  } catch (err) {
    console.error('upload receipt error', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
