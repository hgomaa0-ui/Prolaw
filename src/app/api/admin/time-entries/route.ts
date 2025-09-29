import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';

function getUser(req: NextRequest){
  const auth = req.headers.get('authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if(!token) return null;
  try{
    const payload = jwt.verify(token, JWT_SECRET) as any;
    return { id: Number(payload.sub ?? payload.id), role: payload.role };
  }catch{ return null; }
}

function canAdminLog(role: string|null){
  return role === 'ADMIN' || role === 'OWNER' || role === 'MANAGING_PARTNER' || role === 'HR_MANAGER' || role === 'LAWYER_MANAGER';
}

// GET /api/admin/time-entries?date=YYYY-MM-DD&userId=123&projectId=45
export async function GET(req: NextRequest){
  const user = getUser(req);
  if(!user) return NextResponse.json({error:'Unauthorized'},{status:401});
  if(!canAdminLog(user.role)) return NextResponse.json({error:'Forbidden'},{status:403});

  const url = new URL(req.url);
  const date = url.searchParams.get('date');
  const userId = url.searchParams.get('userId');
  const projectId = url.searchParams.get('projectId');

  const where:any = {};
  if(userId) where.userId = Number(userId);
  if(projectId) where.projectId = Number(projectId);
  if(date){
    const start = new Date(`${date}T00:00:00.000Z`);
    const end = new Date(start.getTime() + 24*3600000);
    where.startTs = { gte: start, lt: end };
  }

  const entries = await prisma.timeEntry.findMany({
    where,
    include: { user: { select:{ name:true } }, project: { select:{ name:true } } },
    orderBy: { startTs: 'desc' },
    take: 100,
  });
  return NextResponse.json(entries);
}

// POST /api/admin/time-entries
// Accepts EITHER:
//  - { userId, projectId, date: 'YYYY-MM-DD', hours: number, notes?, billable? }
//  - { userId, projectId, startTs: string, endTs: string, notes?, billable? }
export async function POST(req: NextRequest){
  const user = getUser(req);
  if(!user) return NextResponse.json({error:'Unauthorized'},{status:401});
  if(!canAdminLog(user.role)) return NextResponse.json({error:'Forbidden'},{status:403});

  const body = await req.json();
  const { userId, projectId, notes, billable = true } = body;
  if(!userId || !projectId){
    return NextResponse.json({error:'userId and projectId are required'},{status:400});
  }
  try{
    let start: Date;
    let end: Date;
    if (body.date && body.hours){
      start = new Date(`${body.date}T00:00`);
      if(isNaN(start.getTime())) return NextResponse.json({error:'Invalid date'}, {status:400});
      end = new Date(start.getTime() + Number(body.hours) * 3600000);
    } else if (body.startTs && body.endTs){
      start = new Date(body.startTs);
      end = new Date(body.endTs);
      if(isNaN(start.getTime()) || isNaN(end.getTime())) return NextResponse.json({error:'Invalid startTs/endTs'}, {status:400});
      if(end <= start) return NextResponse.json({error:'endTs must be after startTs'}, {status:400});
    } else {
      return NextResponse.json({error:'Provide either {date,hours} or {startTs,endTs} along with userId, projectId'}, {status:400});
    }

    const entry = await prisma.timeEntry.create({
      data: {
        userId: Number(userId),
        projectId: Number(projectId),
        startTs: start,
        endTs: end,
        durationMins: Math.round((end.getTime()-start.getTime())/60000),
        notes,
        billable,
      }
    });
    return NextResponse.json(entry, {status:201});
  }catch(err:any){
    console.error('admin time entry error', err);
    return NextResponse.json({error: 'Server error', details: err?.message}, {status:500});
  }
}
