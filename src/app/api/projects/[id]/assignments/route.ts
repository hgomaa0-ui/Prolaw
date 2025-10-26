import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

export async function GET(req:NextRequest, { params }: { params: { id:string }}){
  const projectId = parseInt(params.id);
  if(Number.isNaN(projectId)) return NextResponse.json({error:'Invalid projectId'},{status:400});
  const assignments = await prisma.projectAssignment.findMany({
    where:{ projectId },
    select:{ id:true, user:{ select:{ id:true, name:true } } },
    orderBy:{ id:'asc' }
  });
  return NextResponse.json(assignments.map(a=>({id:a.id, user:a.user})));
}

export async function POST(req:NextRequest, { params }: { params: { id:string }}){
  const projectId = parseInt(params.id);
  if(Number.isNaN(projectId)) return NextResponse.json({error:'Invalid projectId'},{status:400});
  const session = await getServerSession(authOptions as any);
  if(!session) return NextResponse.json({error:'Unauthorized'},{status:401});
  const data = await req.json();
  const userId = parseInt(data.userId);
  if(Number.isNaN(userId)) return NextResponse.json({error:'Invalid userId'},{status:400});
  await prisma.projectAssignment.upsert({
    where:{ userId_projectId:{ userId, projectId } },
    create:{ userId, projectId },
    update:{}
  });
  return NextResponse.json({ ok:true });
}
