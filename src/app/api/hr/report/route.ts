import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withCompany } from '@/lib/with-company';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';

function getRole(req: NextRequest): string | null {
  const auth = req.headers.get('authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) return null;
  try {
    const d: any = jwt.verify(token, JWT_SECRET);
    return d?.role || null;
  } catch {
    return null;
  }
}

function isHR(role: string | null) {
  if (!role) return false;
  const r = role.toUpperCase();
  return r === 'ADMIN' || r === 'OWNER' || r === 'HR_MANAGER' || r === 'HR';
}

export const GET = withCompany(async (req: NextRequest, companyId?: number) => {
  // derive companyId if still undefined
  if(!companyId){
    const auth = req.headers.get('authorization')||'';
    const token = auth.startsWith('Bearer ')? auth.slice(7):null;
    if(token){
      try{
        const payload:any = JSON.parse(Buffer.from(token.split('.')[1],'base64').toString());
        const uid = Number(payload.sub ?? payload.id);
        if(uid){
          const u = await prisma.user.findUnique({ where:{ id: uid }, select:{ companyId:true }});
          companyId = u?.companyId ?? undefined;
        }
      }catch{}
    }
  }
  const role = getRole(req);
  if (!isHR(role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  // Fetch all employees with salaries and user linkage
  const allEmps = await prisma.employee.findMany({
    include:{
      salaries:{ orderBy:{ effectiveFrom:'desc'}, take:1 },
      user:{ select:{ id:true, companyId:true }}
    }
  });
  // Filter by companyId if present
  const employees = companyId ? allEmps.filter(e=> (e.user?.companyId ?? companyId) === companyId) : allEmps;

  // assign missing companyId
  if(companyId){
    const missingUserIds = employees.filter(e=>!e.user?.companyId).map(e=>e.user?.id).filter(Boolean) as number[];
    if(missingUserIds.length){
      await prisma.user.updateMany({ where:{ id:{ in: missingUserIds } }, data:{ companyId } });
    }
  }

  const empIds = employees.map((e) => e.id);

  // Approved leaves this year
  const yearStart = new Date(new Date().getFullYear(), 0, 1);
  const approvedLeaves = await prisma.leaveRequest.findMany({
    where: {
      employeeId: { in: empIds },
      status: 'APPROVED',
      startDate: { gte: yearStart },
      ...(companyId? { employee: { user: { companyId } } }: {}),
    },
    include:{ employee:true }
  });

  const leaveStats: Record<number, { annual: number; unpaid: number }> = {};
  for (const l of approvedLeaves) {
    const days = Math.ceil((l.endDate.getTime() - l.startDate.getTime()) / 86400000) + 1;
    if (!leaveStats[l.employeeId]) leaveStats[l.employeeId] = { annual: 0, unpaid: 0 };
    if (l.type === 'ANNUAL') leaveStats[l.employeeId].annual += days;
    if (l.type === 'UNPAID') leaveStats[l.employeeId].unpaid += days;
  }

  // Penalties totals
  const penalties = await prisma.penalty.groupBy({
    by: ['employeeId'],
    _sum: { amount: true },
    where: { employeeId: { in: empIds } },
  });
  const penaltyMap = Object.fromEntries(penalties.map((p) => [p.employeeId, Number(p._sum.amount) || 0]));

  const report = employees.sort((a,b)=>a.id-b.id).map((e,idx) => {
    const latestSalary = e.salaries[0];
    const leaves = leaveStats[e.id] || { annual: 0, unpaid: 0 };
    return {
      seq: idx+1,
      id: e.id,
      name: e.name,
      leaveBalance: e.leaveBalanceDays ?? 0,
      latestSalary: latestSalary ? Number(latestSalary.amount) : 0,
      salaryCurrency: latestSalary ? latestSalary.currency : 'USD',
      annualConsumed: leaves.annual,
      unpaidDays: leaves.unpaid,
      penaltiesTotal: penaltyMap[e.id] || 0,
    };
  });

  return NextResponse.json(report);
});
