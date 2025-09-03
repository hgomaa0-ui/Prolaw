import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';

type Decoded = { id:number };
function decode(req:NextRequest):Decoded|null{
  const auth=req.headers.get('authorization')||'';
  const token=auth.startsWith('Bearer ')?auth.slice(7):null;
  if(!token) return null;
  try{return jwt.verify(token,JWT_SECRET) as any;}catch{return null;}
}

// GET /api/notifications?unread=true
export async function GET(req:NextRequest){
  const user=decode(req);
  if(!user) return NextResponse.json({error:'Unauthorized'},{status:401});
  const unreadParam=new URL(req.url).searchParams.get('unread');
  const where:any={userId:user.id};
  if(unreadParam==='true') where.read=false;
  const list=await prisma.notification.findMany({where,orderBy:{createdAt:'desc'}});
  return NextResponse.json(list);
}

// PUT /api/notifications   body {id:number, read:boolean}
export async function PUT(req:NextRequest){
  const user=decode(req);
  if(!user) return NextResponse.json({error:'Unauthorized'},{status:401});
  const {id,read}=await req.json();
  if(typeof id!=="number") return NextResponse.json({error:'id required'},{status:400});
  const updated=await prisma.notification.updateMany({where:{id, userId:user.id},data:{read:read??true}});
  return NextResponse.json({updated});
}
