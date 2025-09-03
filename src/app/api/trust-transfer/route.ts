import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { postTransaction } from '@/lib/gl';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';

type Action = 'RETURN';

function getUserId(req: NextRequest){
  const auth=req.headers.get('authorization')||'';
  const tok=auth.startsWith('Bearer ')?auth.slice(7):null;
  if(!tok) return null;
  try{const p:any=jwt.verify(tok,JWT_SECRET);return Number(p.sub||p.id)||null;}catch{return null;}
}

// GET /api/trust-transfer?clientId=  List recent trust transfers (returns)
export async function GET(req: NextRequest){
  const userId = getUserId(req);
  if(!userId) return NextResponse.json({ error:'Unauthorized' },{ status:401 });
  const clientIdParam = req.nextUrl.searchParams.get('clientId');
  const where: Prisma.TrustTransactionWhereInput = { txnType:'DEBIT', description: { contains:'Refund' } };
  if(clientIdParam) where.trustAccount = { clientId: Number(clientIdParam) } as any;
  const txns = await prisma.trustTransaction.findMany({ where, include:{ trustAccount:{ select:{ client:{ select:{ name:true } }, project:{ select:{ name:true } } } } }, orderBy:{ id:'desc' }, take:100 });
  return NextResponse.json(txns);
}

// POST /api/trust-transfer { projectId?, clientId, amount, currency, action:'RETURN' }
export async function POST(req: NextRequest){
  const userId=getUserId(req);
  if(!userId) return NextResponse.json({ error:'Unauthorized' },{ status:401 });
  const { clientId, projectId, amount, currency, action='RETURN' }: { clientId:number, projectId?:number, amount:number, currency:string, action?:Action } = await req.json();
  if(!clientId||!amount||!currency) return NextResponse.json({ error:'clientId, amount, currency required' },{ status:400 });
  if(action!=='RETURN') return NextResponse.json({ error:'Unsupported action' },{ status:400 });

  const companyId = await prisma.client.findUnique({ where:{ id: clientId }, select:{ companyId:true } }).then(c=>c?.companyId);
  if(!companyId) return NextResponse.json({ error:'Client not found' },{ status:404 });
  const trustCash = await prisma.account.findFirst({ where:{ companyId, code:'1020' } });
  const trustLiab = await prisma.account.findFirst({ where:{ companyId, code:'2000' } });
  if(!trustCash||!trustLiab) return NextResponse.json({ error:'Trust accounts missing' },{ status:500 });

  // Ensure enough trust cash balance via trustAccount records
  const accounts = await prisma.trustAccount.findMany({ where:{ clientId, projectId: projectId ?? undefined, currency } });
  const bal=accounts.reduce((s,a)=> s + parseFloat(a.balance.toString()),0);
  if(bal < amount) return NextResponse.json({ error:'Insufficient trust balance' },{ status:400 });

  // adjust trust account balances proportionally
  let remaining = amount;
  const txns:any[]=[];
  for(const a of accounts){
    if(remaining<=0) break;
    const b=parseFloat(a.balance.toString());
    const deduct=Math.min(b, remaining);
    if(deduct>0){
      txns.push(
        prisma.trustTransaction.create({ data:{ trustAccountId:a.id, txnType:'DEBIT', amount:deduct, description:`Refund to client`, userId } }),
        prisma.trustAccount.update({ where:{ id:a.id }, data:{ balance:{ decrement:deduct } } })
      );
      remaining -= deduct;
    }
  }

  // GL posting: Debit Trust Liability, Credit Trust Cash (cash leaving trust)
  await postTransaction({ memo:`Refund trust funds to client #${clientId}`, createdBy:userId, lines:[
    { accountId: trustLiab.id, debit: amount, currency },
    { accountId: trustCash.id, credit: amount, currency }
  ]});

  await prisma.$transaction(txns);
  return NextResponse.json({ status:'ok', refunded: amount });
}
