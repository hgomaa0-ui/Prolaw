import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';

type Decoded = { id:number; role:string };
function decode(req: NextRequest): Decoded | null {
  const auth = req.headers.get('authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) return null;
  try {
    return jwt.verify(token, JWT_SECRET) as any;
  } catch {
    return null;
  }
}
function isHR(role:string|null){return role==='ADMIN'||role==='HR_MANAGER'}

export async function GET(req: NextRequest){
  const user=decode(req);
  if(!user) return NextResponse.json({error:'Unauthorized'},{status:401});
  if(!isHR(user.role)) return NextResponse.json({error:'Forbidden'},{status:403});

  const {searchParams}=new URL(req.url);
  const from=searchParams.get('from');
  const to=searchParams.get('to');
  const wh:any={};
  if(from||to){wh.clockIn={}; if(from) wh.clockIn.gte=new Date(from); if(to) wh.clockIn.lte=new Date(to);}  

  const records=await prisma.attendance.findMany({where:wh,include:{employee:{select:{name:true}}}});

  // aggregate
  const agg:Record<number,{name:string,totalHours:number,lates:number}>={};
  for(const r of records){
    const id=r.employeeId;
    if(!agg[id]) agg[id]={name:r.employee.name,totalHours:0,lates:0};
    if(r.clockOut){
      const hrs=(r.clockOut.getTime()-r.clockIn.getTime())/36e5;
      agg[id].totalHours+=hrs;
    }
    // lateness after 9:15 AM
    const lateThreshold=new Date(r.clockIn);
    lateThreshold.setHours(9,15,0,0);
    if(r.clockIn>lateThreshold) agg[id].lates+=1;
  }
  const result=Object.entries(agg).map(([id,v])=>({...v,employeeId:Number(id),totalHours:Number(v.totalHours.toFixed(2))}));
  return NextResponse.json(result);
}
