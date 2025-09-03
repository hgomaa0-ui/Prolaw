import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import jwt from 'jsonwebtoken';
import { Decimal } from '@prisma/client/runtime/library';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';

function decode(req: NextRequest): { id: number; role: string } | null {
  const auth = req.headers.get('authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) return null;
  try {
    return jwt.verify(token, JWT_SECRET) as any;
  } catch {
    return null;
  }
}

function isAdmin(role: string) {
  return role === 'ADMIN' || role === 'ACCOUNTANT_MASTER';
}

// GET /api/payroll/runs?year=&month=
export async function GET(req: NextRequest) {
  const user = decode(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const year = Number(searchParams.get('year')) || undefined;
  const month = Number(searchParams.get('month')) || undefined;
  const runs = await prisma.payrollRun.findMany({
    where: {
      year,
      month,
    },
    include: {
      payslips: { select: { id: true, employee: { select: { name: true } }, netPay: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
  return NextResponse.json(runs);
}

// POST /api/payroll/runs  body { year, month }
export async function POST(req: NextRequest) {
  const user = decode(req);
  if (!user || !isAdmin(user.role))
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { year, month } = await req.json();
  if (!year || !month) return NextResponse.json({ error: 'year and month required' }, { status: 400 });

  // check if already exists
  const existing = await prisma.payrollRun.findFirst({ where: { year, month } });
  if (existing) return NextResponse.json({ error: 'Payroll already processed' }, { status: 400 });

  const employees = await prisma.employee.findMany({
    where: { status: 'ACTIVE' },
    include: {
      salaries: {
        orderBy: { effectiveFrom: 'desc' },
        take: 1,
      },
    },
  });

  const payslipsData: any[] = [];
  // accumulate totals for GL
  let totalGross = new Decimal(0);
  let totalTax = new Decimal(0);
  let totalInsurance = new Decimal(0);
  let totalMedical = new Decimal(0);
  let totalNet = new Decimal(0);

  const firstDay = new Date(year, month - 1, 1);
  const lastDay = new Date(year, month, 0);
  const totalDays = lastDay.getDate();

  for (const emp of employees) {
    const baseSalary = emp.salaries[0]?.amount || new Decimal(0);

    // count attendance days
    const attendance = await prisma.attendance.findMany({
      where: {
        employeeId: emp.id,
        clockIn: { gte: firstDay, lte: lastDay },
      },
      distinct: ['clockIn'],
    });
    const presentDays = new Set(attendance.map((a) => a.clockIn.toDateString())).size;

    const absentDays = totalDays - presentDays;
    const dailyRate = baseSalary.div(totalDays);
    const absenceDeduction = dailyRate.mul(absentDays);

    // simple fixed percentage deductions (could be stored per employee later)
    const TAX_RATE = 0.1; // 10%
    const INSURANCE_RATE = 0.07; // 7%
    const MEDICAL_RATE = 0.02; // 2%

    const tax = baseSalary.mul(TAX_RATE);
    const insurance = baseSalary.mul(INSURANCE_RATE);
    const medical = baseSalary.mul(MEDICAL_RATE);

    const totalDeductions = absenceDeduction.add(tax).add(insurance).add(medical);
    const netPay = baseSalary.sub(totalDeductions);

    totalGross = totalGross.add(baseSalary);
    totalTax = totalTax.add(tax);
    totalInsurance = totalInsurance.add(insurance);
    totalMedical = totalMedical.add(medical);
    totalNet = totalNet.add(netPay);

    payslipsData.push({
      employeeId: emp.id,
      baseSalary,
      overtimePay: new Decimal(0),
      deductions: totalDeductions,
      netPay,
    });
  }

  const run = await prisma.payrollRun.create({
    data: {
      year,
      month,
      createdBy: user.id,
      payslips: {
        createMany: { data: payslipsData },
      },
    },
    include: { payslips: true },
  });

  // notify employees
  for (const slip of run.payslips) {
    await prisma.notification.create({
      data: {
        userId: (await prisma.employee.findUnique({ where: { id: slip.employeeId } })).userId!,
        type: 'Payslip',
        message: `Payslip for ${month}/${year} is ready. Net Pay: ${slip.netPay.toFixed(2)}`,
      },
    });
  }

    // -----------------------------------------------------------------------
  // Post aggregated payroll transaction to GL
  // -----------------------------------------------------------------------
  try {
    const salaryExp = await prisma.account.findFirst({ where: { code: 'SALARY_EXPENSE' } });
    const cashAcct = await prisma.account.findFirst({ where: { code: 'CASH' } });
    const taxAcct = await prisma.account.findFirst({ where: { code: 'TAX_PAYABLE' } });
    const insAcct = await prisma.account.findFirst({ where: { code: 'INSURANCE_PAYABLE' } });
    const medAcct = await prisma.account.findFirst({ where: { code: 'MEDICAL_PAYABLE' } });

    if (salaryExp && cashAcct) {
      const lines: any[] = [
        { accountId: salaryExp.id, debit: Number(totalGross), currency: 'USD' },
        { accountId: cashAcct.id, credit: Number(totalNet), currency: 'USD' },
      ];
      if (taxAcct) lines.push({ accountId: taxAcct.id, credit: Number(totalTax), currency: 'USD' });
      if (insAcct) lines.push({ accountId: insAcct.id, credit: Number(totalInsurance), currency: 'USD' });
      if (medAcct) lines.push({ accountId: medAcct.id, credit: Number(totalMedical), currency: 'USD' });
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { postTransaction } = require('@/lib/gl');
      await postTransaction({
        memo: `Payroll run ${month}/${year}`,
        createdBy: user.id,
        lines,
      });
    }
  } catch (glErr) {
    console.error('GL posting failed for payroll run', glErr);
  }

  return NextResponse.json(run, { status: 201 });
}
