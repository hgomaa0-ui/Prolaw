import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
function getUserId(request: NextRequest): number | null {
  const auth = request.headers.get("authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token) return null;
  try {
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
    const sub = payload.sub ?? payload.id;
    return sub ? Number(sub) : null;
  } catch {
    return null;
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  const userId = getUserId(request);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const id = Number(params.id);
  const data = await request.json();

  // ensure entry belongs to user
  const entry = await prisma.timeEntry.findFirst({ where: { id, userId } });
  if (!entry) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // convert ISO strings to Date objects if provided
  if (data.startTs) {
    data.startTs = new Date(data.startTs);
  }
  if (data.endTs !== undefined) {
    data.endTs = data.endTs ? new Date(data.endTs) : null;
  }
  // recalculate duration
  const start = (data.startTs as Date) || entry.startTs;
  const end = (data.endTs as Date | null) ?? entry.endTs;
  data.durationMins = end ? Math.round((end.getTime() - start.getTime()) / 60000) : entry.durationMins;

  try {
    const updated = await prisma.timeEntry.update({ where: { id }, data });
    return NextResponse.json(updated);
  } catch (err: any) {
    console.error("Update timeEntry error", err);
    return NextResponse.json({ error: "Server error", detail: err.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const userId = getUserId(request);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const id = Number(params.id);
  const entry = await prisma.timeEntry.findFirst({ where: { id, userId } });
  if (!entry) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await prisma.timeEntry.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
