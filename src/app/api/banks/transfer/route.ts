import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { withCompany } from '@/lib/with-company';

/*
  POST /api/banks/transfer
  Body: { fromBankId:number, toBankId:number, amount:number, currency:string, rate?:number, notes?:string }
  - amount: value in source currency
  - if currencies differ, provide rate (1 sourceCurrency = rate targetCurrency)
*/
export const POST = withCompany(async (req:NextRequest, companyId?:number)=>{
  if(!companyId) return NextResponse.json({error:'No company'}, {status:400});
  try{
    const { fromBankId, toBankId, amount, currency, rate, notes } = await req.json();
    if(!fromBankId || !toBankId || !amount || !currency) {
      return NextResponse.json({error:'Missing fields'},{status:400});
    }
    if(fromBankId===toBankId) return NextResponse.json({error:'Same bank'}, {status:400});

    const [fromBank,toBank] = await prisma.bankAccount.findMany({where:{id:{in:[fromBankId,toBankId]}}});
    if(!fromBank || !toBank) return NextResponse.json({error:'Bank not found'},{status:404});

    // compute target amount
    let targetAmount = amount;
    if(fromBank.currency!==toBank.currency){
      if(!rate || rate<=0) return NextResponse.json({error:'Rate required'}, {status:400});
      targetAmount = +(amount * rate).toFixed(2);
    }

    await prisma.$transaction([
      // withdraw from source bank
      prisma.bankAccount.update({where:{id:fromBankId}, data:{ balance: { decrement: amount } }}),
      prisma.bankTransaction.create({data:{ bankId: fromBankId, amount, currency: fromBank.currency, memo: notes || `Transfer to ${toBank.name}` }}),
      // deposit to target bank
      prisma.bankAccount.update({where:{id:toBankId}, data:{ balance: { increment: targetAmount } }}),
      prisma.bankTransaction.create({data:{ bankId: toBankId, amount: targetAmount, currency: toBank.currency, memo: notes || `Transfer from ${fromBank.name}` }}),
    ]);

    return NextResponse.json({ ok:true });
  }catch(e:any){
    console.error('bank transfer error',e);
    return NextResponse.json({error:'Server error'},{status:500});
  }
});
