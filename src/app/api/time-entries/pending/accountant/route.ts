import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { postTransaction } from '@/lib/gl';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';

function getUser(req: NextRequest) {
  const auth = req.headers.get('authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) return null;
  try {
    const d = jwt.verify(token, JWT_SECRET) as any;
    return d ? { id: Number(d.sub ?? d.id), role: (d.role as string | undefined)?.toUpperCase?.(), companyId: d.companyId ? Number(d.companyId) : null } : null;
  } catch {
    // fallback decode without verify (dev/local tokens)
    try {
      const d = jwt.decode(token) as any;
      if (!d) return null;
      return { id: Number(d.sub ?? d.id), role: (d.role as string | undefined)?.toUpperCase?.(), companyId: d.companyId ? Number(d.companyId) : null };
    } catch {
      return null;
    }
  }
}

// GET /api/time-entries/pending/accountant
export async function GET(req: NextRequest) {
  const user = getUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  // TEMP disable role gate for debugging
  // // if (!(user.role === 'ADMIN' || (user.role && user.role.includes('ACCOUNTANT'))))
    // return NextResponse.json({ error: 'Forbidden', role: user.role }, { status: 403 });
  try {
    const baseWhere: any = { managerApproved: true, accountantApproved: false };
    if (user.companyId) baseWhere.project = { companyId: user.companyId };
    const list = await prisma.timeEntry.findMany({
      where: baseWhere,
      include: {
        project: { select: { name: true, client: { select: { name: true } } } },
        user: { select: { name: true } },
      },
      orderBy: { startTs: 'asc' },
    });
    return NextResponse.json(list);
  } catch (e) {
    console.error('GET accountant pending time', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// PUT /api/time-entries/pending/accountant?id={id}
export async function PUT(req: NextRequest) {
  const user = getUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  // TEMP disable role gate for debugging
  // // if (!(user.role === 'ADMIN' || (user.role && user.role.includes('ACCOUNTANT'))))
    // return NextResponse.json({ error: 'Forbidden', role: user.role }, { status: 403 });
  const idParam = req.nextUrl.searchParams.get('id');
  const body = await req.json().catch(() => ({} as any));
  const selCurrency = (body?.currency as string | undefined)?.toUpperCase?.();
  const createInvoice = body?.createInvoice !== false; // default true
  if (!idParam) return NextResponse.json({ error: 'Missing id' }, { status: 400 });
  const id = Number(idParam);
  if (isNaN(id)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
  let createdInvoiceNumber: string | null = null;
  try {
    // approve entry
    const approved = await prisma.timeEntry.update({
      where: { id },
      data: {
            
        accountantApproved: true,
        accountantId: user.id,
      },
      include: {
        project: { select: { id: true, clientId: true, companyId: true, name: true, rateSource: true, hourlyRate: true, billingCurrency: true, client: { select: { name: true } } } },
        user: { select: { id: true, name: true, positionId: true } },
      },
    });

    // --- Automatic invoice creation / update (optional) ---
    let invoiceCreatedFlag = false;
    if (createInvoice) try {
      // fetch or create draft invoice for the project
      let invoice = await prisma.invoice.findFirst({
        where: {
          projectId: approved.project?.id,
          status: "DRAFT",
          ...(user.companyId ? { companyId: user.companyId } : {}),
        },
      });
      if (!invoice) {
        const { generateInvoiceNumber } = await import("@/lib/invoice");
        const number = await generateInvoiceNumber();
        invoice = await prisma.invoice.create({
          data: {
            
            ...(user.companyId ? { companyId: user.companyId } : {}),
            projectId: approved.project?.id || null,
            clientId: approved.project?.clientId,
            invoiceNumber: number,
            issueDate: new Date(),
            dueDate: new Date(Date.now() + 14 * 24 * 3600 * 1000),
            status: "DRAFT",
            subtotal: 0,
            total: 0,
            language: "EN",
            currency: (selCurrency || (approved.project as any)?.advanceCurrency || 'USD') as any,
          },
        });
      }

      // set response vars
      createdInvoiceNumber = invoice.invoiceNumber;

      // helper to convert Prisma Decimal to JS number
      const toNum = (d: any): number => d ? parseFloat(d.toString()) : 0;

      // determine rate hierarchy: project fixed rate -> assignment -> lawyer default/position
      let rate = 0;
      let rateCurrency: string = 'USD';
      if (approved.project && approved.project.rateSource === 'PROJECT' && approved.project.hourlyRate) {
        rate = toNum(approved.project.hourlyRate);
        rateCurrency = approved.project.billingCurrency || 'USD';
      } else {
        const assignment = await prisma.projectAssignment.findFirst({
          where: { projectId: approved.project?.id, userId: approved.user?.id },
        });
        if (assignment?.hourlyRate) {
          rate = toNum(assignment.hourlyRate);
          rateCurrency = assignment.currency || 'USD';
        } else if (approved.user?.positionId) {
          const pos = await prisma.position.findUnique({ where: { id: approved.user.positionId } });
          rate = pos?.defaultRate ? toNum(pos.defaultRate) : 0;
        }
      }

      // ensure duration present
      let quantity = approved.durationMins ? approved.durationMins / 60 : 0;
      if (quantity === 0 && approved.startTs && approved.endTs) {
        quantity = ( (approved.endTs as any as Date).getTime() - (approved.startTs as any as Date).getTime() ) / 3600000;
      }
      // convert rate if needed
      let unitPrice = rate;
      if (selCurrency && invoice.currency !== selCurrency) {
        invoice = await prisma.invoice.update({ where: { id: invoice.id }, data: {
          currency: selCurrency as any } });
      }
      if (rateCurrency !== invoice.currency) {
        const { convert } = await import('@/lib/forex');
        unitPrice = await convert(rate, rateCurrency, invoice.currency);
        // basic fallback if conversion service fails (returns same value)
        if (unitPrice === rate) {
          const fallbackRates: Record<string, number> = {
            'USD_EGP': 30,
            'EGP_USD': 1/30,
          };
          const key = `${rateCurrency}_${invoice.currency}`;
          if (fallbackRates[key]) unitPrice = rate * fallbackRates[key];
        }
      }
      const lineTotal = quantity * unitPrice;

      // avoid duplicate line for same time entry
      const existingLine = await prisma.invoiceItem.findFirst({
        where: {
          invoiceId: invoice.id,
          refId: approved.id,
          itemType: 'TIME',
        },
      });
      if (!existingLine) {
        await prisma.invoiceItem.create({
          data: {
            
            invoiceId: invoice.id,
            itemType: 'TIME',
            refId: approved.id,
            description: approved.notes || `Time entry #${approved.id}`,
            quantity,
            unitPrice,
            lineTotal,
          },
        });
      }

      // recalc totals
      const sums = await prisma.invoiceItem.aggregate({
        where: { invoiceId: invoice.id },
        _sum: { lineTotal: true },
      });
      const subtotal = Number(sums._sum.lineTotal) || 0;
      const tax = invoice.tax ? Number(invoice.tax) : 0;
      const discount = invoice.discount ? Number(invoice.discount) : 0;
      const total = subtotal - discount + tax;
      await prisma.invoice.update({ where: { id: invoice.id }, data: {
             subtotal, total } });

      // --- Post WIP transaction ---
      try {
        const companyId = approved.project?.companyId;
        if (companyId) {
          const wipAcct = await prisma.account.findFirst({ where: { companyId, code: '1110' } });
          const incomeAcct = await prisma.account.findFirst({ where: { companyId, code: '4000' } });
          if (wipAcct && incomeAcct) {
            await postTransaction({
              memo: `WIP for time entry #${approved.id}`,
              createdBy: user.id,
              lines: [
                { accountId: wipAcct.id, debit: lineTotal, currency: invoice.currency },
                { accountId: incomeAcct.id, credit: lineTotal, currency: invoice.currency },
              ],
            });
          }
        }
      } catch (glErr) {
        console.error('WIP GL posting error', glErr);
      }
      invoiceCreatedFlag = true;
    } catch (invErr) {
      console.error("auto invoice error", invErr);
    }

    return NextResponse.json({ ...approved, invoiceNumber: createdInvoiceNumber, invoiceCreated: invoiceCreatedFlag });
  } catch (e) {
    console.error('PUT accountant approve time', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
