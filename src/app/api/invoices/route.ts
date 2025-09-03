import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();

    if (!data.clientId)
      return NextResponse.json({ error: "Client ID is required" }, { status: 400 });

    const last = await prisma.invoice.findFirst({ orderBy: { id: "desc" } });
    const invoiceNumber = `INV-${((last?.id || 0) + 1).toString().padStart(5, "0")}`;

    // calculate totals
    const items: Array<{ description: string; quantity: number; unitPrice: number; lineTotal?: number }> = data.items || [];
    const subtotalVal = items.reduce((sum, it) => sum + (Number(it.quantity) * Number(it.unitPrice)), 0);
    const discountVal = Number(data.discount) || 0;
    const taxVal = Number(data.tax) || 0;
    const trustAmount = Number(data.trustAmount) || 0;
    const totalVal = subtotalVal - discountVal - trustAmount + taxVal;

    

    const dataToCreate: any = {
      clientId: data.clientId,
      invoiceNumber,
      issueDate: data.issueDate ? new Date(data.issueDate) : new Date(),
      dueDate: data.dueDate ? new Date(data.dueDate) : new Date(Date.now() + 30*24*60*60*1000),
      status: (data.status ? String(data.status).toUpperCase() : "DRAFT") as any,
      subtotal: subtotalVal.toString(),
      discount: discountVal.toString(),
      tax: taxVal.toString(),
      trustDeducted: trustAmount.toString(),
      total: totalVal.toString(),
      language: (data.language || 'EN') as any,
      currency: (data.currency || 'USD') as any,
      items: {
        create: items.map(it => ({
          description: it.description,
          quantity: Number(it.quantity),
          unitPrice: Number(it.unitPrice),
          lineTotal: Number(it.quantity) * Number(it.unitPrice),
          itemType: 'CUSTOM'
        }))
      }
    };
    if (data.projectId) dataToCreate.projectId = data.projectId;

    const invoice = await prisma.invoice.create({ data: dataToCreate, include: { items: true, client: true } });

    // if paying from trust
    if (trustAmount > 0) {
      // locate trust accounts: project-specific first then client-level
      const projectAccts = await prisma.trustAccount.findMany({ where: { clientId: invoice.clientId, projectId: invoice.projectId ?? undefined, currency: invoice.currency }, orderBy: { id: 'asc' } });
      const otherAccts = await prisma.trustAccount.findMany({ where: { clientId: invoice.clientId, currency: invoice.currency, NOT: { id: { in: projectAccts.map(p=>p.id) } } }, orderBy: { id: 'asc' } });
      const accounts = [...projectAccts, ...otherAccts];
      const totalBal = accounts.reduce((sum,a)=> sum + parseFloat(a.balance.toString()),0);
      if (totalBal < trustAmount) {
        return NextResponse.json({ error: 'Insufficient trust balance' }, { status: 400 });
      }
      const txns:any[]=[];
      let remaining=trustAmount;
      for(const a of accounts){
        if(remaining<=0) break;
        const bal=parseFloat(a.balance.toString());
        const deduction=Math.min(bal,remaining);
        if(deduction>0){
          txns.push(
            prisma.trustTransaction.create({ data:{ trustAccountId:a.id, txnType:'DEBIT', amount:deduction, description:`Payment for invoice ${invoice.invoiceNumber}`, invoiceId:invoice.id } }),
            prisma.trustAccount.update({ where:{ id:a.id }, data:{ balance:{ decrement: deduction } } })
          );
          remaining-=deduction;
        }
      }
      txns.push(
        prisma.payment.create({ data:{ invoiceId:invoice.id, amount:trustAmount, paidOn:new Date(), gateway:'TRUST', txnReference:`TRUST-${accounts[0].id}` } }),
        prisma.invoice.update({ where:{ id:invoice.id }, data:{ status: trustAmount>=Number(invoice.total)?'PAID':'SENT' } })
      );
      await prisma.$transaction(txns);
    }

    return NextResponse.json(invoice, { status: 201 });
  } catch (error: any) {
    console.error("Failed to create invoice:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create invoice" },
      { status: 500 }
    );
  }
}

function getAuthInfo(req: NextRequest){
  const auth=req.headers.get('authorization')||'';
  const tok=auth.startsWith('Bearer ')?auth.slice(7):null;
  if(!tok) return { userId:null, companyId:null };
  try{ const p= JSON.parse(Buffer.from(tok.split('.')[1],'base64').toString()); return { userId:Number(p.sub||p.id)||null, companyId: p.companyId? Number(p.companyId):null }; }catch{return { userId:null, companyId:null };}
}

function getUserId(req:NextRequest):number|null{
  return getAuthInfo(req).userId;
}

export async function GET(req: NextRequest) {
  try {
    // auth & permissions
    const { userId, companyId } = getAuthInfo(req);
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // fetch allowed scope for invoices page
    const up = await prisma.userPermission.findFirst({
      where:{ userId, permission:{ code:'invoices'}, allowed:true },
      select:{ clientIds:true, projectIds:true, lawyerIds:true }
    });
    const where:any = {};
    if (companyId) where.companyId = companyId;
    if (up){
      if (up.projectIds?.length) where.projectId = { in: up.projectIds };
      if (up.clientIds?.length){
        where.clientId = { in: up.clientIds };
      }
      // if lawyerIds present and you have a lawyerId column, adjust; assuming createdBy
      if (up.lawyerIds?.length){
        where.createdById = { in: up.lawyerIds } as any;
      }
    }
    const invoices = await prisma.invoice.findMany({ where, include: { client: true, project: { select: { name: true } }, bank: { select: { name: true } } } });
    return NextResponse.json(invoices);
  } catch (error: any) {
    console.error("Failed to fetch invoices:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch invoices" },
      { status: 500 }
    );
  }
}