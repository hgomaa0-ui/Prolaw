import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';

function getAuth(req: NextRequest){
  const hdr=req.headers.get('authorization')||'';
  const tok=hdr.startsWith('Bearer ')?hdr.slice(7):null;
  if(!tok) return {userId:null,companyId:null};
  try{ const d:any=jwt.verify(tok,JWT_SECRET);return{userId:Number(d.sub??d.id),companyId:d.companyId?Number(d.companyId):null};}catch{return{userId:null,companyId:null};}
}

// GET /api/salaries/pending -> list payroll runs processed but not approved
export async function GET(req:NextRequest){
  const {userId,companyId}=getAuth(req);
  if(!userId) return NextResponse.json({error:'Unauthorized'},{status:401});
  const batches = await prisma.payrollBatch.findMany({
    where:{ companyId, status:'HR_APPROVED' },
    include:{ items:true },
    orderBy:[{year:'desc'},{month:'desc'}]
  });
  const result=batches.map(b=>({
    id:b.id,
    period:`${b.month}/${b.year}`,
    total:b.items.reduce((s,i)=>s+Number(i.netSalary),0),
    payslipCount:b.items.length,
    processedAt:b.hrApprovedAt,
  }));
  return NextResponse.json(result);
}
