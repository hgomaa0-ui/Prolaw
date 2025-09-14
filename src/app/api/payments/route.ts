import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { postTransaction } from '@/lib/gl';
import { convert } from '@/lib/forex';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';

function getAuth(req: NextRequest){
  const auth=req.headers.get('authorization')||'';
  const tok=auth.startsWith('Bearer ')?auth.slice(7):null;
  if(!tok) return { userId:null, role:null };
  try{const payload:any=jwt.verify(tok,JWT_SECRET);return { userId:Number(payload.sub||payload.id)||null, role:payload.role||null };}catch{return { userId:null, role:null }}
}

// GET /api/payments?all=1  List payments
export async function GET(req: NextRequest){
  const { userId } = getAuth(req);
  if(!userId) return NextResponse.json({ error:'Unauthorized' },{ status:401 });
  const all = req.nextUrl.searchParams.get('all')==='1';
  const payments = await prisma.payment.findMany({
    where: all? undefined : { createdById: userId } as Prisma.PaymentWhereInput,
    include:{ invoice:{ select:{ invoiceNumber:true } } }
  });
  return NextResponse.json(payments);
}

// POST /api/payments { invoiceId, amount?, source:"TRUST"|"OPERATING"|"BANK", bankId? }
export async function POST(req: NextRequest){
  const { userId, role } = getAuth(req);
  if(!userId) return NextResponse.json({error:'Unauthorized'},{status:401});
  const { invoiceId, amount, source='TRUST', bankId } = await req.json();
  if(!invoiceId) return NextResponse.json({error:'invoiceId required'},{status:400});
  const invoice=await prisma.invoice.findUnique({ where:{ id: invoiceId }, include:{ client:true, project:true } });
  if(!invoice) return NextResponse.json({error:'Invoice not found'},{status:404});
  const payAmt = Number(amount)|| Number(invoice.total) - await prisma.payment.aggregate({ _sum:{ amount:true }, where:{ invoiceId } }).then(r=>Number(r._sum.amount||0));
  if(payAmt<=0) return NextResponse.json({ error:'Nothing to pay' },{status:400});
  const companyId = invoice.companyId;

  if(source==='BANK'){
    if(!bankId) return NextResponse.json({ error:'bankId required for BANK source' },{status:400});
    const bank = await prisma.bankAccount.findUnique({ where:{ id: bankId } });
    if(!bank) return NextResponse.json({ error:'Bank not found' },{status:404});
    // currency conversion if needed
    const depositAmt = await convert(payAmt, invoice.currency, bank.currency);
    await prisma.$transaction([
      prisma.bankAccount.update({ where:{ id: bankId }, data:{ balance:{ increment: depositAmt } } }),
      prisma.bankTransaction.create({ data:{ bankId, amount: depositAmt, currency: bank.currency, memo:`Invoice ${invoice.invoiceNumber} payment` } }),
      prisma.incomeCashLedger.create({ data:{ companyId, bankId, projectId: invoice.projectId, source:'INVOICE_PAYMENT', amount: payAmt, currency: invoice.currency, notes:`Invoice ${invoice.invoiceNumber} payment` } })
    ]);

  }
  else if(source==='TRUST'){
    // reduce trust liability, cash, AR
  } else if (source==='OPERATING') {
    if(!bankId) return NextResponse.json({ error:'bankId required for OPERATING source' },{status:400});
    const bank = await prisma.bankAccount.findUnique({ where:{ id: bankId } });
    if(!bank) return NextResponse.json({ error:'Bank not found' },{status:404});
    const depositAmt = await convert(payAmt, invoice.currency, bank.currency);

  }
  await prisma.payment.create({ data:{ invoiceId, amount:payAmt, paidOn:new Date(), gateway:source } });
  const totalPaid = await prisma.payment.aggregate({ _sum:{ amount:true }, where:{ invoiceId } }).then(r=>Number(r._sum.amount||0));
  await prisma.invoice.update({ where:{ id:invoiceId }, data:{ status: totalPaid>=Number(invoice.total)?'PAID':'SENT' } });
  return NextResponse.json({ status:'ok', paid:payAmt });
}
