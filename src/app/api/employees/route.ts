import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';

interface AuthInfo { role: string | null; companyId: number | null; }
function getAuth(req: NextRequest): AuthInfo {
  const auth = req.headers.get('authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) return { role: null, companyId: null };
  try {
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
    return {
      role: payload.role ?? null,
      companyId: payload.companyId ? Number(payload.companyId) : null,
    };
  } catch {
    return { role: null, companyId: null };
  }
}

function getUserRole(req: NextRequest){
  return getAuth(req).role;
}

function isHR(role: string | null) {
  return role === 'ADMIN' || role === 'HR_MANAGER' || role === 'OWNER' || role === 'HR';
}

// -----------------------------------------------------------------------------
// GET /api/employees
// -----------------------------------------------------------------------------
export async function GET(req: NextRequest) {
    const { role, companyId } = getAuth(req);
  if (!isHR(role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  if (!companyId) return NextResponse.json({ error: 'No company' }, { status: 400 });

  const employees = await prisma.employee.findMany({
    where: { user: { companyId } },
    include: {
      salaries: {
        orderBy: { effectiveFrom: 'desc' },
        take: 1,
      },
    },
    orderBy: { id: 'desc' },
  });
  return NextResponse.json(employees);
}

// -----------------------------------------------------------------------------
// POST /api/employees
// -----------------------------------------------------------------------------
export async function POST(req: NextRequest) {
  const { role: userRole, companyId } = getAuth(req);
  
  if (!isHR(userRole)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { name, email, password, positionId, role: newRole = 'LAWYER', status = 'ACTIVE', department, hireDate, salaryAmount, salaryCurrency = 'USD', salaryStart, projectIds = [], lawyerIds = [] } = await req.json();
  if (!name || !email || !salaryAmount) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }
  // find or create user
  const existingUser = await prisma.user.findUnique({ where: { email } });
  let userId: number;
  let existingEmployee: any = null;
  if (existingUser) {
    userId = existingUser.id;
    // update role if changed
    if (existingUser.role !== newRole) {
      await prisma.user.update({ where: { id: userId }, data: { role: newRole, positionId: positionId ? Number(positionId) : undefined, ...(companyId ? { companyId } : {}), ...(password ? { passwordHash: await bcrypt.hash(password, 10) } : {}) } });
    }
    // check if employee already exists for this user
    existingEmployee = await prisma.employee.findUnique({ where: { userId } });
  } else {
    const newUser = await prisma.user.create({ data: { name, email, passwordHash: password ? await bcrypt.hash(password, 10) : '', role: newRole, positionId: positionId ? Number(positionId) : undefined, ...(companyId ? { companyId } : {}) } });
    userId = newUser.id;
  }

  if (existingEmployee) {
    return NextResponse.json({ error: 'Employee already exists for this user' }, { status: 400 });
  }

  const employee = await prisma.employee.create({
    data: {
      name,
      email,
      status,
      department,
      hireDate: hireDate ? new Date(hireDate) : undefined,
      userId,
      salaries: {
        create: {
          amount: salaryAmount,
          currency: salaryCurrency,
          effectiveFrom: salaryStart ? new Date(salaryStart) : new Date(),
        },
      },
    },
    include: {
      salaries: true,
      user: { select: { id: true, role: true } },
    },
  });
  // create project assignments if provided
  if(Array.isArray(projectIds) && projectIds.length){
    await prisma.projectAssignment.createMany({ data: projectIds.map((pid:number)=>({ userId, projectId: pid })) , skipDuplicates:true});
  }
  // create manager-lawyer relations if manager role and lawyerIds provided
  if((newRole==='LAWYER_MANAGER' || newRole==='LAWYER_PARTNER') && Array.isArray(lawyerIds) && lawyerIds.length){
    await prisma.managerLawyer.createMany({ data: lawyerIds.map((lid:number)=>({ managerId: userId, lawyerId: lid })), skipDuplicates:true});
  }
  return NextResponse.json(employee, { status: 201 });
}
