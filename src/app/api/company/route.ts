import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { mkdir, writeFile } from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';
function getUser(req: NextRequest){
  const auth = req.headers.get('authorization')||'';
  const token = auth.startsWith('Bearer ')?auth.slice(7):null;
  if(!token) return null;
  try{ return jwt.verify(token, JWT_SECRET) as any; }catch{return null;}
}

export async function GET(req: NextRequest){
  const user=getUser(req);
  let company;
  if(user?.companyId){
    company = await prisma.company.findUnique({where:{id:Number(user.companyId)}});
  }
  if(!company){
    company = await prisma.company.findFirst();
  }
  if(!company) return NextResponse.json({ error:'No company record' },{status:404});
  return NextResponse.json(company);
}

// PUT multipart/form-data or JSON
export async function PUT(req:NextRequest){
  let data: any = {};
  let logoUrl: string|undefined;
  const contentType=req.headers.get('content-type')||'';
  if(contentType.startsWith('multipart/form-data')){
    const form=await req.formData();
    data.name = (form.get('name') as string) || undefined;
    data.address = (form.get('address') as string) || undefined;
    data.phone = (form.get('phone') as string) || undefined;
    const file = form.get('logo');
    if(file && file instanceof File && file.size>0){
      const ext = path.extname(file.name) || '.dat';
      await mkdir(path.join(process.cwd(),'public','uploads','logos'),{recursive:true});
      const filename = crypto.randomBytes(8).toString('hex')+ext;
      const arrayBuffer = await file.arrayBuffer();
      await writeFile(path.join(process.cwd(),'public','uploads','logos',filename),Buffer.from(arrayBuffer));
      logoUrl = `/uploads/logos/${filename}`;
    }
  }else if(contentType.startsWith('application/json')){
    data = await req.json();
  }
  const user=getUser(req);
  let company: any=null;
  if(user?.companyId){
    company = await prisma.company.findUnique({where:{id:Number(user.companyId)}});
  }
  if(!company){
    company = await prisma.company.findFirst();
  }
  if(!company){
    company = await prisma.company.create({ data:{ ...data, ...(logoUrl?{logoUrl}:{}) } });
    // link user to this company if not linked
    if(user?.id){ await prisma.user.update({ where:{id:Number(user.id)}, data:{ companyId: company.id } }); }
    return NextResponse.json(company);
  }
  const updateData:any = { ...data, ...(logoUrl?{logoUrl}:{}) };
  if(updateData.name && updateData.name===company.name){ delete updateData.name; }
  try{
    const updated = await prisma.company.update({ where:{ id:company.id }, data:updateData });
    return NextResponse.json(updated);
  }catch(err:any){
    if(err.code==='P2002' && err.meta?.target?.includes('name')){
      delete updateData.name;
      const updated = await prisma.company.update({ where:{ id:company.id }, data:updateData });
      return NextResponse.json(updated);
    }
    console.error('company update',err);
    return NextResponse.json({error:'Update failed'}, {status:500});
  }
}
