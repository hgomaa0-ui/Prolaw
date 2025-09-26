import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';

function getUserRole(req: NextRequest): string | null {
  const auth = req.headers.get('authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) return null;
  try {
    const d = jwt.verify(token, JWT_SECRET) as any;
    return d?.role || null;
  } catch {
    return null;
  }
}

function isHR(role: string | null) {
  return role === 'ADMIN' || role === 'OWNER' || (role?.startsWith('HR') ?? false);
}

export async function GET(req: NextRequest, context: Promise<{ params: { id: string } }>) {
  const { params } = await context;
  const role = getUserRole(req);
  if (!isHR(role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const id = Number(params.id);
  const emp = await prisma.employee.findUnique({
    where: { id },
    include: {
      salaries: { orderBy: { effectiveFrom: 'desc' } },
      user: { select: { role: true, positionId: true } },
    },
  });
  if (!emp) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  let projectIds:number[]=[];
  let lawyerIds:number[]=[];
  if(emp.userId){
    projectIds = (await prisma.projectAssignment.findMany({ where:{ userId: emp.userId }, select:{ projectId:true } })).map(p=>p.projectId);
    lawyerIds = (await prisma.managerLawyer.findMany({ where:{ managerId: emp.userId }, select:{ lawyerId:true } })).map(l=>l.lawyerId);
  }
  return NextResponse.json({ ...emp, projectIds, lawyerIds });
}

export async function PUT(req: NextRequest, context: Promise<{ params: { id: string } }>) {
  const { params } = await context;
  const role = getUserRole(req);
  if (!isHR(role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const id = Number(params.id);
  const { name, email, status, department, password, hireDate, leaveBalanceDays, positionId, role: newRole, salaryAmount, salaryCurrency, salaryStart, projectIds = undefined, lawyerIds = undefined } = await req.json();

  const updates: any = { name, email, status, department, hireDate: hireDate ? new Date(hireDate) : undefined, ...(leaveBalanceDays!==undefined ? { leaveBalanceDays: Number(leaveBalanceDays) } : {}) };
  const tx = await prisma.$transaction(async (tx) => {
    const employee = await tx.employee.update({ where: { id }, data: updates });
    if (salaryAmount) {
      const latest = await tx.salary.findFirst({ where: { employeeId: id }, orderBy: { effectiveFrom: 'desc' } });
      const amountStr = salaryAmount?.toString();
      if (latest) {
        await tx.salary.update({ where: { id: latest.id }, data: { amount: amountStr, currency: salaryCurrency || latest.currency } });
      } else {
        await tx.salary.create({
          data: {
            employeeId: id,
            amount: amountStr,
            currency: salaryCurrency || 'USD',
            effectiveFrom: salaryStart ? new Date(salaryStart) : new Date(),
          },
        });
      }
    }
    // update user's position and/or role if provided
    if (positionId !== undefined || newRole !== undefined || password !== undefined) {
      const userData:any = {
        ...(positionId !== undefined ? { positionId: positionId ? Number(positionId) : null } : {}),
        ...(newRole !== undefined ? { role: newRole } : {}),
      };
      if(password!==undefined && password){
        userData.passwordHash = await bcrypt.hash(password,10);
      }
      await tx.user.update({ where:{ id: employee.userId }, data: userData });
    }
      // project & lawyer assignments handling inside same transaction for consistency
      if(projectIds !== undefined){
        // clear existing then re-create
        await tx.projectAssignment.deleteMany({ where: { userId: employee.userId } });
        if(Array.isArray(projectIds) && projectIds.length){
          await tx.projectAssignment.createMany({ data: projectIds.map((pid:number)=>({ userId: employee.userId, projectId: pid })), skipDuplicates:true });
        }
      }
      if(lawyerIds !== undefined){
        await tx.managerLawyer.deleteMany({ where: { managerId: employee.userId } });
        if(Array.isArray(lawyerIds) && lawyerIds.length){
          await tx.managerLawyer.createMany({ data: lawyerIds.map((lid:number)=>({ managerId: employee.userId, lawyerId: lid })), skipDuplicates:true });
        }
      }
      return employee;
  });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest, context: Promise<{ params: { id: string } }>) {
  const { params } = await context;
  const role = getUserRole(req);
  if (!isHR(role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const id = Number(params.id);
  try {
    await prisma.$transaction([
      prisma.payrollItem.deleteMany({ where:{ employeeId: id }}),
      prisma.salaryDeduction.deleteMany({ where:{ employeeId: id }}),
      prisma.employee.delete({ where: { id } })
    ]);
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    if (err.code === 'P2003') {
      return NextResponse.json({ error: 'Cannot delete employee with payroll history. Set status to INACTIVE instead.' }, { status: 400 });
    }
    console.error('Delete employee error', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
