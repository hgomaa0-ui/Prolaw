import { NextRequest, NextResponse } from 'next/server';
import { withCompany } from '@/lib/with-company';
import { prisma } from '@/lib/prisma';

/*
  POST /api/attendance/import
  Body: raw text CSV (EmployeeId,ClockIn,ClockOut) OR multipart file field "file"
*/
export const POST = withCompany(async (req: NextRequest, companyId?: number) => {
  const contentType=req.headers.get('content-type')||'';
  let csv='';
  if(contentType.startsWith('text/csv')){
    csv = await req.text();
  } else if (contentType.startsWith('multipart/form-data')){
    const form = await req.formData();
    const file = form.get('file') as File|null;
    if(!file) return NextResponse.json({error:'file missing'},{status:400});
    csv = await file.text();
  } else {
    csv = await req.text();
  }
  if(!csv.trim()) return NextResponse.json({error:'CSV empty'},{status:400});
  const lines = csv.split(/\r?\n/).filter(l=>l.trim());
  const header = lines[0].split(',').map(h=>h.trim().toLowerCase());
  const empIdx = header.findIndex(h=>h==='employeeid');
  const inIdx = header.findIndex(h=>h==='clockin');
  const outIdx = header.findIndex(h=>h==='clockout');
  if(empIdx<0||inIdx<0) return NextResponse.json({error:'header must include EmployeeId,ClockIn,ClockOut'},{status:400});

  const creates=[];
  for(let i=1;i<lines.length;i++){
    const cols=lines[i].split(',');
    const employeeId = Number(cols[empIdx]);
    if(!employeeId) continue;
    const clockIn = new Date(cols[inIdx]);
    const clockOutStr = cols[outIdx]||'';
    const clockOut = clockOutStr? new Date(clockOutStr): undefined;
    creates.push({ employeeId, clockIn, clockOut });
  }
  if(!creates.length) return NextResponse.json({error:'no valid rows'},{status:400});
  await prisma.attendance.createMany({ data: creates });
  return NextResponse.json({ ok:true, inserted: creates.length });
});
