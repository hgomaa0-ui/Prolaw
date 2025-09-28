import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';

function getUser(req: NextRequest){
  const auth = req.headers.get('authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if(!token) return null;
  try{
    const payload = jwt.verify(token, JWT_SECRET) as any;
    return { id: Number(payload.sub ?? payload.id), role: payload.role };
  }catch{ return null; }
}

function canAdmin(role: string|null){
  return ['ADMIN','OWNER','ACCOUNTANT_MASTER','MANAGING_PARTNER','HR_MANAGER'].includes(role||'');
}

// POST /api/admin/expenses
// Body: { userId, projectId, amount, currency, description?, incurredOn?, billable?, receiptUrl? }
export async function POST(req: NextRequest){
  const me = getUser(req);
  if(!me) return NextResponse.json({error:'Unauthorized'},{status:401});
  if(!canAdmin(me.role)) return NextResponse.json({error:'Forbidden'},{status:403});

  const { userId, projectId, amount, currency, description, incurredOn, billable = true, receiptUrl } = await req.json();
  if(!userId || !projectId || !amount || !currency){
    return NextResponse.json({error:'userId, projectId, amount, currency are required'},{status:400});
  }

  // Company of the acting admin
  const adminUser = await prisma.user.findUnique({ where: { id: Number(me.id) }, select: { companyId: true } });
  const adminCompanyId = adminUser?.companyId ?? null;
  if(!adminCompanyId) return NextResponse.json({error:'Admin company not found'},{status:400});

  // Ensure the user and project exist within the same company
  const user = await prisma.user.findUnique({ where: { id: Number(userId) }, select: { id:true, companyId:true } });
  if(!user) return NextResponse.json({error:'User not found'},{status:404});
  if(user.companyId !== adminCompanyId) return NextResponse.json({error:'User not in your company'},{status:403});
  const project = await prisma.project.findUnique({ where: { id: Number(projectId) }, select: { id:true, client: { select: { companyId: true } } } });
  if(!project) return NextResponse.json({error:'Project not found'},{status:404});
  if(project.client.companyId !== adminCompanyId) return NextResponse.json({error:'Project not in your company'},{status:403});

  const exp = await prisma.expense.create({
    data: {
      userId: Number(userId),
      projectId: Number(projectId),
      amount: Number(amount),
      currency: String(currency),
      description: description || 'OTHER',
      incurredOn: incurredOn ? new Date(incurredOn) : new Date(),
      billable: Boolean(billable),
      // @ts-ignore approved exists in latest schema
      approved: false,
      receiptUrl: receiptUrl || null,
    }
  });
  return NextResponse.json(exp, {status:201});
}
