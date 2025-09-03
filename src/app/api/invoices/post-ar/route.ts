import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { postTransaction } from '@/lib/gl';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';

function getUser(req: NextRequest){
  const auth=req.headers.get('authorization')||'';
  const tok=auth.startsWith('Bearer ')?auth.slice(7):null;
  if(!tok) return null;
  try{const p:any=jwt.verify(tok,JWT_SECRET);return { id:Number(p.sub||p.id), role:p.role };}catch{return null;}
}

// PUT /api/invoices/post-ar?id=123  { status?:'SENT'|'PAID' }
export async function PUT(req: NextRequest){
  const user=getUser(req);
  if(!user) return NextResponse.json({ error:'Unauthorized' },{ status:401 });
  if(!['ADMIN','OWNER','ACCOUNTANT_MASTER','ACCOUNTANT_ASSISTANT'].includes((user.role||'').toUpperCase()))
    return NextResponse.json({ error:'Forbidden' },{ status:403 });
  const idStr=req.nextUrl.searchParams.get('id');
  if(!idStr) return NextResponse.json({ error:'id param required'},{ status:400 });
  const id=Number(idStr);
  const body=await req.json().catch(()=>({}));
  const targetStatus = body.status as 'SENT'|'PAID'|undefined;
  const invoice = await prisma.invoice.findUnique({ where:{ id }, include:{ project:true } });
  if(!invoice) return NextResponse.json({ error:'Invoice not found' },{ status:404 });
  if(invoice.arPosted){
    // optionally update status
    if(targetStatus && invoice.status!==targetStatus){ await prisma.invoice.update({ where:{ id }, data:{ status: targetStatus } }); }
    return NextResponse.json({ status:'already-posted' });
  }
  const companyId = invoice.companyId;
  const wipAcct = await prisma.account.findFirst({ where:{ companyId, code:'1110' } });
  const arAcct = await prisma.account.findFirst({ where:{ companyId, code:'1100' } });
  if(!wipAcct||!arAcct) return NextResponse.json({ error:'Accounts missing' },{ status:500 });
  const amount = Number(invoice.total);
  await postTransaction({ memo:`Invoice ${invoice.invoiceNumber} AR`, createdBy:user.id, lines:[ { accountId: arAcct.id, debit: amount, currency: invoice.currency }, { accountId: wipAcct.id, credit: amount, currency: invoice.currency } ] });
  const newStatus = targetStatus || (invoice.status==='DRAFT'?'SENT':invoice.status);
  await prisma.invoice.update({ where:{ id }, data:{ arPosted:true, status: newStatus } });
  return NextResponse.json({ posted:true, status:newStatus });
}
