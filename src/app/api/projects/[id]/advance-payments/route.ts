import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import jwt from "jsonwebtoken";
import { postTransaction } from '@/lib/gl';

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-me";

function getUserId(request: NextRequest): number | null {
  const auth = request.headers.get("authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token) return null;
  try {
          const decoded = jwt.verify(token, JWT_SECRET) as any;
      return Number(decoded.id ?? decoded.sub);
    return Number(decoded.sub);
  } catch {
    return null;
  }
}

// POST /api/projects/[id]/advance-payments
// Body: { amount: number, currency: string, accountType?: 'TRUST' | 'EXPENSE', notes?: string }
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
  const userId = getUserId(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const projectId = Number(params.id);
  const body = await req.json();
  const { amount, currency = "USD", accountType = "TRUST", notes = "" } = body;

  if (!amount || isNaN(Number(amount))) {
    return NextResponse.json({ error: "amount required" }, { status: 400 });
  }

  // verify project exists and belongs to user (owner or owner role)
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (project.ownerId !== userId && !['OWNER','ADMIN','ACCOUNTANT_MASTER','ACCOUNTANT_ASSISTANT'].includes(user?.role as string)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const amt = Number(amount);

  // create advance payment record
  const adv = await prisma.advancePayment.create({
    data: {
      projectId,
      amount: amt,
      currency,
      accountType,
      notes,
    },
  });

  // if TRUST or EXPENSE: credit project trust account
  if (accountType === "TRUST" || accountType === "EXPENSE") {
    // find or create trust account (project-specific, else create)
    let acct = await prisma.trustAccount.findFirst({
      where: { clientId: project.clientId, projectId, currency },
    });
    if (!acct) {
      acct = await prisma.trustAccount.create({
        data: {
          clientId: project.clientId,
          projectId,
          currency,
        },
      });
    }
    // update trust account balance & transaction
    await prisma.$transaction([
      prisma.trustTransaction.create({
        data: {
          trustAccountId: acct.id,
          projectId,
          txnType: "CREDIT",
          amount: amt,
          description: notes || "Advance payment (trust)",
        },
      }),
      prisma.trustAccount.update({
        where: { id: acct.id },
        data: { balance: { increment: amt } },
      }),
    ]);

    // No GL journal entry per user request; balance already updated in trustAccount
  }

    return NextResponse.json(adv, { status: 201 });
  } catch (err: any) {
    console.error('Advance payment add error', err);
    return NextResponse.json({ error: err?.message || 'Server error' }, { status: 500 });
  }
}
