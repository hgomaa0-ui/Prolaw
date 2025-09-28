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

// POST /api/admin/time-entries  { userId, projectId, date: 'YYYY-MM-DD', hours: number, notes? }
export async function POST(req: NextRequest){
  const user = getUser(req);
  if(!user) return NextResponse.json({error:'Unauthorized'},{status:401});
  if(!canAdminLog(user.role)) return NextResponse.json({error:'Forbidden'},{status:403});

  const { userId, projectId, date, hours, notes, billable = true } = await req.json();
  if(!userId || !projectId || !date || !hours) return NextResponse.json({error:'userId, projectId, date, hours required'},{status:400});
  try{
    const start = new Date(`${date}T00:00`);
    if(isNaN(start.getTime())) return NextResponse.json({error:'Invalid date'}, {status:400});
    const end = new Date(start.getTime() + Number(hours) * 3600000);

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
