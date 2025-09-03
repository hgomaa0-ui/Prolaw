import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import jwt from 'jsonwebtoken';
import { PDFDocument, StandardFonts } from 'pdf-lib';

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

function canView(role: string) {
  return ['ADMIN', 'ACCOUNTANT_MASTER', 'ACCOUNTANT_ASSISTANT'].includes(role);
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const user = decode(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const payslipId = Number(params.id);
  const payslip = await prisma.payslip.findUnique({
    where: { id: payslipId },
    include: {
      employee: {
        include: {
          user: { select: { name: true, email: true } },
        },
      },
      payrollRun: true,
    },
  });
  if (!payslip) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (payslip.employee.userId !== user.id && !canView(user.role))
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const format = searchParams.get('format');
  if (format === 'pdf') {
    const pdf = await createPdf(payslip);
    // optional email notification
    if (searchParams.get('notify') === '1' && payslip.employee.user?.email) {
      try {
        const { sendMail } = await import('@/lib/email');
        await sendMail(
          payslip.employee.user.email,
          `Payslip ${payslip.payrollRun.month}/${payslip.payrollRun.year}`,
          `<p>Dear ${payslip.employee.user.name},</p><p>Your payslip for ${payslip.payrollRun.month}/${payslip.payrollRun.year} is attached.</p>`
        );
      } catch (e) {
        console.error('Failed to send payslip email', e);
      }
    }
    return new NextResponse(pdf, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="payslip-${payslip.payrollRun.month}-${payslip.payrollRun.year}.pdf"`,
      },
    });
  }
  return NextResponse.json(payslip);
}

async function createPdf(p: any) {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const page = doc.addPage();
  const { width, height } = page.getSize();
  const left = 50;
  let y = height - 50;
  const draw = (text: string, size = 12) => {
    page.drawText(text, { x: left, y, size, font });
    y -= size + 6;
  };
  draw(`Payslip`, 18);
  draw(`Employee: ${p.employee.name}`);
  draw(`Month/Year: ${p.payrollRun.month}/${p.payrollRun.year}`);
  draw(`Base Salary: ${p.baseSalary}`);
  draw(`Overtime: ${p.overtimePay}`);
  draw(`Deductions: ${p.deductions}`);
  draw(`Net Pay: ${p.netPay}`, 14);
  draw(`Generated: ${new Date().toLocaleString()}`);
  const pdfBytes = await doc.save();
  return Buffer.from(pdfBytes);
}
