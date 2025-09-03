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

// GET list entries
export async function GET(request: NextRequest) {
  const userId = getUserId(request);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const entries = await prisma.timeEntry.findMany({
    where: { userId },
    include: {
      project: {
        include: { client: true },
      },
    },
    orderBy: { startTs: "desc" },
  });
  return NextResponse.json(entries);
}

// POST create new entry
export async function POST(request: NextRequest) {
  const userId = getUserId(request);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { projectId, startTs, endTs, notes, billable = true } = await request.json();
  if (!projectId || !startTs)
    return NextResponse.json({ error: "projectId and startTs required" }, { status: 400 });

  // verify assignment exists and allows logging
  const assignment = await prisma.projectAssignment.findFirst({
    where: { projectId, userId, canLogTime: true },
    include: { project: true }
  });
  if (!assignment) return NextResponse.json({ error: "Not assigned to project or logging disabled" }, { status: 403 });
  const project = assignment.project;

  const startDate = new Date(startTs);
  const endDate = endTs ? new Date(endTs) : null;
  const durationMins = endDate ? Math.round((endDate.getTime() - startDate.getTime()) / 60000) : 0;

  const entry = await prisma.timeEntry.create({
    data: {
      projectId,
      userId,
      startTs: startDate,
      endTs: endDate,
      durationMins,
      notes,
      billable,
    },
  });
  await import('@/lib/notify').then(m=>m.notifyRole('ACCOUNTANT_MASTER',`وقت جديد بإنتظار الموافقة للمشروع #${projectId}`,'TIME_PENDING'));
  return NextResponse.json(entry, { status: 201 });
}
