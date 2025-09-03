import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { convert } from '@/lib/forex';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';

interface JwtPayload { sub?: string|number; id?: string|number; role?: string }
function getUser(request: NextRequest): { id: number; role: string } | null {
  const auth = request.headers.get('authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) return null;
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
    const id = decoded?.sub ?? decoded?.id;
    const role = (decoded as any)?.role ?? 'USER';
    return id ? { id: Number(id), role } : null;
  } catch {
    return null;
  }
}

const getUserId = (req: NextRequest) => getUser(req)?.id ?? null;

const getExpense = async (req: NextRequest, params: { id: string }) => {
  const userId = getUserId(req);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const expId = Number(params.id);
  const existing = await prisma.expense.findUnique({ where: { id: expId } });
  if (!existing || (existing.userId !== userId))
    return NextResponse.json({ error: 'Not found' }, { status: 404 });

  return existing;
};

const updateExpense = async (req: NextRequest, params: { id: string }, data: any) => {
  const userId = getUserId(req);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const expId = Number(params.id);
  const existing = await prisma.expense.findUnique({ where: { id: expId } });
  if (!existing || existing.userId !== userId)
    return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const updated = await prisma.expense.update({
    where: { id: expId },
    data,
  });
  return updated;
};

const deleteExpense = async (req: NextRequest, params: { id: string }) => {
  const userId = getUserId(req);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const expId = Number(params.id);
  const existing = await prisma.expense.findUnique({ where: { id: expId } });
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const allowedRoles = ['ADMIN','OWNER','ACCOUNTANT_MASTER','ACCOUNTANT_ASSISTANT'];
  if (existing.userId !== userId && !allowedRoles.includes(getUser(req)?.role))
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  if (existing.approved)
    return NextResponse.json({ error: 'Cannot delete approved expense' }, { status: 400 });

  await prisma.expense.delete({ where: { id: expId } });
  return { success: true };
};

/** GET single expense (optional) */
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const exp = await getExpense(req, params);
    if (!exp) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    return NextResponse.json(exp);
  } catch (e) {
    console.error('GET /api/expenses/[id]', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

/** UPDATE expense */
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await req.json();
    const { amount, currency, description, incurredOn, billable } = body;

    let finalAmount = amount ?? 0;
    let finalCurrency = currency ?? '';
    const existing = await getExpense(req, params);
    if (existing) {
      finalAmount = amount ?? existing.amount;
      finalCurrency = currency ?? existing.currency;
      if ((amount || currency) && existing.project?.advanceCurrency) {
        const projCur = existing.project.advanceCurrency;
        const srcCur = currency ?? existing.currency;
        if (srcCur !== projCur) {
          try {
            finalAmount = await convert(amount ?? existing.amount, srcCur, projCur);
            finalCurrency = projCur;
          } catch (e) {
            console.error('FX convert failed, keeping original', e);
          }
        }
      }
    }

    const updated = await updateExpense(req, params, {
      amount: finalAmount,
      currency: finalCurrency,
      description: description ?? undefined,
      incurredOn: incurredOn ? new Date(incurredOn) : undefined,
      billable: billable ?? undefined,
      where: { id: expId },
      data: {
        amount: finalAmount,
        currency: finalCurrency,
        description: description ?? undefined,
        incurredOn: incurredOn ? new Date(incurredOn) : undefined,
        billable: billable ?? undefined,
      },
    });
    return NextResponse.json(updated);
  } catch (e) {
    console.error('PUT /api/expenses/[id]', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

/** DELETE expense */
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {

    const result = await deleteExpense(req, params as any);
    // deleteExpense returns either NextResponse or plain object
    if ((result as any).success) return NextResponse.json(result);
    return result as any;



  } catch (e) {
    console.error('DELETE /api/expenses/[id]', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
