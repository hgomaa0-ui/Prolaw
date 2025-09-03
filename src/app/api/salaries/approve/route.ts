import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import jwt from 'jsonwebtoken';
import { convert } from '@/lib/forex';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';

function getAuth(req: NextRequest){
  const h=req.headers.get('authorization')||'';
  const t=h.startsWith('Bearer ')?h.slice(7):null;
  if(!t) return {userId:null,companyId:null};
  try{const d:any=jwt.verify(t,JWT_SECRET);return{userId:Number(d.sub??d.id),companyId:d.companyId?Number(d.companyId):null};}catch{return{userId:null,companyId:null};}
}

// POST /api/salaries/approve { runId (or batchId), bankId }
export async function POST(req:NextRequest){
  const {userId,companyId:tokenCompanyId}=getAuth(req);
  if(!userId) return NextResponse.json({error:'Unauthorized'},{status:401});
  const userRec = await prisma.user.findUnique({where:{id:userId},select:{companyId:true}});
  const companyId = userRec?.companyId ?? tokenCompanyId;
  if(!companyId) return NextResponse.json({error:'No company'},{status:400});
  const { runId, batchId, bankId } = await req.json();
  const id = batchId ?? runId;
  if(!id||!bankId) return NextResponse.json({error:'batchId and bankId required'},{status:400});

  const batch = await prisma.payrollBatch.findUnique({ where:{ id }, include:{ items:true } });
  if(!batch||batch.companyId!==companyId) return NextResponse.json({error:'Batch not found'},{status:404});
  if(batch.status==='ACC_APPROVED') return NextResponse.json({error:'Already approved'},{status:400});
  if(batch.status!=='HR_APPROVED') return NextResponse.json({error:'Batch not HR approved'},{status:400});

  const bank = await prisma.bankAccount.findUnique({ where:{ id: bankId } });
  if(!bank||bank.companyId!==companyId) return NextResponse.json({error:'Bank not found'},{status:404});

  // sum per currency
  const totals: Record<string, number> = {};
  batch.items.forEach(i=>{const cur='EGP'; totals[cur]=(totals[cur]||0)+Number(i.netSalary);});
  // convert to bank currency
  let totalBankCur = 0;
  for(const [cur,amt] of Object.entries(totals)){
    const conv = await convert(amt, cur, bank.currency);
    totalBankCur += conv;
  }

  if(Number(bank.balance) < totalBankCur) return NextResponse.json({error:'Insufficient funds'},{status:400});

  await prisma.$transaction([
    prisma.bankAccount.update({ where:{ id: bankId }, data:{ balance:{ decrement: totalBankCur } } }),
    prisma.bankTransaction.create({ data:{ bankId, amount:-totalBankCur, currency: bank.currency, memo:`Salary payment ${batch.year}-${batch.month}` } }),
    prisma.incomeCashLedger.create({ data:{ companyId, bankId, source:'OFFICE_EXPENSE', amount:-totalBankCur, currency: bank.currency, notes:`Salary payment ${batch.year}-${batch.month}` } }),
    prisma.payrollBatch.update({ where:{ id }, data:{ status:'ACC_APPROVED', accApprovedAt: new Date() } })
  ]);

  return NextResponse.json({ status:'ok', debited: totalBankCur, currency: bank.currency });
}
