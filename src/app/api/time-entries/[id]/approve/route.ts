import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-me";

interface JwtPayload { sub: number; role: string }

function getUser(request: NextRequest): { id: number; role: string } | null {
  const auth = request.headers.get("authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token) return null;
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
    return { id: Number(decoded.sub), role: decoded.role };
  } catch {
    return null;
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  const user = getUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const entryId = Number(params.id);
  const entry = await prisma.timeEntry.findUnique({ where: { id: entryId } });
  if (!entry) return NextResponse.json({ error: "Time entry not found" }, { status: 404 });

  if (user.role === "LAWYER_MANAGER") {
    // manager approval
    if (entry.managerApproved) {
      return NextResponse.json({ error: "Already manager-approved" }, { status: 400 });
    }
    const updated = await prisma.timeEntry.update({
      where: { id: entryId },
      data: {
        managerApproved: true,
        managerId: user.id,
      },
    });
    return NextResponse.json(updated);
  }

  if (user.role === "ACCOUNTANT_MASTER") {
    if (!entry.managerApproved) {
      return NextResponse.json({ error: "Manager approval required first" }, { status: 400 });
    }
    if (entry.accountantApproved) {
      return NextResponse.json({ error: "Already accountant-approved" }, { status: 400 });
    }
    const updated = await prisma.timeEntry.update({
      where: { id: entryId },
      data: {
        accountantApproved: true,
        accountantId: user.id,
      },
    });
    return NextResponse.json(updated);
  }

  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}
