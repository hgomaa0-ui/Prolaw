import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-me";

interface AuthInfo { id: number | null; role: string; companyId: number | null }
function getAuth(request: NextRequest): AuthInfo {
  const auth = request.headers.get("authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token) return { id: null, role: "GUEST" };
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as jwt.JwtPayload | string;
        const sub = typeof decoded === "string" ? Number(decoded) : Number((decoded as any).id ?? (decoded as any).sub);
    const role = typeof decoded === "string" ? "STAFF" : (decoded as any).role ?? "STAFF";
    const companyId = typeof decoded === "string" ? null : (decoded as any).companyId ? Number((decoded as any).companyId) : null;
    return { id: sub, role, companyId };
  } catch {
    return { id: null, role: "GUEST" };
  }
}

export async function GET(request: NextRequest) {
  const { id, role, companyId } = getAuth(request);
  if (!id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Optional query: clientId, projectId, lawyerId, from, to
  const { searchParams } = new URL(request.url);
  const clientId = searchParams.get("clientId");
  const projectId = searchParams.get("projectId");
  const userIdFilter = searchParams.get("userId");
  const from = searchParams.get("from"); // ISO string
  const to = searchParams.get("to");

  // Build where clause for TimeEntry joined to Project
  const where: any = {};
  if (from || to) where.startTs = {};
  if (from) where.startTs.gte = new Date(from);
  if (to) where.startTs.lte = new Date(to);
  if (projectId) where.projectId = Number(projectId);
  if (companyId) where.project = { ...where.project, companyId };
  if (userIdFilter) where.userId = Number(userIdFilter);

  // STAFF can only see their own entries
  if (role === "STAFF") {
    where.userId = id;
  }
  // LAWYER_MANAGER can only see managed lawyers
  if (role === "LAWYER_MANAGER") {
    const managed = await prisma.managerLawyer.findMany({ where: { managerId: id }, select: { lawyerId: true } });
    const ids = managed.map(m => m.lawyerId);
    if (!ids.length) return NextResponse.json({ rows: [], totals: {} });
    where.userId = { in: ids };
  }

  // If client filter: need project of client
  if (clientId) {
    where.project = { ...(where.project||{}), clientId: Number(clientId) };
  }

  /*
    We assume TimeEntry has: durationMins, projectId, lawyerId
    ProjectAssignment stores hourlyRate, currency, projectId, lawyerId
  */

  const entries = await prisma.timeEntry.findMany({
    where,
    include: {
      project: { select: { id: true, name: true, clientId: true } },
      user: { select: { id: true, name: true } },
    },
  });

  // fetch assignment rates into map for quick lookup
  const assignmentRates = await prisma.projectAssignment.findMany({
    where: {
      projectId: projectId ? Number(projectId) : undefined,
      userId: userIdFilter ? Number(userIdFilter) : undefined,
    },
  });
  const rateMap = new Map<string, { rate: number; currency: string | null }>();
  assignmentRates.forEach((a: any) => rateMap.set(`${a.projectId}-${a.userId}`, { rate: a.hourlyRate ? Number(a.hourlyRate) : 0, currency: a.currency }));

  // aggregate
  const report: Record<string, any> = {};
  for (const e of entries) {
    const key = `${e.projectId}-${e.userId}`;
    const hrs = e.durationMins / 60;
    const rateObj = rateMap.get(key) || { rate: 0, currency: null };
    if (!report[key]) {
      report[key] = {
        projectId: e.projectId,
        projectName: e.project.name,
        lawyerId: e.userId,
        lawyerName: e.user?.name ?? "",
        hours: 0,
        rate: rateObj.rate,
        currency: rateObj.currency,
        total: 0,
      };
    }
    report[key].hours += hrs;
  }

  // compute labor totals first
  Object.values(report).forEach((r: any) => {
    r.laborTotal = r.hours * r.rate;
  });

  /* ---------- EXPENSES ---------- */
  const expenseWhere: any = {
    billable: true,
  };
  if (from || to) expenseWhere.incurredOn = {};
  if (from) expenseWhere.incurredOn.gte = new Date(from);
  if (to) expenseWhere.incurredOn.lte = new Date(to);
  if (projectId) expenseWhere.projectId = Number(projectId);
  if (companyId) expenseWhere.project = { ...(expenseWhere.project||{}), companyId };
  if (userIdFilter) expenseWhere.userId = Number(userIdFilter);
  if (role === "STAFF") {
    expenseWhere.userId = id;
  }
  if (clientId) {
    expenseWhere.project = { ...(expenseWhere.project||{}), clientId: Number(clientId) };
  }

  const expenses = await prisma.expense.findMany({
    where: expenseWhere,
    include: {
      project: { select: { id: true, name: true } },
    },
  });

  for (const ex of expenses) {
    const key = `${ex.projectId}-${ex.userId}`;
    if (!report[key]) {
      report[key] = {
        projectId: ex.projectId,
        projectName: ex.project?.name ?? "",
        lawyerId: ex.userId,
        lawyerName: "", // will fill later by joining
        hours: 0,
        rate: 0,
        currency: null,
        laborTotal: 0,
        expenses: 0,
      };
    }
    report[key].expenses = (report[key].expenses || 0) + Number(ex.amount);
  }

  // final total including expenses
  Object.values(report).forEach((r: any) => {
    r.expenses = r.expenses || 0;
    r.total = (r.laborTotal || 0) + r.expenses;
  });

  // ---------- aggregate totals per currency ----------
  const totals: Record<string, { labor: number; expenses: number; total: number }> = {};
  Object.values(report).forEach((r: any) => {
    const cur = r.currency || "UNKNOWN";
    if (!totals[cur]) totals[cur] = { labor: 0, expenses: 0, total: 0 };
    totals[cur].labor += r.laborTotal || 0;
    totals[cur].expenses += r.expenses || 0;
    totals[cur].total += r.total || 0;
  });

  return NextResponse.json({ rows: Object.values(report), totals });
}
