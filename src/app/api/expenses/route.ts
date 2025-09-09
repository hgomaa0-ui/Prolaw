import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { convert } from '@/lib/forex';


/**
 * Expenses API
 * – GET  : يرجع جميع مصروفات المستخدم الحالى
 * – POST : ينشئ مصروفاً فى حالة pending (approved=false)
 *   لا يوجد أى منطق خصم هنا؛ الخصم يتم فى ‎/api/expenses/[id]/approve‎
 */

function getUserId(req: NextRequest): number | null {
  const auth = req.headers.get('authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) return null;
  try {
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
    const sub = payload.sub ?? payload.id;
    return sub ? Number(sub) : null;
  } catch {
    return null;
  }
}

// -----------------------------------------------------------------------------
// GET /api/expenses
// -----------------------------------------------------------------------------
export async function GET(req: NextRequest) {
  try {
    const userId = getUserId(req);
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const expenses = await prisma.expense.findMany({
      where: { userId },
      orderBy: { incurredOn: 'desc' },
      include: {
        project: { select: { name: true, client: { select: { name: true } } } },
      },
    });

    return NextResponse.json(expenses);
  } catch (err) {
    console.error('GET /api/expenses', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// -----------------------------------------------------------------------------
// POST /api/expenses
// -----------------------------------------------------------------------------
export async function POST(req: NextRequest) {
  try {
    const userId = getUserId(req);
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const {
      projectId,
      amount,
      currency,
      type,
      description,
      receiptUrl,
      billable = true,
      incurredOn,
    } = await req.json();

    if (!projectId || !amount || !currency) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    const finalType = type || 'OTHER';

    // السماح للمستخدم إذا كان OWNER/ADMIN/ACCOUNTANT_* أو مُعيَّن على المشروع
    const user = await prisma.user.findUnique({ where: { id: userId } });
    const highRoles = ['OWNER','ADMIN','ACCOUNTANT_MASTER','ACCOUNTANT_ASSISTANT'];
    const assigned = await prisma.projectAssignment.findFirst({ where: { projectId, userId } });
    if (!assigned && !highRoles.includes(user?.role ?? '')) {
      return NextResponse.json({ error: 'Not assigned to project' }, { status: 403 });
    }

    // decide target currency:
    // 1) if project has any EXPENSE-type advance payments, use their currency (assumes all same)
    // 2) else if project.advanceCurrency defined, use it
    // 3) else keep submitted currency
    const firstAdvance = await prisma.advancePayment.findFirst({
      where: { projectId, accountType: 'EXPENSE' },
      orderBy: { paidOn: 'asc' },
    });
    const targetCurrency = firstAdvance?.currency ?? currency;
    let finalAmount: number = amount;
    let finalCurrency: string = currency;
    if (currency !== targetCurrency) {
      try {
        finalAmount = await convert(amount, currency, targetCurrency);
        finalCurrency = targetCurrency;
      } catch (e) {
        console.error('FX conversion failed, saving original currency', e);
      }
    }

    // @ts-expect-error approved is present after the last migration
    const expense = await prisma.expense.create({
      data: {
        projectId,
        userId,
        amount: finalAmount,
        currency: finalCurrency,
        description: description || finalType,
        incurredOn: incurredOn ? new Date(incurredOn) : new Date(),
        billable,
        approved: false,
        receiptUrl,
      },
    });

    await import('@/lib/notify').then(m=>m.notifyRole('ACCOUNTANT_MASTER',`مصاريف جديدة بإنتظار الموافقة للمشروع #${projectId}`,'EXPENSE_PENDING'));

    return NextResponse.json(expense, { status: 201 });
  } catch (err) {
    console.error('POST /api/expenses', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}