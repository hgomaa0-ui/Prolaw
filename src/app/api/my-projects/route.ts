import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-me";

function getUserId(request: NextRequest): number | null {
  const auth = request.headers.get("authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token) return null;
  try {
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
    const id = Number((payload as any).sub ?? (payload as any).id);
    return Number.isFinite(id) ? id : null;
  } catch {
    return null;
  }
}

// GET /api/my-projects -> projects the current user is assigned to with canLogTime=true
export async function GET(request: NextRequest) {
  const userId = getUserId(request);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const assignments = await prisma.projectAssignment.findMany({
    where: { userId, canLogTime: true },
    include: {
      project: {
        include: { client: true },
      },
      user: false,
    },
    orderBy: { project: { name: "asc" } },
  });

  const projects = assignments.map((a) => a.project);
  return NextResponse.json(projects);
}
